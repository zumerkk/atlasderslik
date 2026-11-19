import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
  ConflictException, ServiceUnavailableException, OnModuleInit, Logger, Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { isIP } from 'net';
import { UserRole } from '@repo/shared';
import { Order, OrderDocument, OrderStatus, FulfillmentStatus } from '../packages/schemas/order.schema';
import { Package, PackageDocument } from '../packages/schemas/package.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Grade, GradeDocument } from '../education/schemas/grade.schema';
import { StudentEnrollment, StudentEnrollmentDocument } from '../education/schemas/student-enrollment.schema';
import { ActivePackageQueryDto, AdminOrdersQueryDto, InitializePaymentDto, UserOrdersQueryDto } from './payment.dto';
import { merchantInfo } from '../common/merchant-info';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import { IyzicoWebhookReceipt, verifyIyzicoWebhook } from './iyzico-webhook';

export interface CartCheckoutContext {
  cartId: string;
  revision: number;
  leaseId: string;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Iyzipay = require('iyzipay');

export function normalizeSignaturePrice(value: unknown): string {
  const text = String(value ?? '');
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}

export function paymentSignature(secret: string, values: unknown[]): string {
  return createHmac('sha256', secret).update(values.map((v) => String(v ?? '')).join(':')).digest('hex');
}

function moneyCents(value: unknown): number | null {
  const text = normalizeSignaturePrice(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function validIdentityNumber(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  const d = value.split('').map(Number);
  return ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7]) + 100) % 10 === d[9]
    && d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

export function packageAccessEnd(start: Date, period: string): Date | undefined {
  if (period === 'one-time') return undefined;
  if (!['monthly', 'yearly'].includes(period)) throw new BadRequestException('Paket dönemi geçersiz.');
  const result = new Date(start);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + (period === 'monthly' ? 1 : 12));
  result.setUTCDate(Math.min(day, new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()));
  return result;
}

