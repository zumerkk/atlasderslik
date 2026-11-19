import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@repo/shared';
import { Types } from 'mongoose';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';

const actorId = '507f1f77bcf86cd799439011';
const packageId = '507f1f77bcf86cd799439012';
const draftId = '507f1f77bcf86cd799439014';
const gradeId = '507f1f77bcf86cd799439013';
const query = (value: any) => { const q: any = { exec: jest.fn().mockResolvedValue(value) }; for (const key of ['select', 'lean', 'sort']) q[key] = jest.fn().mockReturnValue(q); return q; };

describe('Packages HTTP visibility and fresh administrative authorization', () => {
  let app: INestApplication;
  let currentRole: string;
  let activeAccount: boolean;
  const published = { _id: new Types.ObjectId(packageId), name: 'Matematik Paketi', description: 'Sınıf seviyesine uygun matematik eğitimi.', price: 100, originalPrice: 0, gradeIds: [new Types.ObjectId(gradeId)], isActive: true, period: 'monthly', features: [], __v: 0 };
  const draft = { ...published, _id: new Types.ObjectId(draftId), name: 'Yayınlanmamış Taslak', isActive: false };
  const packages = {
    find: jest.fn(() => query([published, draft])),
    findOne: jest.fn((filter: any) => query(String(filter._id) === packageId ? published : draft)),
    findById: jest.fn(() => query(published)), create: jest.fn(), findOneAndUpdate: jest.fn(),
  };

  beforeAll(async () => {
    const users = { findById: jest.fn(() => query({ _id: actorId, role: currentRole, isActive: activeAccount })) };
    const grades = { find: jest.fn(() => query([{ _id: new Types.ObjectId(gradeId), level: 8, isActive: true }])) };
    const service = new PackagesService(packages as any, grades as any, users as any);
    const module = await Test.createTestingModule({ controllers: [PackagesController], providers: [{ provide: PackagesService, useValue: service }] })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate(context: any) {
        const req = context.switchToHttp().getRequest();
        if (!req.headers.authorization) throw new UnauthorizedException();
        req.user = { userId: actorId, role: req.headers['x-stale-role'] || UserRole.ADMIN };
        return true;
      } }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));
    await app.init();
  });
  beforeEach(() => { currentRole = UserRole.ADMIN; activeAccount = true; jest.clearAllMocks(); });
  afterAll(async () => { await app.close(); });

  it('exposes only sellable active offers on both anonymous catalog routes', async () => {
    for (const path of ['/packages', '/packages/active']) {
      const response = await request(app.getHttpServer()).get(path).expect(200);
      expect(response.body.map((pkg: any) => pkg._id)).toEqual([packageId]);
      expect(response.body[0]).not.toHaveProperty('__v');
    }
  });
  it('protects the static admin route before the public package-id route', async () => {
    await request(app.getHttpServer()).get('/packages/admin').expect(401);
    expect(packages.find).not.toHaveBeenCalled();
  });
  it('rejects a stale administrator JWT after the database role changes', async () => {
    currentRole = UserRole.TEACHER;
    await request(app.getHttpServer()).get('/packages/admin').set('Authorization', 'Bearer stale-admin').set('x-stale-role', UserRole.ADMIN).expect(403);
    expect(packages.find).not.toHaveBeenCalled();
  });
  it('uses the current database role rather than an outdated low-privilege JWT claim', async () => {
    const response = await request(app.getHttpServer()).get('/packages/admin').set('Authorization', 'Bearer signed-token').set('x-stale-role', UserRole.STUDENT).expect(200);
    expect(response.body.map((pkg: any) => pkg._id)).toEqual([packageId, draftId]);
  });
  it('rejects a disabled administrator before reading draft details', async () => {
    activeAccount = false;
    await request(app.getHttpServer()).get(`/packages/admin/${packageId}`).set('Authorization', 'Bearer signed-token').expect(401);
    expect(packages.findById).not.toHaveBeenCalled();
  });
  it('returns 404 for malformed or unpublished public package detail', async () => {
    await request(app.getHttpServer()).get('/packages/not-an-id').expect(404);
    await request(app.getHttpServer()).get(`/packages/${draftId}`).expect(404);
  });
  it('rejects injected update operators and prototype fields through the real JSON pipeline', async () => {
    await request(app.getHttpServer()).patch(`/packages/${packageId}`).set('Authorization', 'Bearer signed-token').send({ $set: { price: 0.01 } }).expect(400);
    await request(app.getHttpServer()).post('/packages').set('Authorization', 'Bearer signed-token').set('Content-Type', 'application/json').send('{"name":"Injected","description":"Geçerli görünen açıklama.","price":100,"__proto__":{"isActive":true}}').expect(400);
    expect(packages.create).not.toHaveBeenCalled(); expect(packages.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('keeps the legacy unverified-purchase endpoint closed', async () => {
    await request(app.getHttpServer()).post('/packages/purchase').set('Authorization', 'Bearer signed-token').send({ packageId }).expect(410);
    expect(packages.create).not.toHaveBeenCalled();
  });
});
