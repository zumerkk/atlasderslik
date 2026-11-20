import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@repo/shared';
import { Types } from 'mongoose';
import { PackagesService } from './packages.service';

const adminId = '507f1f77bcf86cd799439011';
const packageId = '507f1f77bcf86cd799439012';
const gradeId = '507f1f77bcf86cd799439013';
const secondGradeId = '507f1f77bcf86cd799439014';
const query = (value: any) => { const q: any = { exec: jest.fn().mockResolvedValue(value) }; for (const key of ['select', 'lean', 'sort']) q[key] = jest.fn().mockReturnValue(q); return q; };
const model = () => ({
  find: jest.fn((_filter?: any) => query([])), findOne: jest.fn((_filter?: any) => query(null)), findById: jest.fn((_id?: any) => query(null)),
  create: jest.fn(async (data: any) => ({ _id: new Types.ObjectId(packageId), ...data })),
  findOneAndUpdate: jest.fn((_filter?: any, _update?: any, _options?: any) => query(null)),
  exists: jest.fn().mockResolvedValue(null), deleteOne: jest.fn(), findByIdAndDelete: jest.fn(),
});
const payload = () => ({ name: 'Atlas Matematik', description: 'Sınıf seviyesine uygun canlı matematik dersleri.', price: 125.50 });
const stored = () => ({ _id: new Types.ObjectId(packageId), ...payload(), subtitle: '', price: 100, originalPrice: 200, features: ['Canlı ders'], badge: '', sortOrder: 0, period: 'monthly', isActive: true, gradeIds: [new Types.ObjectId(gradeId)], __v: 0 });

