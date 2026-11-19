import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import { PaymentService } from '../payment/payment.service';
import { CartCheckoutDto, CartItemDto, CartRevisionDto } from './cart.dto';
import { Cart, CartDocument } from './schemas/cart.schema';

type CheckoutContext = Awaited<ReturnType<PaymentService['getCheckoutContext']>>;
type Students = Awaited<ReturnType<PaymentService['getStudents']>>;
const PRIVATE_CART_FIELDS = '+quoteFingerprint +checkoutLeaseId +checkoutLeaseExpiresAt';
const QUOTE_CHANGED = 'Paket fiyatı, kapsamı veya onay metinleri değişti. Sepeti güncelleyerek yeni bilgileri onaylayın.';

@Injectable()
export class CartService implements OnModuleInit {
  private readonly logger = new Logger(CartService.name);
  private indexesReady = false;

  constructor(@InjectModel(Cart.name) private readonly carts: Model<CartDocument>, private readonly payments: PaymentService) {}

  async onModuleInit() {
    try {
      await this.carts.collection.createIndex({ userId: 1 }, { unique: true });
      this.indexesReady = true;
    } catch { this.logger.error('Sepet tekillik indeksi hazırlanamadı. Sepet işlemleri kapalı.'); }
  }

  private async current(userId: string) {
    if (!this.indexesReady) throw new ServiceUnavailableException('Sepet hazırlanamadı. Lütfen tekrar deneyin.');
    try {
      return await this.carts.findOneAndUpdate({ userId }, { $setOnInsert: { userId, revision: 0 } },
        { upsert: true, new: true, runValidators: true }).select(PRIVATE_CART_FIELDS).exec();
    } catch (error: unknown) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 11000) throw error;
      const winner = await this.carts.findOne({ userId }).select(PRIVATE_CART_FIELDS).exec();
      if (winner) return winner;
      throw new ConflictException('Sepet hazırlanıyor. Lütfen yeniden deneyin.');
    }
  }

  private expectedRevision(cart: CartDocument | null, revision: number): asserts cart is CartDocument {
    if (!Number.isSafeInteger(revision) || revision < 0) throw new BadRequestException('Geçerli bir sepet sürümü gerekli.');
    if (!cart || cart.revision !== revision) throw new ConflictException({ message: 'Sepet başka bir işlemle değişti. Güncel sepeti yeniden yükleyin.', code: 'CART_CHANGED' });
  }

  private mutableFilter(cart: CartDocument, userId: string) {
    return { _id: cart._id, userId, revision: cart.revision,
      $or: [{ checkoutLeaseExpiresAt: { $exists: false } }, { checkoutLeaseExpiresAt: { $lte: new Date() } }] };
  }

  private mutationConflict(): never {
    throw new ConflictException({ message: 'Sepet değişti veya ödeme hazırlanıyor. Güncel sepeti yeniden yükleyin.', code: 'CART_CHANGED' });
  }

  private async view(cart: CartDocument, students: Students, knownContext?: CheckoutContext) {
    const common = { id: String(cart._id), revision: cart.revision, students,
      paymentReadiness: this.payments.getPublicReadiness(), merchant: this.payments.getMerchant(),
      legalVersions: this.payments.getLegalVersions(), ...(cart.checkoutOrderId ? { orderId: String(cart.checkoutOrderId) } : {}) };
    if (!cart.packageId || !cart.studentId) return { ...common, item: null, quote: null, quoteChanged: false,
      canPurchase: false, canCheckout: false, reason: 'Sepetinize bir eğitim paketi ekleyin.' };
    try {
      const context = knownContext || await this.payments.getCheckoutContext(String(cart.userId), String(cart.packageId), String(cart.studentId));
      const quoteChanged = !cart.quoteFingerprint || context.quoteHash !== cart.quoteFingerprint;
      const busy = !!cart.checkoutLeaseExpiresAt && cart.checkoutLeaseExpiresAt.getTime() > Date.now();
      const canPurchase = context.eligibility.canPurchase;
      const reason = quoteChanged ? QUOTE_CHANGED : !canPurchase ? context.eligibility.reason
        : busy ? 'Ödeme oturumu hazırlanıyor. Lütfen işlemin tamamlanmasını bekleyin.'
        : !context.payment.canAcceptPayments ? context.payment.message : null;
      return { ...common, item: { package: context.package, student: context.student },
        quote: { amount: Number(context.package.price), currency: 'TRY' as const, period: context.package.period },
        quoteChanged, canPurchase, canCheckout: canPurchase && !quoteChanged && !busy && context.payment.canAcceptPayments, reason };
    } catch (error: unknown) {
      if (!(error instanceof NotFoundException) && !(error instanceof BadRequestException) && !(error instanceof ForbiddenException)) throw error;
      // Removed child relationships never expose another pupil's stored identity.
      const student = students.find(row => row._id === String(cart.studentId)) || null;
      return { ...common, item: { package: { _id: String(cart.packageId), name: cart.quoteSnapshot?.packageName || 'Paket',
        price: cart.quoteSnapshot?.amount, period: cart.quoteSnapshot?.period }, student }, quote: cart.quoteSnapshot
          ? { amount: cart.quoteSnapshot.amount, currency: 'TRY' as const, period: cart.quoteSnapshot.period } : null,
        quoteChanged: true, canPurchase: false, canCheckout: false, reason: error.message };
    }
  }

  async get(userId: string) {
    const students = await this.payments.getStudents(userId);
    const cart = await this.current(userId);
    if (!cart) throw new ServiceUnavailableException('Sepet hazırlanamadı.');
    return this.view(cart, students);
  }

  async put(userId: string, dto: CartItemDto) {
    const students = await this.payments.getStudents(userId);
    const context = await this.payments.getCheckoutContext(userId, dto.packageId, dto.studentId);
    if (!context.student || !context.quoteHash) throw new BadRequestException('Paketin kullanılacağı öğrenciyi seçin.');
    const cart = await this.current(userId);
    this.expectedRevision(cart, dto.revision);
    const updated = await this.carts.findOneAndUpdate(this.mutableFilter(cart, userId), {
      $set: { packageId: dto.packageId, studentId: context.student._id, quoteFingerprint: context.quoteHash,
        quoteSnapshot: { amount: Number(context.package.price), currency: 'TRY', period: context.package.period, packageName: context.package.name } },
      $inc: { revision: 1 }, $unset: { checkoutOrderId: 1, checkoutLeaseId: 1, checkoutLeaseExpiresAt: 1 },
    }, { new: true, runValidators: true }).select(PRIVATE_CART_FIELDS).exec();
    if (!updated) this.mutationConflict();
    return this.view(updated, students, context);
  }

  async clear(userId: string, dto: CartRevisionDto) {
    const students = await this.payments.getStudents(userId);
    const cart = await this.current(userId);
    this.expectedRevision(cart, dto.revision);
    const updated = await this.carts.findOneAndUpdate(this.mutableFilter(cart, userId), {
      $inc: { revision: 1 }, $unset: { packageId: 1, studentId: 1, quoteSnapshot: 1, quoteFingerprint: 1, checkoutOrderId: 1,
        checkoutLeaseId: 1, checkoutLeaseExpiresAt: 1 },
    }, { new: true, runValidators: true }).select(PRIVATE_CART_FIELDS).exec();
    if (!updated) this.mutationConflict();
    return this.view(updated, students);
  }

  async checkout(userId: string, dto: CartCheckoutDto, requestIp: string) {
    await this.payments.getStudents(userId); // Fresh account and parent-role check, independent of the JWT.
    if (dto.termsAccepted !== true || dto.privacyAccepted !== true || dto.salesAgreementAccepted !== true) throw new BadRequestException('Satın alma, gizlilik bildirimi ve satış sözleşmesi onayları gerekli.');
    const cart = await this.current(userId);
    this.expectedRevision(cart, dto.revision);
    if (!cart.packageId || !cart.studentId || !cart.quoteFingerprint) throw new ConflictException('Sepetiniz boş. Önce bir eğitim paketi ekleyin.');
    const context = await this.payments.getCheckoutContext(userId, String(cart.packageId), String(cart.studentId));
    if (context.quoteHash !== cart.quoteFingerprint) throw new ConflictException({ message: QUOTE_CHANGED, code: 'QUOTE_CHANGED' });
    if (!context.eligibility.canPurchase) throw new ConflictException(context.eligibility.reason || 'Bu paket satın alınamıyor.');
    if (!context.payment.canAcceptPayments) throw new ServiceUnavailableException(context.payment.message);
    const leaseId = randomUUID();
    const claimed = await this.carts.findOneAndUpdate({ ...this.mutableFilter(cart, userId), quoteFingerprint: cart.quoteFingerprint }, {
      $set: { checkoutLeaseId: leaseId, checkoutLeaseExpiresAt: new Date(Date.now() + 90000) },
    }, { new: true }).select(PRIVATE_CART_FIELDS).exec();
    if (!claimed) this.mutationConflict();
    try {
      return await this.payments.initializeCheckoutForm(userId, {
        packageId: String(cart.packageId), studentId: String(cart.studentId), quoteHash: cart.quoteFingerprint,
        identityNumber: dto.identityNumber, phone: dto.phone, city: dto.city, address: dto.address,
        termsAccepted: dto.termsAccepted, privacyAccepted: dto.privacyAccepted, salesAgreementAccepted: dto.salesAgreementAccepted,
      }, requestIp, { cartId: String(cart._id), revision: cart.revision, leaseId });
    } finally {
      // An expired worker must not release the lease of a subsequent checkout.
      await this.carts.updateOne({ _id: cart._id, userId, revision: cart.revision, checkoutLeaseId: leaseId }, {
        $unset: { checkoutLeaseId: 1, checkoutLeaseExpiresAt: 1 },
      }).exec();
    }
  }
}
