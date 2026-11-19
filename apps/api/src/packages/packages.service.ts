import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model, Types } from 'mongoose';
import { UserRole } from '@repo/shared';
import { Package, PackageDocument } from './schemas/package.schema';
import { Grade, GradeDocument } from '../education/schemas/grade.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatePackageDto, PACKAGE_FIELDS, UpdatePackageDto } from './packages.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectModel(Package.name) private readonly packageModel: Model<PackageDocument>,
    @InjectModel(Grade.name) private readonly gradeModel: Model<GradeDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private packageId(value: string) {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw new NotFoundException('Paket bulunamadı.');
    return new Types.ObjectId(value);
  }

  private async requireAdmin(userId: string) {
    if (typeof userId !== 'string' || !Types.ObjectId.isValid(userId)) throw new UnauthorizedException('Yönetici hesabınızla giriş yapın.');
    const user = await this.userModel.findById(userId).select('_id role isActive').lean().exec();
    if (!user || user.isActive !== true) throw new UnauthorizedException('Aktif bir yönetici hesabıyla giriş yapın.');
    if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(user.role as UserRole)) throw new ForbiddenException('Paket yönetimi için yönetici yetkisi gerekir.');
  }

  private async dto<T extends CreatePackageDto | UpdatePackageDto>(kind: new () => T, data: unknown, partial = false): Promise<T> {
    if (!data || typeof data !== 'object' || Array.isArray(data) || ![Object.prototype, null].includes(Object.getPrototypeOf(data))) throw new BadRequestException('Paket bilgileri geçerli bir nesne olmalıdır.');
    const keys = Object.keys(data);
    if (keys.some(key => !(PACKAGE_FIELDS as readonly string[]).includes(key))) throw new BadRequestException('Paket bilgilerinde izin verilmeyen alan var.');
    if (partial && !keys.length) throw new BadRequestException('Güncellenecek en az bir paket alanı girin.');
    const result = plainToInstance(kind, data, { enableImplicitConversion: false });
    const errors = await validate(result, { whitelist: true, forbidNonWhitelisted: true, skipUndefinedProperties: partial, forbidUnknownValues: true });
    if (errors.length) throw new BadRequestException(errors.flatMap(error => Object.values(error.constraints || {})).slice(0, 5).join(' ') || 'Paket bilgilerini kontrol edin.');
    return result;
  }

  private fields(value: any) {
    return Object.fromEntries(PACKAGE_FIELDS.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
  }

  private storedFields(current: any) {
    const fields = this.fields(current);
    if (Array.isArray(fields.gradeIds)) fields.gradeIds = fields.gradeIds.map(String);
    return fields;
  }

  private async mergedCandidate(data: unknown, current?: any) {
    const patch = current ? await this.dto(UpdatePackageDto, data, true) : undefined;
    const candidate = await this.dto(CreatePackageDto, current ? { ...this.storedFields(current), ...this.fields(patch) } : data);
    if (candidate.originalPrice !== 0 && Math.round(candidate.originalPrice * 100) <= Math.round(candidate.price * 100)) throw new BadRequestException('İndirimsiz fiyat satış fiyatından büyük olmalı; indirim yoksa 0 girin.');
    return candidate;
  }

  private gradesMatch(candidate: CreatePackageDto, grades: any[]) {
    if (!candidate.gradeIds.length) return false;
    const selected = candidate.gradeIds.map(id => grades.find(grade => String(grade._id) === id));
    if (!selected.every(grade => grade && grade.isActive === true && Number.isInteger(grade.level) && grade.level >= 1 && grade.level <= 8)) return false;
    const levels = new Set(selected.map(grade => grade.level));
    return candidate.gradePolicy === 'student-level' ? levels.size === selected.length : levels.size === 1;
  }

  private async requireSaleScope(candidate: CreatePackageDto) {
    if (!candidate.isActive) return;
    if (!candidate.gradeIds.length) throw new BadRequestException('Paketi satışa açmak için en az bir aktif sınıf seçin.');
    const grades = await this.gradeModel.find({ _id: { $in: candidate.gradeIds.map(id => new Types.ObjectId(id)) }, isActive: true }).select('_id level isActive').lean().exec();
    if (!this.gradesMatch(candidate, grades)) throw new BadRequestException(candidate.gradePolicy === 'student-level'
      ? 'Öğrenci seviyesine göre pakette 1–8 aralığındaki her seviye için yalnızca bir gerçek ve aktif sınıf seçilmelidir.'
      : 'Satıştaki paketin tüm sınıfları gerçek, aktif ve aynı sınıf seviyesinde (1–8) olmalıdır.');
  }

  async create(data: unknown, userId: string): Promise<Package> {
    await this.requireAdmin(userId);
    const candidate = await this.mergedCandidate(data);
    await this.requireSaleScope(candidate);
    return this.packageModel.create(this.fields(candidate));
  }

  async findAll(userId: string): Promise<Package[]> {
    await this.requireAdmin(userId);
    return this.packageModel.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean().exec();
  }

  async findAdminOne(id: string, userId: string): Promise<Package> {
    await this.requireAdmin(userId);
    const result = await this.packageModel.findById(this.packageId(id)).lean().exec();
    if (!result) throw new NotFoundException('Paket bulunamadı.');
    return result;
  }

  private async sellable(records: any[]): Promise<Package[]> {
    const candidates: { record: any; candidate: CreatePackageDto }[] = [];
    for (const record of records) {
      if (record.isActive !== true) continue;
      try { candidates.push({ record, candidate: await this.mergedCandidate(this.storedFields(record)) }); }
      catch (error) { if (!(error instanceof BadRequestException)) throw error; }
    }
    const ids = [...new Set(candidates.flatMap(({ candidate }) => candidate.gradeIds))];
    if (!ids.length) return [];
    const grades = await this.gradeModel.find({ _id: { $in: ids.map(id => new Types.ObjectId(id)) }, isActive: true }).select('_id level isActive').lean().exec();
    return candidates.filter(({ candidate }) => this.gradesMatch(candidate, grades)).map(({ record, candidate }) => ({
      _id: record._id, ...this.fields(candidate), createdAt: record.createdAt, updatedAt: record.updatedAt,
    })) as unknown as Package[];
  }

  async findActive(): Promise<Package[]> {
    const records = await this.packageModel.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean().exec();
    return this.sellable(records);
  }

  async findOne(id: string): Promise<Package> {
    const record = await this.packageModel.findOne({ _id: this.packageId(id), isActive: true }).lean().exec();
    const [result] = record ? await this.sellable([record]) : [];
    if (!result) throw new NotFoundException('Paket bulunamadı.');
    return result;
  }

  private revisionFilter(current: any) {
    return { _id: current._id, ...(Number.isInteger(current.__v) ? { __v: current.__v } : { __v: { $exists: false } }) };
  }

  private async writeCurrent(current: any, values: Record<string, unknown>) {
    // Guard the validated revision so concurrent edits cannot create an invalid combination.
    const result = await this.packageModel.findOneAndUpdate(this.revisionFilter(current), { $set: values, $inc: { __v: 1 } }, { new: true, runValidators: true }).exec();
    if (result) return result;
    if (!await this.packageModel.exists({ _id: current._id })) throw new NotFoundException('Paket bulunamadı.');
    throw new ConflictException('Paket başka bir işlemde güncellendi. Listeyi yenileyip yeniden deneyin.');
  }

  async update(id: string, data: unknown, userId: string): Promise<Package> {
    await this.requireAdmin(userId);
    const current = await this.packageModel.findById(this.packageId(id)).lean().exec();
    if (!current) throw new NotFoundException('Paket bulunamadı.');
    const candidate = await this.mergedCandidate(data, current);
    await this.requireSaleScope(candidate);
    // Orders retain their own price, period, class and name snapshots. Only this package is written.
    return this.writeCurrent(current, this.fields(candidate));
  }

  async remove(id: string, userId: string): Promise<Package> {
    await this.requireAdmin(userId);
    const current = await this.packageModel.findById(this.packageId(id)).lean().exec();
    if (!current) throw new NotFoundException('Paket bulunamadı.');
    // Even legacy invalid offers can be archived, retaining purchased references and history.
    return this.writeCurrent(current, { isActive: false });
  }
}