function identifier(value: any): string {
  return String(value?._id || value || '');
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function escapedSearch(value: string): RegExp {
  const special = '\\^$.*+?()[]{}|';
  return new RegExp([...value].map((character) => special.includes(character) ? `\\${character}` : character).join(''), 'i');
}

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);
  private iyzipay: any;
  private indexesReady = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Package.name) private readonly packageModel: Model<PackageDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Grade.name) private readonly gradeModel: Model<GradeDocument>,
    @InjectModel(StudentEnrollment.name) private readonly enrollmentModel: Model<StudentEnrollmentDocument>,
    @Optional() @InjectModel(Cart.name) private readonly cartModel?: Model<CartDocument>,
  ) {
    const apiKey = this.config('IYZICO_API_KEY');
    const secretKey = this.config('IYZICO_SECRET_KEY');
    const uri = this.config('IYZICO_BASE_URL').replace(/\/$/, '');
    if (apiKey && secretKey && this.providerMode() !== 'unconfigured') {
      this.iyzipay = new Iyzipay({ apiKey, secretKey, uri });
    }
  }

  async onModuleInit() {
    // Production disables mongoose autoIndex; payment correctness still needs these indexes.
    try {
      for (const field of ['pendingCheckoutKey', 'iyzicoToken']) {
        await this.orderModel.collection.createIndex({ [field]: 1 }, {
          unique: true, partialFilterExpression: { [field]: { $type: 'string' } },
        });
      }
      await this.orderModel.collection.createIndex({ paymentEnvironment: 1, iyzicoPaymentId: 1 }, {
        unique: true, partialFilterExpression: { paymentEnvironment: { $type: 'string' }, iyzicoPaymentId: { $type: 'string' } },
      });
      // The provider can reuse numeric IDs across live and sandbox environments.
      // Install the stronger compound constraint before retiring the legacy one.
      const oldIndexes = await this.orderModel.collection.indexes();
      const legacy = oldIndexes.find((index) => index.name === 'iyzicoPaymentId_1' && index.unique && Object.keys(index.key).length === 1);
      if (legacy?.name) await this.orderModel.collection.dropIndex(legacy.name);
      await this.enrollmentModel.collection.createIndex({ studentId: 1, gradeId: 1 }, { unique: true });
      this.indexesReady = true;
    } catch {
      this.logger.error('Ödeme tekillik indeksleri hazırlanamadı. Ödeme başlatma kapalı.');
    }
  }

  private config(name: string) { return String(this.configService.get<string>(name) || '').trim(); }

  private checkoutEnabled() {
    return this.configService.get<string>('NODE_ENV') !== 'production'
      || this.configService.get<string>('PAYMENT_CHECKOUT_ENABLED') === 'true';
  }

  private providerMode(): 'sandbox' | 'live' | 'unconfigured' {
    const url = this.config('IYZICO_BASE_URL').replace(/\/$/, '');
    if (url === 'https://sandbox-api.iyzipay.com') return 'sandbox';
    if (url === 'https://api.iyzipay.com') return 'live';
    return 'unconfigured';
  }

  private publicUrl(value: string, allowLocal: boolean): URL | null {
    try {
      const url = new URL(value);
      if (url.username || url.password || url.search || url.hash) return null;
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.protocol !== 'https:' && !(allowLocal && local && url.protocol === 'http:')) return null;
      if (!allowLocal && (local || isIP(url.hostname) !== 0 || !url.hostname.includes('.'))) return null;
      return url;
    } catch { return null; }
  }

  getReadiness() {
    const mode = this.providerMode();
    const callback = this.publicUrl(this.config('PAYMENT_CALLBACK_URL'), false);
    const frontend = this.publicUrl(this.config('FRONTEND_URL'), mode === 'sandbox');
    const checks = {
      apiKey: !!this.config('IYZICO_API_KEY'), secretKey: !!this.config('IYZICO_SECRET_KEY'),
      endpoint: mode !== 'unconfigured',
      credentialMode: mode === 'sandbox' || (mode === 'live' && !this.config('IYZICO_API_KEY').startsWith('sandbox-') && !this.config('IYZICO_SECRET_KEY').startsWith('sandbox-')),
      callbackUrl: !!callback && callback.pathname.replace(/\/$/, '') === '/payment/provider-callback',
      frontendUrl: !!frontend && frontend.pathname.replace(/\/$/, '') === '',
      databaseIndexes: this.indexesReady,
      merchantInformation: this.getMerchant().complete,
    };
    const configured = !!this.iyzipay && Object.values(checks).every(Boolean);
    const canAcceptPayments = configured && this.checkoutEnabled();
    return { provider: 'iyzico', mode, configured, canAcceptPayments,
      // Configuration does not prove settlement, merchant account approval or a real charge.
      livePaymentVerified: false,
      checks,
      message: canAcceptPayments ? (mode === 'live' ? 'Canlı ödeme yapılandırması hazır. Gerçek tahsilat henüz doğrulanmadı.' : 'Test ödeme ortamı hazır; gerçek tahsilat yapılmaz.')
        : 'Online ödeme henüz kullanıma açılmadı. Lütfen kurumla iletişime geçin.',
    };
  }

  getPublicReadiness() {
    const { mode, canAcceptPayments, message } = this.getReadiness();
    return { provider: 'iyzico', mode, canAcceptPayments, message };
  }

  private async requireAccount(userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new ForbiddenException('Aktif kullanıcı hesabı gerekli.');
    const actor = await this.userModel.findById(userId).select('-passwordHash -identityNumber').exec();
    if (!actor?.isActive) throw new ForbiddenException('Aktif kullanıcı hesabı gerekli.');
    return actor;
  }

  getMerchant() { return merchantInfo(this.configService); }

  getLegalVersions() {
    return {
      terms: this.config('PAYMENT_TERMS_VERSION') || 'terms-v2026-10-30',
      privacy: this.config('PRIVACY_POLICY_VERSION') || 'privacy-v2026-10-30',
      salesAgreement: this.config('SALES_AGREEMENT_VERSION') || 'sales-v2026-10-30',
      preInformation: this.config('PRE_INFORMATION_VERSION') || 'preinfo-v2026-10-30',
    };
  }

  private checkoutQuoteHash(pkg: any, student: any, resolvedGradeIds: string[]) {
    return createHash('sha256').update(JSON.stringify({
      packageId: identifier(pkg), name: pkg.name, priceCents: moneyCents(pkg.price), period: pkg.period,
      description: pkg.description || '', subtitle: pkg.subtitle || '', features: pkg.features || [],
      gradePolicy: pkg.gradePolicy || 'fixed', gradeIds: (pkg.gradeIds || []).map(identifier).sort(),
      resolvedGradeIds: [...resolvedGradeIds].sort(), studentId: identifier(student), grade: student.grade ?? null,
      legalVersions: this.getLegalVersions(), merchant: this.getMerchant(), environment: this.providerMode(),
    })).digest('hex');
  }

  private consentSnapshot(dto: InitializePaymentDto, acceptedAt: Date) {
    const versions = this.getLegalVersions();
    return {
      termsAcceptedAt: acceptedAt, termsVersion: versions.terms,
      ...(dto.privacyAccepted === true ? { privacyAcceptedAt: acceptedAt, privacyVersion: versions.privacy } : {}),
      ...(dto.salesAgreementAccepted === true ? { salesAgreementAcceptedAt: acceptedAt,
        salesAgreementVersion: versions.salesAgreement, preInformationVersion: versions.preInformation } : {}),
    };
  }

  private async bindCartCheckout(order: any, userId: string, dto: InitializePaymentDto, context: CartCheckoutContext, pkg: any) {
    if (!this.cartModel || !dto.quoteHash || dto.privacyAccepted !== true || dto.salesAgreementAccepted !== true) throw new BadRequestException('Sepet ve hukuki onaylar doğrulanamadı.');
    const cart = await this.cartModel.findOneAndUpdate({
      _id: context.cartId, userId, revision: context.revision, checkoutLeaseId: context.leaseId,
      checkoutLeaseExpiresAt: { $gt: new Date() }, quoteFingerprint: dto.quoteHash,
      packageId: identifier(order.package), studentId: identifier(order.beneficiary || order.user),
    }, { $set: { checkoutOrderId: order._id } }, { new: true }).exec();
    if (!cart) throw new ConflictException('Sepet değişti veya ödeme hazırlama süresi doldu. Sepetinizi yenileyin.');
    const result = await this.orderModel.updateOne({ _id: order._id, user: userId, status: OrderStatus.PENDING } as any, { $set: {
      cartId: context.cartId, cartRevision: context.revision, displayedQuoteHash: dto.quoteHash,
      packageDescription: pkg.description || '', packageSubtitle: pkg.subtitle || '', packageFeatures: pkg.features || [],
      packageGradePolicy: pkg.gradePolicy || 'fixed',
      ...this.consentSnapshot(dto, new Date()),
    } }).exec();
    if (result.matchedCount !== 1) throw new ConflictException('Sipariş durumu değişti. Önce sipariş durumunu doğrulayın.');
  }

  private async clearPaidCart(order: any) {
    if (!this.cartModel || !order.cartId || order.cartRevision === undefined || order.status !== OrderStatus.COMPLETED
      || !order.providerVerifiedAt || !order.iyzicoPaymentId || !order.paidAt || order.providerFraudStatus !== 1) return;
    await this.cartModel.updateOne({ _id: order.cartId, userId: identifier(order.user), revision: order.cartRevision,
      checkoutOrderId: order._id, packageId: identifier(order.package), studentId: identifier(order.beneficiary || order.user),
    }, { $inc: { revision: 1 }, $unset: { packageId: 1, studentId: 1, quoteSnapshot: 1, quoteFingerprint: 1,
      checkoutLeaseId: 1, checkoutLeaseExpiresAt: 1 } }).exec();
  }

  async requireAdmin(userId: string) {
    const actor = await this.requireAccount(userId);
    if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role as UserRole)) throw new ForbiddenException('Aktif yönetici yetkisi gerekli.');
  }

  private async currentStudents(userId: string) {
    const actor = await this.requireAccount(userId);
    if (actor.role === UserRole.STUDENT) return { actor, students: [actor] };
    if (actor.role !== UserRole.PARENT) throw new ForbiddenException('Öğrenci veya veli hesabı gerekli.');
    const students = await this.userModel.find({ parentId: userId, role: UserRole.STUDENT, isActive: true })
      .select('firstName lastName grade').lean().exec();
    return { actor, students };
  }

  async getStudents(userId: string) {
    const { students } = await this.currentStudents(userId);
    return students.map((student) => ({ _id: identifier(student), firstName: student.firstName, lastName: student.lastName }));
  }

  private async viewerScope(userId: string, studentId?: string) {
    const { actor, students } = await this.currentStudents(userId);
    const ids = students.map((student) => identifier(student));
    if (studentId && !ids.includes(studentId)) throw new ForbiddenException('Bu öğrenciye erişiminiz yok.');
    if (studentId) {
      const studentOid = new Types.ObjectId(studentId);
      return { actor, filter: { $or: [{ beneficiary: studentOid }, { user: studentOid, beneficiary: { $exists: false } }] } };
    }
    const studentOids = ids.map((id) => new Types.ObjectId(id));
    return { actor, filter: { $or: [{ user: new Types.ObjectId(userId) }, { beneficiary: { $in: studentOids } }, { user: { $in: studentOids }, beneficiary: { $exists: false } }] } };
  }

  private activeOrderFilter(studentId: string, packageId?: string, requireFulfilled = true) {
    return { $and: [
      { $or: [{ beneficiary: studentId }, { user: studentId, beneficiary: { $exists: false } }] },
      { status: OrderStatus.COMPLETED, paymentEnvironment: 'live', providerVerifiedAt: { $type: 'date' }, providerFraudStatus: 1, accessStartsAt: { $lte: new Date() },
        iyzicoPaymentId: { $type: 'string' }, paidAt: { $type: 'date' }, ...(requireFulfilled ? { fulfillmentStatus: FulfillmentStatus.FULFILLED, fulfillmentAt: { $exists: true } } : {}) },
      { $or: [{ validUntil: { $gt: new Date() } }, { packagePeriod: 'one-time', validUntil: { $exists: false } }] },
      ...(packageId ? [{ package: packageId }] : []),
    ] };
  }

  private async purchaseEligibility(studentId: string, packageId: string) {
    const active = await this.orderModel.findOne(this.activeOrderFilter(studentId, packageId, false) as any).select('_id validUntil fulfillmentStatus fulfillmentAt').lean().exec();
    return active
      ? { canPurchase: false, reason: active.fulfillmentStatus === FulfillmentStatus.FULFILLED && active.fulfillmentAt
          ? 'Bu öğrenci için aynı paket hâlen aktif. Süre bittikten sonra yeniden satın alabilirsiniz.'
          : 'Bu paket için ödemeniz zaten alındı; paket ataması tamamlanmayı bekliyor. Tekrar ödeme yapmayın, sipariş durumunu doğrulayın.', activeOrderId: identifier(active) }
      : { canPurchase: true, reason: null };
  }

  private async assertNoUnresolvedClosedCheckout(studentId: string, packageId: string, userId: string, now: Date) {
    // Local closure does not invalidate the provider's hosted page. Include old
    // records without the deduplication key and fail closed if expiry is unknown.
    const candidates = await this.orderModel.find({ $and: [
      { $or: [{ beneficiary: studentId }, { user: studentId, beneficiary: { $exists: false } }] },
      { package: packageId, status: { $in: [OrderStatus.CANCELLED, OrderStatus.FAILED] } },
      { $or: [{ paymentEnvironment: this.providerMode() }, { paymentEnvironment: { $exists: false } }] },
      { $or: [{ checkoutExpiresAt: { $gt: now } }, { checkoutExpiresAt: { $exists: false } }, { checkoutExpiresAt: null }] },
      { $or: [{ iyzicoToken: { $type: 'string' } }, { checkoutInitializedAt: { $type: 'date' } }, { checkoutExpiresAt: { $type: 'date' } }] },
    ] } as any).select('_id user providerPaymentStatus providerVerifiedAt failureCode').lean().exec();
    const unresolved = candidates.find((order) => order.failureCode !== 'INITIALIZE_REJECTED'
      && !(order.providerPaymentStatus === 'FAILURE' && order.providerVerifiedAt instanceof Date));
    if (unresolved) throw new ConflictException({
      message: 'Önceki ödeme oturumu bankada hâlâ açık olabilir. İkinci tahsilatı önlemek için oturum süresi dolana veya sağlayıcı başarısızlığı doğrulanana kadar yeni ödeme başlatılamaz.',
      ...(identifier(unresolved.user) === userId ? { orderId: identifier(unresolved) } : {}), code: 'CHECKOUT_STILL_OPEN',
    });
  }

  async getAdminReadiness() {
    const readiness = this.getReadiness();
    const count = await this.orderModel.countDocuments({ status: OrderStatus.COMPLETED, paymentEnvironment: 'live', providerVerifiedAt: { $type: 'date' }, providerFraudStatus: 1, iyzicoPaymentId: { $type: 'string' }, paidAt: { $type: 'date' }, fulfillmentAt: { $exists: true } }).exec();
    const livePaymentVerified = count > 0;
    return { ...readiness, livePaymentVerified,
      message: readiness.canAcceptPayments && readiness.mode === 'live' && livePaymentVerified
        ? 'Canlı ödeme yapılandırması hazır. Sağlayıcı tarafından doğrulanmış canlı ödeme kaydı mevcut.'
        : readiness.message,
    };
  }

  private assertReady() {
    if (!this.getReadiness().canAcceptPayments) throw new ServiceUnavailableException(this.getPublicReadiness().message);
  }

  private async checkoutParties(userId: string, studentId?: string) {
    if (!Types.ObjectId.isValid(userId)) throw new ForbiddenException('Geçersiz kullanıcı.');
    const buyer = await this.userModel.findById(userId).select('-passwordHash').exec();
    if (!buyer || !buyer.isActive) throw new ForbiddenException('Aktif kullanıcı bulunamadı.');
    if (buyer.role === UserRole.STUDENT) {
      if (studentId && studentId !== userId) throw new ForbiddenException('Yalnızca kendi hesabınız için satın alabilirsiniz.');
      return { buyer, beneficiary: buyer };
    }
    if (buyer.role === UserRole.PARENT) {
      if (!studentId || !Types.ObjectId.isValid(studentId)) throw new BadRequestException('Paketin kullanılacağı öğrenciyi seçin.');
      const beneficiary = await this.userModel.findOne({ _id: studentId, parentId: userId, role: UserRole.STUDENT, isActive: true }).exec();
      if (!beneficiary) throw new ForbiddenException('Bu öğrenci hesabına erişiminiz yok.');
      return { buyer, beneficiary };
    }
    throw new ForbiddenException('Paket satın almak için öğrenci veya veli hesabı kullanın.');
  }

  async getCheckoutContext(userId: string, packageId: string, selectedStudentId?: string) {
    if (!Types.ObjectId.isValid(packageId)) throw new BadRequestException('Geçersiz paket.');
    const [pkg, buyer] = await Promise.all([
      this.packageModel.findOne({ _id: packageId, isActive: true }).lean().exec(),
      this.requireAccount(userId),
    ]);
    if (!pkg) throw new NotFoundException('Aktif paket bulunamadı.');
    if (!buyer?.isActive || ![UserRole.STUDENT, UserRole.PARENT].includes(buyer.role as UserRole)) throw new ForbiddenException('Öğrenci veya veli hesabı kullanın.');
    const students = buyer.role === UserRole.PARENT
      ? await this.userModel.find({ parentId: userId, role: UserRole.STUDENT, isActive: true }).select('firstName lastName').lean().exec()
      : [];
    const studentId = buyer.role === UserRole.STUDENT ? userId : selectedStudentId;
    if (studentId && buyer.role === UserRole.PARENT && !students.some((student) => identifier(student) === studentId)) throw new ForbiddenException('Bu öğrenciye erişiminiz yok.');
    if (moneyCents(pkg.price) === null || Number(pkg.price) <= 0 || !['monthly', 'yearly', 'one-time'].includes(pkg.period)) throw new NotFoundException('Satışa hazır paket bulunamadı.');
    let eligibility: { canPurchase: boolean; reason: string | null; activeOrderId?: string } = studentId ? await this.purchaseEligibility(studentId, packageId) : { canPurchase: false, reason: 'Paketin kullanılacağı öğrenciyi seçin.' };
    const beneficiary = studentId ? (buyer.role === UserRole.STUDENT ? buyer : (await this.checkoutParties(userId, studentId)).beneficiary) : null;
    let resolvedGradeIds: string[] = [];
    if (studentId && beneficiary) {
      try {
        resolvedGradeIds = await this.resolvePackageGrades(beneficiary, pkg);
        if (eligibility.canPurchase) await this.assertNoUnresolvedClosedCheckout(studentId, packageId, userId, new Date());
      }
      catch (error: unknown) {
        if (!(error instanceof BadRequestException) && !(error instanceof ConflictException)) throw error;
        eligibility = { canPurchase: false, reason: error.message };
      }
    }
    return { package: { _id: pkg._id, name: pkg.name, description: pkg.description, subtitle: pkg.subtitle, features: pkg.features,
        price: pkg.price, period: pkg.period, gradePolicy: pkg.gradePolicy || 'fixed' },
      buyer: { firstName: buyer.firstName, lastName: buyer.lastName, phone: buyer.phone, role: buyer.role }, students,
      student: beneficiary ? { _id: identifier(beneficiary), firstName: beneficiary.firstName, lastName: beneficiary.lastName, grade: beneficiary.grade } : null,
      resolvedGradeIds, quoteHash: beneficiary ? this.checkoutQuoteHash(pkg, beneficiary, resolvedGradeIds) : null, legalVersions: this.getLegalVersions(),
      eligibility, merchant: this.getMerchant(), payment: this.getPublicReadiness() };
  }

  private providerCall(method: (request: any, cb: (error: any, result: any) => void) => void, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        reject(new ServiceUnavailableException('Ödeme sağlayıcısı yanıt vermedi. İşlemi yeniden doğrulayın; tekrar ödeme yapmayın.'));
      }, 30000);
      const fail = () => reject(new ServiceUnavailableException('Ödeme sağlayıcısına ulaşılamadı. İşlemi yeniden doğrulayın.'));
      try {
        method(request, (error, result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (error || !result || typeof result !== 'object') return fail();
          resolve(result);
        });
      } catch {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fail();
      }
    });
  }

  private verifySignature(result: any, values: unknown[]) {
    if (typeof result.signature !== 'string' || !/^[a-f0-9]{64}$/i.test(result.signature)) throw new BadRequestException('Ödeme yanıtı doğrulanamadı.');
    const expected = paymentSignature(this.config('IYZICO_SECRET_KEY'), values);
    if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(result.signature, 'hex'))) throw new BadRequestException('Ödeme yanıtı doğrulanamadı.');
  }

  private validProviderPage(value: unknown) {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password &&
        (this.providerMode() !== 'live' || !url.hostname.includes('sandbox')) &&
        ['iyzipay.com', 'iyzico.com'].some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    } catch { return false; }
  }

  private async authoritativeStudentLevel(student: any) {
    const enrolled = await this.enrollmentModel.find({ studentId: student._id })
      .populate<{ gradeId: Grade | null }>('gradeId', 'level isActive').lean().exec();
    const levels = new Set<number>();
    if (student.grade !== undefined && student.grade !== null) {
      const level = Number(student.grade);
      if (!Number.isInteger(level) || level < 1 || level > 8) throw new BadRequestException('Öğrencinin sınıf seviyesi kurum tarafından doğrulanmalı.');
      levels.add(level);
    }
    for (const row of enrolled) {
      if (!row.gradeId?.isActive) continue;
      const level = Number(row.gradeId.level);
      if (!Number.isInteger(level) || level < 1 || level > 8) throw new BadRequestException('Öğrencinin sınıf kayıtları kurum tarafından doğrulanmalı.');
      levels.add(level);
    }
    if (levels.size !== 1) throw new BadRequestException('Öğrencinin tek bir sınıf seviyesi kurum tarafından doğrulanmalı.');
    return [...levels][0];
  }

  private async configuredClasses(gradeIds: string[]) {
    if (!gradeIds.length || new Set(gradeIds).size !== gradeIds.length) throw new BadRequestException('Paketin sınıf atamaları kurum tarafından güncellenmeli.');
    const classes = await this.gradeModel.find({ _id: { $in: gradeIds }, isActive: true }).select('_id level').lean().exec();
    if (classes.length !== gradeIds.length || classes.some(grade => !Number.isInteger(grade.level) || grade.level < 1 || grade.level > 8)) {
      throw new BadRequestException('Paketin sınıf atamaları kurum tarafından güncellenmeli.');
    }
    return classes;
  }

  private async assertClassScope(student: any, gradeIds: string[]) {
    const [classes, level] = await Promise.all([this.configuredClasses(gradeIds), this.authoritativeStudentLevel(student)]);
    if (classes.some((grade) => Number(grade.level) !== level)) {
      throw new BadRequestException('Bu paket öğrencinin sınıf seviyesine uygun değil.');
    }
  }

  private async resolvePackageGrades(student: any, pkg: any): Promise<string[]> {
    const gradeIds = (pkg.gradeIds || []).map(identifier);
    const policy = pkg.gradePolicy || 'fixed';
    if (policy === 'fixed') {
      await this.assertClassScope(student, gradeIds);
      return gradeIds;
    }
    if (policy !== 'student-level') throw new BadRequestException('Paketin sınıf atama yöntemi kurum tarafından güncellenmeli.');
    const [classes, level] = await Promise.all([this.configuredClasses(gradeIds), this.authoritativeStudentLevel(student)]);
    if (new Set(classes.map(grade => grade.level)).size !== classes.length) {
      throw new BadRequestException('Öğrenci seviyesine göre pakette her sınıf seviyesi için yalnızca bir aktif sınıf seçilmelidir.');
    }
    const selected = classes.find(grade => grade.level === level);
    if (!selected) throw new BadRequestException('Bu pakette öğrencinin sınıf seviyesine uygun bir sınıf henüz tanımlanmamış.');
    return [identifier(selected)];
  }

  private async assertOrderClassScope(order: any) {
    const gradeIds = (order.gradeIds || []).map((id: any) => String(id));
    if (!gradeIds.length) throw new BadRequestException('Paketin sınıf atamaları kurum tarafından güncellenmeli.');
    const student = await this.userModel.findById(identifier(order.beneficiary || order.user)).exec();
    if (!student?.isActive || student.role !== UserRole.STUDENT) throw new BadRequestException('Paketin öğrenci hesabı kurum tarafından doğrulanmalı.');
    await this.assertClassScope(student, gradeIds);
  }

  async initializeCheckoutForm(userId: string, dto: InitializePaymentDto, requestIp: string, cartContext?: CartCheckoutContext): Promise<any> {
    this.assertReady();
    if (!Types.ObjectId.isValid(dto.packageId)) throw new BadRequestException('Geçersiz paket.');
    // Mongo accepts either hex case for the same ObjectId. The lock, order and
    // provider item must use a single representation of that identity.
    const packageId = new Types.ObjectId(dto.packageId).toHexString();
    if (!validIdentityNumber(dto.identityNumber)) throw new BadRequestException('Geçerli bir T.C. kimlik numarası girin.');
    if (dto.termsAccepted !== true || dto.privacyAccepted !== true || dto.salesAgreementAccepted !== true) {
      throw new BadRequestException('Satın alma koşulları, gizlilik bildirimi ve satış sözleşmesi onayları gerekli.');
    }
    const ip = String(requestIp || '').replace(/^::ffff:/, '');
    if (!isIP(ip)) throw new BadRequestException('Alıcı bağlantı bilgisi doğrulanamadı.');
    const [{ buyer, beneficiary }, pkg] = await Promise.all([
      this.checkoutParties(userId, dto.studentId),
      this.packageModel.findOne({ _id: packageId, isActive: true }).exec(),
    ]);
    if (!pkg) throw new NotFoundException('Aktif paket bulunamadı.');
    const cents = moneyCents(pkg.price);
    if (cents === null || cents < 1) throw new BadRequestException('Paket fiyatı geçersiz.');
    const gradeIds = await this.resolvePackageGrades(beneficiary, pkg);
    if (!['monthly', 'yearly', 'one-time'].includes(pkg.period)) throw new BadRequestException('Paket dönemi geçersiz.');
    if (dto.quoteHash && dto.quoteHash !== this.checkoutQuoteHash(pkg, beneficiary, gradeIds)) throw new ConflictException({
      message: 'Paket fiyatı, kapsamı veya onay metinleri değişti. Sepetinizi güncelleyip yeni bilgileri onaylayın.', code: 'QUOTE_CHANGED',
    });
    const beneficiaryId = identifier(beneficiary);
    const eligibility = await this.purchaseEligibility(beneficiaryId, packageId);
    if (!eligibility.canPurchase) throw new ConflictException({ message: eligibility.reason, orderId: eligibility.activeOrderId, code: 'PACKAGE_ALREADY_ACTIVE' });
    const pendingCheckoutKey = `${this.providerMode()}:${beneficiaryId}:${packageId}`;
    const now = new Date();
    await this.assertNoUnresolvedClosedCheckout(beneficiaryId, packageId, userId, now);
    // Local cancellation retains the unique slot while a bank session may live.
    // Only expiry or a verified provider failure releases that slot.
    await this.orderModel.updateMany({ pendingCheckoutKey, status: { $in: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
      $or: [{ checkoutExpiresAt: { $lte: now }, providerPaymentStatus: { $ne: 'SUCCESS' } },
        { providerPaymentStatus: 'FAILURE', providerVerifiedAt: { $type: 'date' } }],
    }, { $unset: { pendingCheckoutKey: 1 } }).exec();
    // A stuck initialization has never exposed a hosted form.
    await this.orderModel.updateMany({ pendingCheckoutKey, status: OrderStatus.PENDING,
      checkoutExpiresAt: { $lte: now }, iyzicoToken: { $exists: false } }, {
      $set: { status: OrderStatus.FAILED, failureCode: 'INITIALIZE_EXPIRED' }, $unset: { pendingCheckoutKey: 1 },
    }).exec();
    const existing = await this.orderModel.findOne({ pendingCheckoutKey }).select('+paymentPageUrl +displayedQuoteHash').exec();
    if (existing) {
      const response = this.reuseCheckout(existing, userId, cents, pkg.period, gradeIds, this.checkoutQuoteHash(pkg, beneficiary, gradeIds));
      if (cartContext) await this.bindCartCheckout(existing, userId, dto, cartContext, pkg);
      return response;
    }
    const order = new this.orderModel({ user: userId, beneficiary: beneficiary._id, package: packageId,
      amount: cents / 100, currency: 'TRY', paymentEnvironment: this.providerMode(), packageName: pkg.name, packagePeriod: pkg.period, gradeIds,
      packageDescription: pkg.description || '', packageSubtitle: pkg.subtitle || '', packageFeatures: pkg.features || [],
      packageGradePolicy: pkg.gradePolicy || 'fixed',
      status: OrderStatus.PENDING, fulfillmentStatus: FulfillmentStatus.PENDING, pendingCheckoutKey, checkoutExpiresAt: new Date(now.getTime() + 30 * 60 * 1000),
      ...this.consentSnapshot(dto, now), termsAcceptedIp: ip, displayedQuoteHash: dto.quoteHash,
      ...(cartContext ? { cartId: cartContext.cartId, cartRevision: cartContext.revision } : {}),
      sellerSnapshot: this.getMerchant(),
    });
    try { await order.save(); }
    catch (error: unknown) {
      if (isDuplicateKey(error)) {
        const winner = await this.orderModel.findOne({ pendingCheckoutKey }).select('+paymentPageUrl +displayedQuoteHash').exec();
        if (winner) {
          const response = this.reuseCheckout(winner, userId, cents, pkg.period, gradeIds, this.checkoutQuoteHash(pkg, beneficiary, gradeIds));
          if (cartContext) await this.bindCartCheckout(winner, userId, dto, cartContext, pkg);
          return response;
        }
        throw new ConflictException('Bu öğrenci ve paket için ödeme oturumu hazırlanıyor. Sipariş geçmişinizi kontrol edin.');
      }
      throw error;
    }
    const orderId = String(order._id);
    const price = (cents / 100).toFixed(2);
    const address = { contactName: `${buyer.firstName} ${buyer.lastName}`, city: dto.city.trim(), country: 'Turkey', address: dto.address.trim() };
    let initializationRejected = true;
    try {
      // A callback may complete the previous order and release its unique slot
      // after the first eligibility check. Recheck while owning the new slot.
      const lockedEligibility = await this.purchaseEligibility(beneficiaryId, packageId);
      if (!lockedEligibility.canPurchase) throw new ConflictException({ message: lockedEligibility.reason, orderId: lockedEligibility.activeOrderId, code: 'PACKAGE_ALREADY_ACTIVE' });
      if (cartContext) await this.bindCartCheckout(order, userId, dto, cartContext, pkg);
      initializationRejected = false; // From here the provider may have opened a session.
      const result = await this.providerCall(this.iyzipay.checkoutFormInitialize.create.bind(this.iyzipay.checkoutFormInitialize), {
        locale: 'tr', conversationId: orderId, price, paidPrice: price, currency: 'TRY', basketId: `BASKET_${orderId}`,
        paymentGroup: 'PRODUCT', callbackUrl: this.config('PAYMENT_CALLBACK_URL'), enabledInstallments: [1], forceThreeDS: true,
        buyer: { id: userId, name: buyer.firstName, surname: buyer.lastName, email: buyer.email,
          gsmNumber: dto.phone, identityNumber: dto.identityNumber, registrationAddress: dto.address.trim(), ip, city: dto.city.trim(), country: 'Turkey' },
        billingAddress: address,
        basketItems: [{ id: packageId, name: pkg.name, category1: 'Eğitim Paketi', itemType: 'VIRTUAL', price }],
      });
      if (result.status !== 'success') {
        initializationRejected = result.status === 'failure' && !result.token && !result.paymentPageUrl;
        throw new BadRequestException('Ödeme oturumu başlatılamadı. Lütfen tekrar deneyin.');
      }
      this.verifySignature(result, [result.conversationId, result.token]);
      if (result.conversationId !== orderId || typeof result.token !== 'string' || !/^[A-Za-z0-9_-]{8,200}$/.test(result.token) || !this.validProviderPage(result.paymentPageUrl)) {
        throw new BadRequestException('Ödeme oturumu doğrulanamadı.');
      }
      const expireSeconds = Number(result.tokenExpireTime);
      const checkoutExpiresAt = new Date(Date.now() + (Number.isInteger(expireSeconds) && expireSeconds > 0 ? expireSeconds : 1800) * 1000);
      const saved = await this.orderModel.findOneAndUpdate({ _id: order._id, status: { $in: [OrderStatus.PENDING, OrderStatus.CANCELLED] } }, {
        $set: { iyzicoToken: result.token, paymentPageUrl: result.paymentPageUrl, checkoutExpiresAt, checkoutInitializedAt: new Date() },
      }, { new: true }).select('+paymentPageUrl').exec();
      if (!saved) throw new ConflictException('Sipariş durumu değişti.');
      if (saved.status === OrderStatus.CANCELLED) throw new ConflictException({ message: 'Sipariş kapatıldı. Bankadaki ödeme oturumunun süresi dolana kadar yeni ödeme açmayın.', orderId: identifier(saved) });
      return this.checkoutResponse(saved);
    } catch (error) {
      await this.orderModel.updateOne({ _id: order._id, status: OrderStatus.PENDING, iyzicoToken: { $exists: false } }, {
        $set: { status: OrderStatus.FAILED, failureCode: initializationRejected ? 'INITIALIZE_REJECTED' : 'INITIALIZE_FAILED' },
        ...(initializationRejected ? { $unset: { pendingCheckoutKey: 1 } } : {}),
      }).exec();
      throw error;
    }
  }

  private reuseCheckout(order: any, userId: string, cents: number, period: string, gradeIds: string[], currentQuoteHash?: string) {
    if (identifier(order.user) !== userId) throw new ConflictException('Bu öğrenci ve paket için başka bir alıcı tarafından başlatılmış ödeme var. Önce mevcut işlemi tamamlayın.');
    if (order.providerPaymentStatus === 'SUCCESS') throw new ConflictException({ message: 'Ödemeniz sağlayıcı tarafından alındı veya incelemede. Tekrar ödeme açmadan önce siparişinizi doğrulayın.', orderId: identifier(order) });
    if (order.status !== OrderStatus.PENDING || !order.paymentPageUrl) throw new ConflictException({ message: 'Ödeme oturumu hazırlanıyor. Sipariş geçmişinizi kontrol edin.', orderId: identifier(order) });
    if (!order.checkoutExpiresAt || new Date(order.checkoutExpiresAt).getTime() <= Date.now()) throw new ConflictException({ message: 'Ödeme oturumunun süresi doldu. Yeni ödeme açmadan önce siparişi doğrulayın veya bekleyen kaydı kapatın.', orderId: identifier(order) });
    if (moneyCents(order.amount) !== cents || order.packagePeriod !== period || JSON.stringify((order.gradeIds || []).map(identifier).sort()) !== JSON.stringify([...gradeIds].sort())
      || (order.displayedQuoteHash && currentQuoteHash && order.displayedQuoteHash !== currentQuoteHash)) {
      throw new ConflictException({ message: 'Paketin fiyatı veya içeriği değişti. Önce mevcut bekleyen siparişi kapatın.', orderId: identifier(order), code: 'CHECKOUT_CHANGED' });
    }
    return { ...this.checkoutResponse(order), reused: true };
  }

  private checkoutResponse(order: any) {
    if (!this.validProviderPage(order.paymentPageUrl)) throw new BadRequestException('Güvenli ödeme adresi doğrulanamadı.');
    return { status: 'success', orderId: identifier(order), paymentPageUrl: order.paymentPageUrl,
      expiresAt: order.checkoutExpiresAt, mode: order.paymentEnvironment || this.providerMode(), amount: order.amount, packageName: order.packageName };
  }

  async handleProviderWebhook(body: unknown, signature: unknown): Promise<void> {
    const receipt = verifyIyzicoWebhook(body, signature, this.config('IYZICO_SECRET_KEY'));
    if (!receipt) return; // A signed event for a different product or an intermediate state.
    if (!this.iyzipay || !this.indexesReady) throw new ServiceUnavailableException('Ödeme bildirimi henüz işlenemedi.');
    const scope = { _id: receipt.orderId, iyzicoToken: receipt.token, paymentEnvironment: this.providerMode() };
    const duplicate = (order: OrderDocument | null) => order?.providerWebhookFingerprint === receipt.fingerprint;
    const irrelevantCompleted = (order: OrderDocument) => order.status === OrderStatus.COMPLETED
      && (receipt.status !== 'SUCCESS' || order.iyzicoPaymentId !== receipt.paymentId);
    try {
      const current = await this.orderModel.findOne(scope).select('+providerWebhookFingerprint').exec();
      if (!current || duplicate(current) || irrelevantCompleted(current)) return;
      const leaseId = randomUUID();
      const now = new Date();
      const claimed = await this.orderModel.findOneAndUpdate({ ...scope, providerWebhookFingerprint: { $ne: receipt.fingerprint },
        $or: [{ providerWebhookLeaseExpiresAt: { $exists: false } }, { providerWebhookLeaseExpiresAt: { $lte: now } }],
      }, { $set: { providerWebhookLeaseId: leaseId, providerWebhookLeaseExpiresAt: new Date(now.getTime() + 90000) } }, { new: true }).exec();
      if (!claimed) {
        const latest = await this.orderModel.findOne(scope).select('+providerWebhookFingerprint').exec();
        if (!latest || duplicate(latest) || irrelevantCompleted(latest)) return;
        // A concurrent request owns the lease. Retry if it fails to persist the result.
        throw new ServiceUnavailableException('Ödeme bildirimi henüz işlenemedi.');
      }
      const lease = { ...scope, providerWebhookLeaseId: leaseId };
      try {
        await this.handleCallback(receipt.token, receipt);
        const latest = await this.orderModel.findOne(scope).exec();
        const terminal = latest?.providerVerifiedAt && (receipt.status === 'FAILURE'
          ? latest.providerPaymentStatus === 'FAILURE'
          : latest.iyzicoPaymentId === receipt.paymentId && (latest.providerFraudStatus === -1
            || (latest.providerFraudStatus === 1 && latest.status === OrderStatus.COMPLETED)));
        if (!terminal) throw new ServiceUnavailableException('Ödeme bildirimi henüz işlenemedi.');
        await this.orderModel.updateOne(lease, { $set: { providerWebhookFingerprint: receipt.fingerprint } }).exec();
      } finally {
        await this.orderModel.updateOne(lease, { $unset: { providerWebhookLeaseId: 1, providerWebhookLeaseExpiresAt: 1 } }).exec().catch(() => undefined);
      }
    } catch {
      // Keep provider response bodies, order identifiers and tokens out of the
      // public notification response. Non-2xx asks iyzico to retry.
      throw new ServiceUnavailableException('Ödeme bildirimi henüz işlenemedi.');
    }
  }

  async handleCallback(token: string, webhook?: IyzicoWebhookReceipt): Promise<any> {
    if (!this.iyzipay) throw new ServiceUnavailableException('Ödeme sistemi yapılandırılmamış.');
    if (!this.indexesReady) throw new ServiceUnavailableException('Sipariş güvenliği hazırlanamadı. Kurumla iletişime geçin.');
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{8,200}$/.test(token)) throw new BadRequestException('Geçersiz ödeme tokenı.');
    const order = await this.orderModel.findOne({ iyzicoToken: token,
      ...(webhook ? { _id: webhook.orderId, paymentEnvironment: this.providerMode() } : {}),
    }).exec();
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    if (order.status === OrderStatus.COMPLETED) {
      if (webhook && (webhook.status !== 'SUCCESS' || webhook.paymentId !== order.iyzicoPaymentId)) throw new ConflictException('Ödeme bildirimi eşleşmiyor.');
      return this.callbackResponse(await this.fulfillOrder(order));
    }
    if (order.paymentEnvironment && order.paymentEnvironment !== this.providerMode()) throw new ConflictException('Siparişin ödeme ortamı ile sunucunun ortamı eşleşmiyor. Kurumla iletişime geçin.');
    const orderId = identifier(order);
    try {
      const result = await this.providerCall(this.iyzipay.checkoutForm.retrieve.bind(this.iyzipay.checkoutForm), { locale: 'tr', conversationId: orderId, token });
      if (result.status !== 'success') throw new ServiceUnavailableException('Ödeme sonucu henüz doğrulanamadı. Yeni ödeme açmadan önce tekrar doğrulayın.');
      this.verifySignature(result, [result.paymentStatus, result.paymentId, result.currency, result.basketId, result.conversationId,
        normalizeSignaturePrice(result.paidPrice), normalizeSignaturePrice(result.price), result.token]);
      if (result.token !== token || result.conversationId !== orderId || result.basketId !== `BASKET_${orderId}` || result.currency !== order.currency) {
        throw new BadRequestException('Ödeme ve sipariş bilgileri eşleşmiyor.');
      }
      if (webhook && (result.paymentStatus !== webhook.status || String(result.paymentId) !== webhook.paymentId)) throw new BadRequestException('Ödeme bildirimi eşleşmiyor.');
      const verified = { providerPaymentStatus: String(result.paymentStatus || ''), providerFraudStatus: result.fraudStatus,
        providerVerifiedAt: new Date(), lastReconciledAt: new Date() };
      // An older retrieve may finish after another callback has recorded newer
      // evidence. A non-success result may only replace the state it read.
      const unchanged = { _id: order._id, status: order.status,
        providerVerifiedAt: order.providerVerifiedAt === undefined ? { $exists: false } : order.providerVerifiedAt,
        providerPaymentStatus: order.providerPaymentStatus === undefined ? { $exists: false } : order.providerPaymentStatus,
        providerFraudStatus: order.providerFraudStatus === undefined ? { $exists: false } : order.providerFraudStatus };
      if (result.paymentStatus === 'FAILURE') {
        await this.orderModel.updateOne(unchanged, {
          $set: { ...verified, ...(order.status === OrderStatus.CANCELLED ? {} : { status: OrderStatus.FAILED }), failureCode: 'PAYMENT_FAILED' }, $unset: { pendingCheckoutKey: 1, reconciliationError: 1 },
        }).exec();
        return this.callbackResponse(await this.orderModel.findById(order._id).exec());
      }
      // Intermediate 3DS/APM/bank statuses are not payment failures.
      if (result.paymentStatus !== 'SUCCESS') {
        if (!['SUCCESS', 'FAILURE'].includes(order.providerPaymentStatus)) {
          await this.orderModel.updateOne(unchanged, { $set: verified, $unset: { reconciliationError: 1 } }).exec();
        }
        return this.callbackResponse(await this.orderModel.findById(order._id).exec());
      }
      if (!result.paymentId || moneyCents(result.price) !== moneyCents(order.amount) || moneyCents(result.paidPrice) !== moneyCents(order.amount)
        || result.installment !== 1 || result.itemTransactions?.length !== 1
        || String(result.itemTransactions[0].itemId) !== identifier(order.package)
        || moneyCents(result.itemTransactions[0].price) !== moneyCents(order.amount)
        || moneyCents(result.itemTransactions[0].paidPrice) !== moneyCents(order.amount)
        || !result.itemTransactions[0].paymentTransactionId) {
        throw new BadRequestException('Ödeme tutarı veya paket bilgisi eşleşmiyor. Kurum incelemesi gerekli.');
      }
      const payment = { ...verified, paymentEnvironment: this.providerMode(), iyzicoPaymentId: String(result.paymentId),
        iyzicoPaymentTransactionId: String(result.itemTransactions[0].paymentTransactionId), providerPaidPrice: moneyCents(result.paidPrice)! / 100 };
      if (result.fraudStatus !== 1) {
        const rejected = result.fraudStatus === -1;
        await this.orderModel.updateOne(rejected ? unchanged : { _id: order._id, status: { $ne: OrderStatus.COMPLETED }, providerFraudStatus: { $ne: -1 } }, {
          $set: { ...payment, ...(rejected && order.status !== OrderStatus.CANCELLED ? { status: OrderStatus.FAILED } : {}), failureCode: rejected ? 'FRAUD_REJECTED' : 'FRAUD_REVIEW' },
          ...(rejected ? { $unset: { pendingCheckoutKey: 1 } } : {}),
        }).exec();
        return this.callbackResponse(await this.orderModel.findById(order._id).exec());
      }
      const paidAt = new Date();
      const validUntil = packageAccessEnd(paidAt, order.packagePeriod);
      // A late approved payment must be accounted for even after a local cancellation.
      // Only the first transition stamps access dates; repeat callbacks cannot extend them.
      const updated = await this.orderModel.findOneAndUpdate({ _id: order._id, status: { $in: [OrderStatus.PENDING, OrderStatus.FAILED, OrderStatus.CANCELLED] } }, {
        $set: { ...payment, status: OrderStatus.COMPLETED, paidAt, accessStartsAt: paidAt,
          fulfillmentStatus: this.providerMode() === 'sandbox' ? FulfillmentStatus.SKIPPED_SANDBOX : FulfillmentStatus.PENDING,
          ...(validUntil ? { validUntil } : {}) },
        $unset: { pendingCheckoutKey: 1, failureCode: 1, reconciliationError: 1 },
      }, { new: true }).exec();
      const completed = updated || await this.orderModel.findById(order._id).exec();
      return this.callbackResponse(completed?.status === OrderStatus.COMPLETED ? await this.fulfillOrder(completed) : completed);
    } catch (error: unknown) {
      await this.orderModel.updateOne({ _id: order._id, status: { $ne: OrderStatus.COMPLETED } }, { $set: {
        lastReconciledAt: new Date(), reconciliationError: error instanceof BadRequestException ? 'VERIFICATION_FAILED' : 'PROVIDER_UNAVAILABLE',
      } }).exec().catch(() => undefined);
      if (isDuplicateKey(error)) throw new ConflictException('Bu ödeme sağlayıcı kaydı başka bir siparişe bağlı. Kurum incelemesi gerekli.');
      throw error;
    }
  }

  private async fulfillOrder(order: any): Promise<any> {
    if (order.status !== OrderStatus.COMPLETED) return order;
    // A paid result may arrive after the buyer has changed their cart. The CAS
    // only clears the exact revision and order that initiated this checkout.
    await this.clearPaidCart(order).catch(() => this.logger.warn('Doğrulanmış siparişin sepeti temizlenemedi; sipariş durumu korunuyor.'));
    if (order.paymentEnvironment === 'sandbox') {
      if (order.fulfillmentStatus !== FulfillmentStatus.SKIPPED_SANDBOX) {
        await this.orderModel.updateOne({ _id: order._id, paymentEnvironment: 'sandbox', status: OrderStatus.COMPLETED }, {
          $set: { fulfillmentStatus: FulfillmentStatus.SKIPPED_SANDBOX }, $unset: { fulfillmentLeaseId: 1, fulfillmentLeaseExpiresAt: 1 },
        }).exec();
      }
      return { ...(order.toObject?.() || order), fulfillmentStatus: FulfillmentStatus.SKIPPED_SANDBOX };
    }
    if (order.fulfillmentAt || order.fulfillmentStatus === FulfillmentStatus.FULFILLED) return order;
    if (order.paymentEnvironment !== 'live' || !order.providerVerifiedAt || !order.iyzicoPaymentId || !order.paidAt || order.providerFraudStatus !== 1) return order;
    const leaseId = randomUUID();
    const claimed = await this.orderModel.findOneAndUpdate({ _id: order._id, status: OrderStatus.COMPLETED,
      paymentEnvironment: 'live', fulfillmentAt: { $exists: false },
      $or: [{ fulfillmentStatus: { $in: [FulfillmentStatus.PENDING, FulfillmentStatus.FAILED] } },
        { fulfillmentStatus: { $exists: false } }, { fulfillmentLeaseExpiresAt: { $lte: new Date() } }],
    }, { $set: { fulfillmentStatus: FulfillmentStatus.PROCESSING, fulfillmentLeaseId: leaseId,
      fulfillmentLeaseExpiresAt: new Date(Date.now() + 60000) }, $inc: { fulfillmentAttempts: 1 } }, { new: true }).exec();
    if (!claimed) return await this.orderModel.findById(order._id).exec() || order;
    try {
      await this.assertOrderClassScope(claimed);
      const studentId = new Types.ObjectId(identifier(claimed.beneficiary || claimed.user));
      const startsAt = claimed.accessStartsAt || claimed.paidAt;
      if (!startsAt || (claimed.packagePeriod !== 'one-time' && !claimed.validUntil)) throw new BadRequestException('Paket erişim tarihleri doğrulanmalı.');
      if (claimed.validUntil && new Date(claimed.validUntil).getTime() <= Date.now()) throw new BadRequestException({ code: 'ACCESS_PERIOD_EXPIRED', message: 'Paket erişim süresi dolmuş. Kurum incelemesi gerekli.' });
      const grant = { orderId: claimed._id, startsAt, ...(claimed.validUntil ? { expiresAt: claimed.validUntil } : {}),
        unlimited: claimed.packagePeriod === 'one-time', environment: 'live' as const };
      for (const gradeId of claimed.gradeIds || []) {
        const filter = { studentId, gradeId: new Types.ObjectId(identifier(gradeId)) };
        const update = { $setOnInsert: { studentId, gradeId, enrollmentDate: claimed.paidAt, accessSource: 'package' }, $addToSet: { packageGrants: grant } };
        try {
          await this.enrollmentModel.updateOne(filter, update, { upsert: true, runValidators: true }).setOptions({ includeExpiredEnrollments: true }).exec();
        } catch (error: unknown) {
          if (!isDuplicateKey(error)) throw error;
          // A simultaneous manual enrollment can win the unique key. The grant still
          // has to be added; ignoring duplicate-key errors would lose paid access.
          await this.enrollmentModel.updateOne(filter, { $addToSet: { packageGrants: grant } }, { runValidators: true }).setOptions({ includeExpiredEnrollments: true }).exec();
        }
      }
      await this.orderModel.updateOne({ _id: claimed._id, status: OrderStatus.COMPLETED, fulfillmentLeaseId: leaseId }, {
        $set: { fulfillmentAt: new Date(), fulfillmentStatus: FulfillmentStatus.FULFILLED },
        $unset: { fulfillmentLeaseId: 1, fulfillmentLeaseExpiresAt: 1, fulfillmentError: 1 },
      }).exec();
    } catch (error: unknown) {
      await this.orderModel.updateOne({ _id: claimed._id, status: OrderStatus.COMPLETED, fulfillmentLeaseId: leaseId }, {
        $set: { fulfillmentStatus: FulfillmentStatus.FAILED, fulfillmentError: error instanceof BadRequestException ? (typeof error.getResponse() === 'object' && (error.getResponse() as { code?: string }).code === 'ACCESS_PERIOD_EXPIRED' ? 'ACCESS_PERIOD_EXPIRED' : 'CLASS_ASSIGNMENT_REVIEW') : 'ASSIGNMENT_RETRY_REQUIRED' },
        $unset: { fulfillmentLeaseId: 1, fulfillmentLeaseExpiresAt: 1 },
      }).exec();
    }
    return await this.orderModel.findById(order._id).exec() || claimed;
  }

  private callbackResponse(order: any) {
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    const fulfilled = !!order.fulfillmentAt || order.fulfillmentStatus === FulfillmentStatus.FULFILLED;
    const sandbox = order.paymentEnvironment === 'sandbox';
    const paid = order.status === OrderStatus.COMPLETED && !!order.providerVerifiedAt && !!order.iyzicoPaymentId && !!order.paidAt && order.providerFraudStatus === 1;
    const legacyCompleted = order.status === OrderStatus.COMPLETED && !paid;
    return { status: paid ? (fulfilled || sandbox ? 'success' : 'pending') : legacyCompleted || order.status === OrderStatus.PENDING ? 'pending' : 'failure',
      message: paid ? (sandbox ? 'Test ödemesi tamamlandı. Canlı paket erişimi açılmadı.' : fulfilled ? 'Ödeme ve paket ataması tamamlandı.' : 'Ödemeniz alındı. Paket ataması kurum tarafından tamamlanacak; tekrar ödeme yapmayın.')
        : legacyCompleted ? 'Eski sipariş kaydının tahsilatı doğrulanmalı. Bu kayıt tek başına canlı paket erişimi açmaz.'
        : order.providerFraudStatus === 0 ? 'Ödeme sağlayıcısının incelemesi bekleniyor.'
        : order.reconciliationError ? 'Ödeme sonucu henüz doğrulanamadı. Yeni ödeme açmadan önce tekrar doğrulayın.'
        : order.status === OrderStatus.PENDING ? 'Ödeme henüz tamamlanmadı.' : order.status === OrderStatus.CANCELLED ? 'Bekleyen yerel sipariş kapatıldı. Bu işlem bankadan ödeme iptali veya para iadesi yapmaz.' : 'Ödeme tamamlanamadı.',
      orderId: identifier(order), fulfillmentStatus: order.fulfillmentStatus || (fulfilled ? FulfillmentStatus.FULFILLED : FulfillmentStatus.PENDING) };
  }

  async callbackFailure(token: string) {
    const order = typeof token === 'string' ? await this.orderModel.findOne({ iyzicoToken: token }).exec() : null;
    return order ? this.callbackResponse(order) : { status: 'failure' };
  }

  getFrontendResultUrl(result: { status: string; orderId?: string; message?: string }) {
    const base = this.publicUrl(this.config('FRONTEND_URL'), this.providerMode() === 'sandbox');
    if (!base) throw new ServiceUnavailableException('Ödeme dönüş adresi yapılandırılmamış.');
    const url = new URL('/payment/result', base);
    url.searchParams.set('status', result.status);
    if (result.orderId) url.searchParams.set('orderId', result.orderId);
    return url.toString();
  }

  async reconcileOrder(orderId: string) {
    if (!Types.ObjectId.isValid(orderId)) throw new BadRequestException('Geçersiz sipariş.');
    const order = await this.orderModel.findById(orderId).select('+iyzicoToken').exec();
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    if (order.status === OrderStatus.COMPLETED) return this.callbackResponse(await this.fulfillOrder(order));
    if (!order.iyzicoToken) throw new ConflictException('Bu sipariş için sağlayıcıda oluşturulmuş ödeme oturumu yok. Yeni ödeme başlatabilirsiniz.');
    return this.handleCallback(order.iyzicoToken);
  }

  private async scopedOrder(userId: string, orderId: string, includePrivate = false) {
    if (!Types.ObjectId.isValid(orderId)) throw new BadRequestException('Geçersiz sipariş.');
    const { actor, filter } = await this.viewerScope(userId);
    const query = this.orderModel.findOne({ $and: [{ _id: orderId }, filter] } as any)
      .populate('package').populate('beneficiary', 'firstName lastName');
    if (includePrivate) query.select('+iyzicoToken +paymentPageUrl +refundReason');
    const order = await query.exec();
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    return { actor, order };
  }

  private publicOrder(order: any, actorId?: string, admin = false) {
    const raw = order.toObject?.() || order;
    const fields = ['_id', 'user', 'beneficiary', 'package', 'amount', 'currency', 'paymentEnvironment', 'packageName', 'packageDescription', 'packageSubtitle', 'packageFeatures', 'packagePeriod', 'packageGradePolicy', 'sellerSnapshot', 'termsVersion',
      'termsAcceptedAt', 'privacyAcceptedAt', 'privacyVersion', 'salesAgreementAcceptedAt', 'salesAgreementVersion', 'preInformationVersion',
      'gradeIds', 'status', 'paidAt', 'createdAt', 'updatedAt', 'checkoutExpiresAt', 'checkoutInitializedAt', 'accessStartsAt', 'validUntil',
      'fulfillmentAt', 'fulfillmentStatus', 'fulfillmentAttempts', 'fulfillmentError', 'providerPaymentStatus', 'providerFraudStatus',
      'providerVerifiedAt', 'providerPaidPrice', 'lastReconciledAt', 'reconciliationError', 'cancelledAt', 'failureCode',
      'refundRequestStatus', 'refundRequestedAt'];
    const result: Record<string, any> = Object.fromEntries(fields.filter((key) => raw[key] !== undefined).map((key) => [key, raw[key]]));
    const owner = !!actorId && identifier(order.user) === actorId;
    const expired = !order.checkoutExpiresAt || new Date(order.checkoutExpiresAt).getTime() <= Date.now();
    const paid = order.status === OrderStatus.COMPLETED;
    const fulfilled = !!order.fulfillmentAt || order.fulfillmentStatus === FulfillmentStatus.FULFILLED;
    const envMatches = !order.paymentEnvironment || order.paymentEnvironment === this.providerMode();
    result.fulfillmentStatus = order.fulfillmentStatus || (fulfilled ? FulfillmentStatus.FULFILLED : FulfillmentStatus.PENDING);
    result.refundRequestStatus = order.refundRequestStatus || 'NONE';
    result.checkoutExpired = expired;
    result.canReconcile = paid ? order.paymentEnvironment === 'live' && !!order.providerVerifiedAt && !!order.iyzicoPaymentId && order.providerFraudStatus === 1 && !fulfilled : !!order.checkoutInitializedAt && envMatches;
    result.canCancel = owner && order.status === OrderStatus.PENDING && order.providerPaymentStatus !== 'SUCCESS';
    result.canResume = owner && order.status === OrderStatus.PENDING && order.providerPaymentStatus !== 'SUCCESS' && !expired && !!order.checkoutInitializedAt && envMatches && this.checkoutEnabled();
    result.canRequestRefund = owner && paid && order.paymentEnvironment === 'live' && !!order.providerVerifiedAt && !!order.iyzicoPaymentId && order.providerFraudStatus === 1 && order.refundRequestStatus !== 'REQUESTED';
    if (admin) {
      result.iyzicoPaymentId = order.iyzicoPaymentId;
      result.iyzicoPaymentTransactionId = order.iyzicoPaymentTransactionId;
      result.cancelledBy = order.cancelledBy;
      result.refundRequestedBy = order.refundRequestedBy;
    }
    if ((owner || admin) && order.refundReason) result.refundReason = order.refundReason;
    return result;
  }

  async getOrderForUser(userId: string, orderId: string) {
    const { actor, order } = await this.scopedOrder(userId, orderId, true);
    return this.publicOrder(order, identifier(actor));
  }

  async reconcileForUser(userId: string, orderId: string) {
    const { actor } = await this.scopedOrder(userId, orderId, true);
    const result = await this.reconcileOrder(orderId);
    const order = await this.orderModel.findById(orderId).populate('package').populate('beneficiary', 'firstName lastName').exec();
    return { ...result, order: this.publicOrder(order, identifier(actor)) };
  }

  async resumeOrder(userId: string, orderId: string) {
    this.assertReady();
    const { order } = await this.scopedOrder(userId, orderId, true);
    if (identifier(order.user) !== userId) throw new ForbiddenException('Ödeme oturumunu yalnızca siparişi başlatan alıcı sürdürebilir.');
    if (order.status !== OrderStatus.PENDING || order.providerPaymentStatus === 'SUCCESS' || !order.paymentPageUrl || !order.checkoutExpiresAt || new Date(order.checkoutExpiresAt).getTime() <= Date.now()) throw new ConflictException('Ödeme oturumu devam ettirilemiyor. Önce siparişin durumunu doğrulayın.');
    if (order.paymentEnvironment !== this.providerMode()) throw new ConflictException('Siparişin ödeme ortamı sunucu ile eşleşmiyor.');
    const { beneficiary } = await this.checkoutParties(userId, identifier(order.beneficiary || order.user));
    await this.assertOrderClassScope(order);
    const eligibility = await this.purchaseEligibility(identifier(beneficiary), identifier(order.package));
    if (!eligibility.canPurchase) throw new ConflictException(eligibility.reason);
    return this.checkoutResponse(order);
  }

  async cancelOrder(userId: string, orderId: string) {
    const { actor, order } = await this.scopedOrder(userId, orderId);
    if (identifier(order.user) !== userId) throw new ForbiddenException('Bekleyen siparişi yalnızca ödeyen alıcı kapatabilir.');
    if (![OrderStatus.PENDING, OrderStatus.CANCELLED].includes(order.status) || order.providerPaymentStatus === 'SUCCESS') throw new ConflictException('Tahsilat veya sağlayıcı incelemesi bulunan sipariş kapatılamaz. Durumu doğrulayın veya iade talebi oluşturun.');
    const cancelled = await this.orderModel.findOneAndUpdate({ _id: order._id, status: OrderStatus.PENDING, providerPaymentStatus: { $ne: 'SUCCESS' } }, {
      $set: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), cancelledBy: userId },
    }, { new: true }).populate('package').populate('beneficiary', 'firstName lastName').exec();
    const latest = cancelled || await this.orderModel.findById(order._id).populate('package').populate('beneficiary', 'firstName lastName').exec();
    if (!latest || latest.status !== OrderStatus.CANCELLED) throw new ConflictException('Sipariş durumu bu sırada değişti. Durumu yenileyin ve tekrar doğrulayın.');
    return { order: this.publicOrder(latest, identifier(actor)), message: 'Bekleyen yerel sipariş kapatıldı. Bu işlem bankadan ödeme iptali veya para iadesi yapmaz; açık eski ödeme formunu kullanmayın.' };
  }

  async requestRefund(userId: string, orderId: string, reason: string) {
    const { actor, order } = await this.scopedOrder(userId, orderId, true);
    if (identifier(order.user) !== userId) throw new ForbiddenException('İade talebini yalnızca ödeyen alıcı oluşturabilir.');
    if (order.status !== OrderStatus.COMPLETED || order.paymentEnvironment !== 'live' || !order.providerVerifiedAt || !order.iyzicoPaymentId || order.providerFraudStatus !== 1) throw new ConflictException('Yalnızca doğrulanmış gerçek tahsilatlar için iade talebi oluşturulabilir.');
    const cleanReason = typeof reason === 'string' ? reason.trim() : '';
    if (cleanReason.length < 10 || cleanReason.length > 1000) throw new BadRequestException('İade açıklaması 10–1000 karakter olmalı.');
    await this.orderModel.updateOne({ _id: order._id, status: OrderStatus.COMPLETED, refundRequestStatus: { $ne: 'REQUESTED' } }, {
      $set: { refundRequestStatus: 'REQUESTED', refundRequestedAt: new Date(), refundRequestedBy: userId, refundReason: cleanReason },
    }).exec();
    const saved = await this.orderModel.findById(order._id).select('+refundReason').populate('package').populate('beneficiary', 'firstName lastName').exec();
    return { order: this.publicOrder(saved, identifier(actor)), message: 'İade talebiniz kurum incelemesine alındı. Henüz para iadesi yapılmadı.' };
  }

  private async paginatedOrders(filter: Record<string, any>, options: UserOrdersQueryDto, actorId?: string, admin = false) {
    const page = options.page || 1;
    const pageSize = options.pageSize || (admin ? 20 : 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new BadRequestException('Geçersiz sayfalama.');
    const [orders, total, totals] = await Promise.all([
      this.orderModel.find(filter as any).select(admin ? '+refundReason' : '').populate('package').populate('beneficiary', 'firstName lastName')
        .populate('user', admin ? 'firstName lastName email' : 'firstName lastName')
        .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).exec(),
      this.orderModel.countDocuments(filter as any).exec(),
      this.orderModel.aggregate([{ $match: filter }, { $group: {
        _id: null, totalOrders: { $sum: 1 },
        completedOrders: { $sum: { $cond: [{ $eq: ['$status', OrderStatus.COMPLETED] }, 1, 0] } },
        pendingOrders: { $sum: { $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0] } },
        failedOrders: { $sum: { $cond: [{ $eq: ['$status', OrderStatus.FAILED] }, 1, 0] } },
        cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0] } },
        liveCents: { $sum: { $cond: [{ $and: [{ $eq: ['$status', OrderStatus.COMPLETED] }, { $eq: ['$paymentEnvironment', 'live'] }, { $eq: ['$providerFraudStatus', 1] }, { $eq: [{ $type: '$providerVerifiedAt' }, 'date'] }, { $eq: [{ $type: '$iyzicoPaymentId' }, 'string'] }, { $eq: [{ $type: '$paidAt' }, 'date'] }] }, { $round: [{ $multiply: [{ $ifNull: ['$providerPaidPrice', '$amount'] }, 100] }, 0] }, 0] } },
        sandboxCents: { $sum: { $cond: [{ $and: [{ $eq: ['$status', OrderStatus.COMPLETED] }, { $eq: ['$paymentEnvironment', 'sandbox'] }, { $eq: ['$providerFraudStatus', 1] }, { $eq: [{ $type: '$providerVerifiedAt' }, 'date'] }, { $eq: [{ $type: '$iyzicoPaymentId' }, 'string'] }, { $eq: [{ $type: '$paidAt' }, 'date'] }] }, { $round: [{ $multiply: ['$amount', 100] }, 0] }, 0] } },
        fulfillmentPending: { $sum: { $cond: [{ $and: [{ $eq: ['$status', OrderStatus.COMPLETED] }, { $eq: ['$paymentEnvironment', 'live'] }, { $eq: ['$providerFraudStatus', 1] }, { $eq: [{ $type: '$providerVerifiedAt' }, 'date'] }, { $eq: [{ $type: '$iyzicoPaymentId' }, 'string'] }, { $eq: [{ $type: '$paidAt' }, 'date'] }, { $ne: ['$fulfillmentStatus', FulfillmentStatus.FULFILLED] }] }, 1, 0] } },
        refundRequests: { $sum: { $cond: [{ $eq: ['$refundRequestStatus', 'REQUESTED'] }, 1, 0] } },
      } }]).exec(),
    ]);
    const row = totals[0] || {};
    const summary = { totalOrders: row.totalOrders || 0, completedOrders: row.completedOrders || 0, pendingOrders: row.pendingOrders || 0,
      failedOrders: row.failedOrders || 0, cancelledOrders: row.cancelledOrders || 0, liveRevenue: (row.liveCents || 0) / 100,
      sandboxRevenue: (row.sandboxCents || 0) / 100, fulfillmentPending: row.fulfillmentPending || 0, refundRequests: row.refundRequests || 0 };
    return { items: orders.map((order) => this.publicOrder(order, actorId, admin)), pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }, summary, summaryScope: 'matchingFilters' };
  }

  async getUserOrders(userId: string, options: UserOrdersQueryDto = {}) {
    const { actor, filter } = await this.viewerScope(userId, options.studentId);
    return this.paginatedOrders({ $and: [filter, ...(options.status ? [{ status: options.status }] : [])] }, options, identifier(actor));
  }

  async getActivePackage(userId: string, options: ActivePackageQueryDto = {}) {
    const { actor, students } = await this.currentStudents(userId);
    const studentId = actor.role === UserRole.STUDENT ? userId : options.studentId;
    if (!studentId) return null;
    if (!students.some((student) => identifier(student) === studentId)) throw new ForbiddenException('Bu öğrenciye erişiminiz yok.');
    const order = await this.orderModel.findOne(this.activeOrderFilter(studentId) as any).populate('package').sort({ paidAt: -1, _id: -1 }).exec();
    return order ? { order: this.publicOrder(order, identifier(actor)), package: order.package } : null;
  }

  async getAllOrders(options: AdminOrdersQueryDto = {}) {
    const filter: Record<string, any> = {};
    if (options.status) filter.status = options.status;
    if (options.studentId) filter.beneficiary = new Types.ObjectId(options.studentId);
    if (options.environment) filter.paymentEnvironment = options.environment === 'legacy' ? { $exists: false } : options.environment;
    if (options.from || options.to) {
      const from = options.from ? new Date(`${options.from}T00:00:00.000+03:00`) : undefined;
      const to = options.to ? new Date(`${options.to}T00:00:00.000+03:00`) : undefined;
      if ((from && !Number.isFinite(from.getTime())) || (to && !Number.isFinite(to.getTime())) || (from && to && from > to)) throw new BadRequestException('Geçersiz tarih aralığı.');
      if (to) to.setUTCDate(to.getUTCDate() + 1);
      filter.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) };
    }
    if (options.q?.trim()) {
      const search = escapedSearch(options.q.trim());
      const nameTerms = options.q.trim().split(/\s+/).filter(Boolean).map(escapedSearch);
      const people = await this.userModel.find({ $and: nameTerms.map((term) => ({ $or: [{ firstName: term }, { lastName: term }, { email: term }] })) }).select('_id').lean().exec();
      const ids = people.map((person) => person._id);
      filter.$or = [{ packageName: search }, { iyzicoPaymentId: search }, { user: { $in: ids } }, { beneficiary: { $in: ids } }];
      if (Types.ObjectId.isValid(options.q.trim())) filter.$or.push({ _id: new Types.ObjectId(options.q.trim()) });
    }
    return this.paginatedOrders(filter, options, undefined, true);
  }

  async getAdminOrder(orderId: string) {
    if (!Types.ObjectId.isValid(orderId)) throw new BadRequestException('Geçersiz sipariş.');
    const order = await this.orderModel.findById(orderId).select('+refundReason').populate('package').populate('user', 'firstName lastName email')
      .populate('beneficiary', 'firstName lastName').exec();
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    return this.publicOrder(order, undefined, true);
  }
}