describe('PackagesService catalogue and administrative invariants', () => {
  let service: PackagesService;
  let packages: ReturnType<typeof model>, grades: ReturnType<typeof model>, users: ReturnType<typeof model>;
  beforeEach(() => {
    packages = model(); grades = model(); users = model();
    users.findById.mockReturnValue(query({ _id: new Types.ObjectId(adminId), role: UserRole.ADMIN, isActive: true }));
    grades.find.mockReturnValue(query([{ _id: new Types.ObjectId(gradeId), level: 8, isActive: true }]));
    packages.findById.mockReturnValue(query(stored()));
    packages.findOne.mockReturnValue(query(stored()));
    packages.findOneAndUpdate.mockImplementation((_filter, update) => query({ ...stored(), ...update.$set, __v: 1 }));
    service = new PackagesService(packages as any, grades as any, users as any);
  });

  it('creates a normalized draft by default without silently selling an unassigned package', async () => {
    const result = await service.create({ ...payload(), name: '  Atlas Matematik  ', features: ['  Canlı ders  '] }, adminId);
    expect(result).toMatchObject({ name: 'Atlas Matematik', features: ['Canlı ders'], price: 125.5, originalPrice: 0, period: 'monthly', gradePolicy: 'fixed', isActive: false, gradeIds: [] });
    expect(grades.find).not.toHaveBeenCalled();
  });

  it.each([0, -1, 125.555, NaN, Infinity, 10_000_000, '125.50', null, { $gt: 0 }])('rejects malformed or unsafe price %p', async price => {
    await expect(service.create({ ...payload(), price }, adminId)).rejects.toBeInstanceOf(BadRequestException);
    expect(packages.create).not.toHaveBeenCalled();
  });

  it.each([0.01, 9999999.99])('accepts a valid two-decimal boundary price %p', async price => {
    expect((await service.create({ ...payload(), price }, adminId)).price).toBe(price);
  });

  it.each([0, 100, 99.99, 100.001, -1, '200'])('checks discount price %p against the complete merged package', async originalPrice => {
    if (originalPrice === 0) {
      expect((await service.update(packageId, { originalPrice }, adminId)).originalPrice).toBe(0);
    } else {
      await expect(service.update(packageId, { originalPrice }, adminId)).rejects.toBeInstanceOf(BadRequestException);
      expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
    }
  });

  it('rejects a price edit that exceeds the existing advertised original price', async () => {
    await expect(service.update(packageId, { price: 200 }, adminId)).rejects.toThrow('İndirimsiz fiyat satış fiyatından büyük');
    expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([
    { name: ' ' }, { name: 'x'.repeat(121) }, { description: 'short' }, { description: 'x'.repeat(4001) }, { subtitle: 'x'.repeat(181) },
    { badge: 'x'.repeat(51) }, { features: [''] }, { features: ['valid', { $ne: '' }] }, { features: Array.from({ length: 31 }, (_, i) => `feature ${i}`) },
    { features: ['same', ' same '] }, { features: ['x'.repeat(181)] }, { isActive: 'true' }, { isActive: null }, { sortOrder: 0.5 }, { sortOrder: -1 }, { sortOrder: 10001 }, { period: 'weekly' },
    { gradeIds: 'bad' }, { gradeIds: [{ $gt: '' }] }, { gradeIds: ['not-an-id'] }, { gradeIds: [gradeId, gradeId.toUpperCase()] },
    { gradePolicy: 'all-grades' }, { gradePolicy: null }, { gradePolicy: { $ne: 'fixed' } },
  ])('rejects invalid create and patch fields %p', async fields => {
    await expect(service.create({ ...payload(), ...fields }, adminId)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update(packageId, fields, adminId)).rejects.toBeInstanceOf(BadRequestException);
    expect(packages.create).not.toHaveBeenCalled(); expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([null, [], 'text', { unknown: true }, { $set: { price: 1 } }, { 'price.$ne': 0 }, JSON.parse('{"__proto__":{"isActive":true}}'), { constructor: { prototype: { isActive: true } } }])('rejects unknown fields, object operators and malformed bodies %p', async body => {
    await expect(service.create(body, adminId)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update(packageId, body, adminId)).rejects.toBeInstanceOf(BadRequestException);
    expect(packages.create).not.toHaveBeenCalled(); expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an empty update rather than modifying its revision', async () => {
    await expect(service.update(packageId, {}, adminId)).rejects.toBeInstanceOf(BadRequestException);
    expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('requires a real active same-level class set before activation', async () => {
    packages.findById.mockReturnValue(query({ ...stored(), isActive: false, gradeIds: [] }));
    await expect(service.update(packageId, { isActive: true }, adminId)).rejects.toThrow('en az bir aktif sınıf');
    for (const selected of [[], [{ _id: gradeId, level: 8, isActive: false }], [{ _id: gradeId, level: 13, isActive: true }], [{ _id: gradeId, level: 8, isActive: true }, { _id: secondGradeId, level: 7, isActive: true }]]) {
      grades.find.mockReturnValue(query(selected));
      await expect(service.create({ ...payload(), isActive: true, gradeIds: [gradeId, secondGradeId] }, adminId)).rejects.toThrow('gerçek, aktif ve aynı sınıf seviyesinde');
    }
    expect(packages.create).not.toHaveBeenCalled(); expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('permits multiple branches at one valid level and canonicalizes class IDs', async () => {
    grades.find.mockReturnValue(query([{ _id: gradeId, level: 8, isActive: true }, { _id: secondGradeId, level: 8, isActive: true }]));
    const result = await service.create({ ...payload(), isActive: true, gradeIds: [gradeId.toUpperCase(), secondGradeId] }, adminId);
    expect(result.isActive).toBe(true); expect(result.gradeIds.map(String)).toEqual([gradeId, secondGradeId]);
  });

  it('publishes a student-level package with one explicitly configured class per level', async () => {
    const configured = Array.from({ length: 8 }, (_, index) => ({ _id: new Types.ObjectId(), level: index + 1, isActive: true }));
    const gradeIds = configured.map(grade => String(grade._id)); grades.find.mockReturnValue(query(configured));
    const result = await service.create({ ...payload(), isActive: true, gradePolicy: 'student-level', gradeIds }, adminId);
    expect(result).toMatchObject({ gradePolicy: 'student-level', isActive: true, gradeIds });
    packages.find.mockReturnValue(query([{ ...stored(), gradePolicy: 'student-level', gradeIds }]));
    expect(await service.findActive()).toMatchObject([{ gradePolicy: 'student-level', gradeIds }]);
  });

  it('allows explicit partial level coverage without inventing classes for missing levels', async () => {
    grades.find.mockReturnValue(query([{ _id: gradeId, level: 6, isActive: true }, { _id: secondGradeId, level: 8, isActive: true }]));
    expect(await service.create({ ...payload(), isActive: true, gradePolicy: 'student-level', gradeIds: [gradeId, secondGradeId] }, adminId))
      .toMatchObject({ gradePolicy: 'student-level', gradeIds: [gradeId, secondGradeId] });
    expect(packages.create).toHaveBeenCalledTimes(1);
  });

  it.each(['empty', 'duplicate-level', 'inactive', 'missing', 'out-of-range'])('rejects unsafe student-level mapping %s and withholds it publicly', async issue => {
    let selected = [{ _id: gradeId, level: 6, isActive: true }, { _id: secondGradeId, level: 8, isActive: true }];
    const gradeIds = issue === 'empty' ? [] : [gradeId, secondGradeId];
    if (issue === 'duplicate-level') selected[1].level = 6;
    if (issue === 'inactive') selected[1].isActive = false;
    if (issue === 'missing') selected = selected.slice(0, 1);
    if (issue === 'out-of-range') selected[1].level = 9;
    grades.find.mockReturnValue(query(selected));
    await expect(service.create({ ...payload(), isActive: true, gradePolicy: 'student-level', gradeIds }, adminId)).rejects.toBeInstanceOf(BadRequestException);
    packages.find.mockReturnValue(query([{ ...stored(), gradePolicy: 'student-level', gradeIds }]));
    expect(await service.findActive()).toEqual([]); expect(packages.create).not.toHaveBeenCalled();
  });

  it('validates a policy edit against the complete existing class mapping', async () => {
    const current = { ...stored(), gradePolicy: 'student-level', gradeIds: [gradeId, secondGradeId] };
    packages.findById.mockReturnValue(query(current));
    grades.find.mockReturnValue(query([{ _id: gradeId, level: 6, isActive: true }, { _id: secondGradeId, level: 8, isActive: true }]));
    await expect(service.update(packageId, { gradePolicy: 'fixed' }, adminId)).rejects.toThrow('aynı sınıf seviyesinde');
    expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
    expect(await service.update(packageId, { name: 'Yeni Paket Adı' }, adminId)).toMatchObject({ gradePolicy: 'student-level' });
  });

  it.each([9, 10, 11, 12])('withholds grade %i offers that the payment flow cannot accept', async level => {
    grades.find.mockReturnValue(query([{ _id: new Types.ObjectId(gradeId), level, isActive: true }]));
    await expect(service.create({ ...payload(), isActive: true, gradeIds: [gradeId] }, adminId)).rejects.toThrow('(1–8)');
    await expect(service.update(packageId, { isActive: true }, adminId)).rejects.toThrow('(1–8)');
    packages.find.mockReturnValue(query([stored()]));
    expect(await service.findActive()).toEqual([]);
    await expect(service.findOne(packageId)).rejects.toBeInstanceOf(NotFoundException);
    expect(packages.create).not.toHaveBeenCalled(); expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([UserRole.STUDENT, UserRole.PARENT, UserRole.TEACHER, UserRole.SUPPORT_AGENT])('denies every administrative operation when the current DB role is %s', async role => {
    users.findById.mockReturnValue(query({ _id: adminId, role, isActive: true }));
    for (const operation of [() => service.create(payload(), adminId), () => service.findAll(adminId), () => service.findAdminOne(packageId, adminId), () => service.update(packageId, { name: 'Edited' }, adminId), () => service.remove(packageId, adminId)]) await expect(operation()).rejects.toBeInstanceOf(ForbiddenException);
    expect(packages.create).not.toHaveBeenCalled(); expect(packages.find).not.toHaveBeenCalled(); expect(packages.findById).not.toHaveBeenCalled();
  });

  it.each([null, { _id: adminId, role: UserRole.ADMIN, isActive: false }])('rejects disabled or missing administrators despite an existing JWT', async user => {
    users.findById.mockReturnValue(query(user));
    await expect(service.findAll(adminId)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.update(packageId, { name: 'Edited' }, adminId)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(packages.find).not.toHaveBeenCalled(); expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('keeps drafts and archived records available only through the freshly authorized admin list', async () => {
    const drafts = [stored(), { ...stored(), isActive: false }]; packages.find.mockReturnValue(query(drafts));
    expect(await service.findAll(adminId)).toEqual(drafts);
    expect(packages.find).toHaveBeenCalledWith({});
  });

  it('excludes drafts, archived, malformed, mixed-level and unassigned offers from the public catalog', async () => {
    const valid = stored();
    const records = [valid, { ...stored(), isActive: false }, { ...stored(), price: 1.111 }, { ...stored(), gradeIds: [] }, { ...stored(), gradeIds: [gradeId, secondGradeId] }];
    packages.find.mockReturnValue(query(records));
    grades.find.mockReturnValue(query([{ _id: gradeId, level: 8, isActive: true }, { _id: secondGradeId, level: 7, isActive: true }]));
    const result = await service.findActive();
    expect(result).toHaveLength(1); expect(result[0]).toMatchObject({ _id: valid._id, isActive: true, price: 100 }); expect(result[0]).not.toHaveProperty('__v');
    expect(packages.find).toHaveBeenCalledWith({ isActive: true });
  });

  it('withholds an offer publicly if its linked class is later deactivated', async () => {
    grades.find.mockReturnValue(query([]));
    await expect(service.findOne(packageId)).rejects.toBeInstanceOf(NotFoundException);
    expect(packages.findOne).toHaveBeenCalledWith({ _id: new Types.ObjectId(packageId), isActive: true });
  });

  it.each(['bad-id', '507f1f77bcf86cd79943901', 'x'.repeat(24)])('uses 404 for invalid package id %s before a package query', async id => {
    await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findAdminOne(id, adminId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(id, { name: 'Edited' }, adminId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(id, adminId)).rejects.toBeInstanceOf(NotFoundException);
    expect(packages.findOne).not.toHaveBeenCalled(); expect(packages.findById).not.toHaveBeenCalled();
  });

  it('returns 404 for a record missing before or during an update', async () => {
    packages.findById.mockReturnValueOnce(query(null));
    await expect(service.update(packageId, { name: 'Edited' }, adminId)).rejects.toBeInstanceOf(NotFoundException);
    packages.findOneAndUpdate.mockReturnValue(query(null)); packages.exists.mockResolvedValue(null);
    await expect(service.update(packageId, { name: 'Edited' }, adminId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a stale revision so parallel valid edits cannot combine into an invalid price pair', async () => {
    let live = stored();
    packages.findById.mockImplementation(() => query({ ...live, gradeIds: [...live.gradeIds] }));
    packages.findOneAndUpdate.mockImplementation((filter, update) => {
      if (filter.__v !== live.__v) return query(null);
      live = { ...live, ...update.$set, __v: live.__v + 1 }; return query({ ...live });
    });
    packages.exists.mockResolvedValue({ _id: live._id });
    const results = await Promise.allSettled([service.update(packageId, { price: 190 }, adminId), service.update(packageId, { originalPrice: 150 }, adminId)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((results.find(result => result.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);
    expect(live.originalPrice).toBeGreaterThan(live.price);
  });

  it('updates package price and class references while retaining the purchased snapshot values', async () => {
    const prior = stored();
    const purchase = Object.freeze({ amount: prior.price, packageName: prior.name, packagePeriod: prior.period, gradeIds: Object.freeze([...prior.gradeIds]) });
    const originalSnapshot = JSON.stringify(purchase);
    packages.findById.mockReturnValue(query(prior));
    grades.find.mockReturnValue(query([{ _id: secondGradeId, level: 8, isActive: true }]));
    const result = await service.update(packageId, { price: 150, gradeIds: [secondGradeId] }, adminId);
    expect(result).toMatchObject({ price: 150, gradeIds: [secondGradeId] });
    expect(JSON.stringify(purchase)).toBe(originalSnapshot); expect(prior.gradeIds.map(String)).toEqual([gradeId]);
    expect(packages.findOneAndUpdate).toHaveBeenCalledWith({ _id: prior._id, __v: 0 }, { $set: expect.objectContaining({ price: 150, gradeIds: [secondGradeId] }), $inc: { __v: 1 } }, { new: true, runValidators: true });
  });

  it('archives even a malformed legacy offer without deleting purchased package references', async () => {
    packages.findById.mockReturnValue(query({ ...stored(), price: 0.001, gradeIds: [] }));
    await service.remove(packageId, adminId);
    expect(packages.findOneAndUpdate).toHaveBeenCalledWith({ _id: new Types.ObjectId(packageId), __v: 0 }, { $set: { isActive: false }, $inc: { __v: 1 } }, { new: true, runValidators: true });
    expect(packages.deleteOne).not.toHaveBeenCalled(); expect(packages.findByIdAndDelete).not.toHaveBeenCalled();
  });
});
