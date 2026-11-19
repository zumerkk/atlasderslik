import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Types } from 'mongoose';
import { UserRole } from '@repo/shared';
import { FulfillmentStatus as F, OrderStatus as S } from '../packages/schemas/order.schema';
import { PaymentService, normalizeSignaturePrice, packageAccessEnd, paymentSignature } from './payment.service';

jest.mock('iyzipay', () => jest.fn().mockImplementation(() => ({ checkoutFormInitialize: { create: jest.fn() }, checkoutForm: { retrieve: jest.fn() }, refund: { create: jest.fn() } })));
const userId = '507f1f77bcf86cd799439012', parentId = '507f1f77bcf86cd799439015', packageId = '507f1f77bcf86cd799439013', gradeId = '507f1f77bcf86cd799439014', orderId = '507f1f77bcf86cd799439011';
const token = 'checkout-token-1234', secret = 'test-secret-only';
const oid = (value: any): string => String(value?._id || value || '');
const equal = (a: any, b: any): boolean => a instanceof Types.ObjectId || b instanceof Types.ObjectId ? oid(a) === oid(b) : a === b;
function matches(row: any, filter: any): boolean {
  return Object.entries(filter || {}).every(([key, expected]: [string, any]) => {
    if (key === '$and') return expected.every((part: any) => matches(row, part));
    if (key === '$or') return expected.some((part: any) => matches(row, part));
    const actual = row[key];
    if (expected instanceof RegExp) return expected.test(String(actual ?? ''));
    if (!expected || expected instanceof Types.ObjectId || expected instanceof Date || typeof expected !== 'object') return equal(actual, expected);
    return Object.entries(expected).every(([op, value]: [string, any]) => {
      if (op === '$exists') return (actual !== undefined) === value;
      if (op === '$type') return value === 'date' ? actual instanceof Date : typeof actual === value;
      if (op === '$in') return value.some((item: any) => equal(actual, item));
      if (op === '$nin') return !value.some((item: any) => equal(actual, item));
      if (op === '$ne') return !equal(actual, value);
      if (op === '$lte') return actual !== undefined && actual <= value;
      if (op === '$lt') return actual !== undefined && actual < value;
      if (op === '$gte') return actual !== undefined && actual >= value;
      if (op === '$gt') return actual !== undefined && actual > value;
      throw new Error(`Unsupported fixture operator ${op}`);
    });
  });
}
function update(row: any, change: any, inserting = false) {
  if (inserting) Object.assign(row, change.$setOnInsert);
  Object.assign(row, change.$set);
  for (const key of Object.keys(change.$unset || {})) delete row[key];
  for (const [key, amount] of Object.entries(change.$inc || {})) row[key] = (row[key] || 0) + Number(amount);
  for (const [key, value] of Object.entries(change.$addToSet || {})) {
    row[key] ||= [];
    if (!row[key].some((item: any) => JSON.stringify(item) === JSON.stringify(value))) row[key].push(value);
  }
}
function harness() {
  const db: Record<string, any[]> = {
    orders: [], carts: [], users: [{ _id: userId, firstName: 'Test', lastName: 'Öğrenci', email: 'test@example.test', phone: '+905551234567', grade: 8, isActive: true, role: UserRole.STUDENT }],
    packages: [{ _id: packageId, name: 'Atlas Eğitim', price: 99.5, period: 'monthly', gradeIds: [gradeId], isActive: true }],
    grades: [{ _id: gradeId, level: 8, isActive: true }], enrollments: [{ _id: 'manual-row', studentId: userId, gradeId, accessSource: 'manual' }],
  };
  function query(compute: () => any) {
    const options: any = { populated: [] };
    const q: any = { exec: jest.fn(async () => {
      let data = compute();
      if (Array.isArray(data)) {
        if (options.sort) data = [...data].sort((a, b) => { for (const [field, direction] of Object.entries(options.sort)) { if (a[field] < b[field]) return -Number(direction); if (a[field] > b[field]) return Number(direction); } return 0; });
        if (options.skip) data = data.slice(options.skip);
        if (options.limit) data = data.slice(0, options.limit);
      }
      const result = (row: any) => {
        if (row === null || typeof row !== 'object') return row;
        row = { ...row };
        for (const [field, selected] of options.populated) {
          const table = field === 'package' ? db.packages : field === 'gradeId' ? db.grades : db.users;
          const target = table.find((entry) => oid(entry) === oid(row[field]));
          if (target) row[field] = selected ? Object.fromEntries(['_id', ...selected.split(' ')].filter((key) => target[key] !== undefined).map((key) => [key, target[key]])) : { ...target };
        }
        return row;
      };
      return Array.isArray(data) ? data.map(result) : result(data);
    }) };
    for (const method of ['select', 'lean', 'setOptions']) q[method] = jest.fn(() => q);
    q.populate = jest.fn((...args) => { options.populated.push(args); return q; });
    for (const method of ['sort', 'skip', 'limit']) q[method] = jest.fn((value) => { options[method] = value; return q; });
    return q;
  }
  function model(name: string) {
    const rows = db[name];
    const unique = (candidate: any, self?: any) => {
      if (name === 'orders' && rows.some((row) => row !== self && ((candidate.pendingCheckoutKey && row.pendingCheckoutKey === candidate.pendingCheckoutKey) || (candidate.iyzicoPaymentId && candidate.paymentEnvironment && row.paymentEnvironment === candidate.paymentEnvironment && row.iyzicoPaymentId === candidate.iyzicoPaymentId)))) throw { code: 11000 };
    };
    const methods: any = {
      find: jest.fn((filter = {}) => query(() => rows.filter((row) => matches(row, filter)))),
      findOne: jest.fn((filter) => query(() => rows.find((row) => matches(row, filter)) || null)),
      findById: jest.fn((id) => query(() => rows.find((row) => oid(row) === oid(id)) || null)),
      countDocuments: jest.fn((filter) => query(() => rows.filter((row) => matches(row, filter)).length)),
      updateMany: jest.fn((filter, change) => query(() => { rows.filter((row) => matches(row, filter)).forEach((row) => update(row, change)); return {}; })),
      updateOne: jest.fn((filter, change, options = {}) => query(() => {
        let row = rows.find((entry) => matches(entry, filter)); const inserting = !row && options.upsert;
        if (inserting) { row = { ...filter }; rows.push(row); }
        if (!row) return { matchedCount: 0 };
        const next = { ...row }; update(next, change, inserting); unique(next, row); Object.keys(row).forEach((key) => delete row[key]); Object.assign(row, next);
        return { matchedCount: 1, upsertedCount: inserting ? 1 : 0 };
      })),
      findOneAndUpdate: jest.fn((filter, change) => query(() => {
        const row = rows.find((entry) => matches(entry, filter)); if (!row) return null;
        const next = { ...row }; update(next, change); unique(next, row); Object.keys(row).forEach((key) => delete row[key]); Object.assign(row, next); return row;
      })),
      aggregate: jest.fn(() => query(() => [])),
      collection: { createIndex: jest.fn().mockResolvedValue('index'), indexes: jest.fn().mockResolvedValue([]), dropIndex: jest.fn().mockResolvedValue({}) },
    };
    return Object.assign(jest.fn().mockImplementation(function (this: any, data: any) {
      const record = { _id: new Types.ObjectId().toHexString(), createdAt: new Date(), ...data }; Object.assign(this, record);
      this.save = jest.fn(async () => { unique(record); rows.push(record); return record; });
    }), methods);
  }
  return { db, query, orders: model('orders'), carts: model('carts'), users: model('users'), packages: model('packages'), grades: model('grades'), enrollments: model('enrollments') };
}
const pending = (values: any = {}) => ({ _id: orderId, user: userId, beneficiary: userId, package: packageId, amount: 99.5, currency: 'TRY', paymentEnvironment: 'live',
  packagePeriod: 'monthly', packageName: 'Atlas Eğitim', gradeIds: [gradeId], status: S.PENDING, fulfillmentStatus: F.PENDING, checkoutInitializedAt: new Date(),
  checkoutExpiresAt: new Date(Date.now() + 1800000), iyzicoToken: token, paymentPageUrl: 'https://api.iyzipay.com/checkoutform/test', pendingCheckoutKey: `live:${userId}:${packageId}`, createdAt: new Date(), ...values });
const paid = (values: any = {}) => pending({ status: S.COMPLETED, providerVerifiedAt: new Date(), providerFraudStatus: 1, iyzicoPaymentId: '12345',
  iyzicoPaymentTransactionId: 'transaction-12345', providerPaidPrice: 99.5, paidAt: new Date(), accessStartsAt: new Date(), validUntil: new Date(Date.now() + 86400000), ...values });
const input = () => ({ packageId, identityNumber: '10000000146', phone: '+905551234567', city: 'İstanbul', address: 'Test Mahallesi Test Sokak 10', termsAccepted: true, privacyAccepted: true, salesAgreementAccepted: true });
function signed(response: any) { return { ...response, signature: paymentSignature(secret, [response.paymentStatus, response.paymentId, response.currency, response.basketId, response.conversationId, normalizeSignaturePrice(response.paidPrice), normalizeSignaturePrice(response.price), response.token]) }; }
function webhook(fields: Record<string, unknown> = {}) {
  const body = { iyziEventType: 'CHECKOUT_FORM_AUTH', iyziPaymentId: 12345, token, paymentConversationId: orderId, status: 'SUCCESS',
    iyziEventTime: Date.now(), iyziReferenceCode: 'fixture-reference', ...fields };
  const signature = createHmac('sha256', secret).update(`${secret}${body.iyziEventType}${body.iyziPaymentId}${body.token}${body.paymentConversationId}${body.status}`).digest('hex');
  return { body, signature };
}
async function until(check: () => boolean) { for (let i = 0; i < 100; i++) { if (check()) return; await Promise.resolve(); } throw new Error('Async fixture step not reached'); }

describe('PaymentService verified commerce lifecycle', () => {
  let h: ReturnType<typeof harness>, config: Record<string, string>, service: PaymentService, provider: any, overrides: any;
  beforeEach(async () => {
    h = harness(); overrides = {};
    config = { IYZICO_API_KEY: 'live-test-key', IYZICO_SECRET_KEY: secret, IYZICO_BASE_URL: 'https://api.iyzipay.com', PAYMENT_CALLBACK_URL: 'https://api.atlas.test/payment/provider-callback', FRONTEND_URL: 'https://atlas.test',
      MERCHANT_TITLE: 'Test Eğitim Limited', MERCHANT_TAX_NUMBER: '1234567890', MERCHANT_TAX_OFFICE: 'Test Vergi Dairesi', MERCHANT_ADDRESS: 'Test Mahallesi Test Sokak 10', MERCHANT_EMAIL: 'merchant@example.test', MERCHANT_PHONE: '+905551234567', PAYMENT_TERMS_VERSION: 'test-v1' };
    await startService();
  });
  async function startService() {
    service = new PaymentService({ get: (key: string) => config[key] } as ConfigService, h.orders, h.packages, h.users, h.grades, h.enrollments, h.carts);
    provider = (service as any).iyzipay; await service.onModuleInit();
    provider.checkoutFormInitialize.create.mockImplementation((request: any, cb: any) => cb(null, { status: 'success', conversationId: request.conversationId,
      token: `checkout-${request.conversationId}`, tokenExpireTime: 1800, paymentPageUrl: 'https://api.iyzipay.com/checkoutform/test', signature: paymentSignature(secret, [request.conversationId, `checkout-${request.conversationId}`]) }));
    provider.checkoutForm.retrieve.mockImplementation((request: any, cb: any) => {
      const row = h.db.orders.find((order) => order.iyzicoToken === request.token)!;
      cb(null, signed({ status: 'success', paymentStatus: 'SUCCESS', token: request.token, paymentId: '12345', currency: 'TRY', basketId: `BASKET_${row._id}`, conversationId: row._id,
        paidPrice: '99.50', price: '99.50', installment: 1, fraudStatus: 1, itemTransactions: [{ itemId: packageId, price: '99.50', paidPrice: '99.50', paymentTransactionId: 'transaction-12345' }], ...overrides }));
    });
  }
  it('normalizes fractional zeros and clamps monthly/yearly dates including leap years', () => {
    expect(normalizeSignaturePrice('10.51050')).toBe('10.5105'); expect(normalizeSignaturePrice('100')).toBe('100');
    expect(packageAccessEnd(new Date('2028-01-31T12:00:00Z'), 'monthly')?.toISOString()).toBe('2028-02-29T12:00:00.000Z');
    expect(packageAccessEnd(new Date('2028-02-29T12:00:00Z'), 'yearly')?.toISOString()).toBe('2029-02-28T12:00:00.000Z');
    expect(packageAccessEnd(new Date(), 'one-time')).toBeUndefined();
  });
  it('installs compound environment uniqueness before removing the legacy global payment index', async () => {
    h.orders.collection.indexes.mockResolvedValue([{ name: 'iyzicoPaymentId_1', unique: true, key: { iyzicoPaymentId: 1 } }]); await service.onModuleInit();
    expect(h.orders.collection.createIndex).toHaveBeenCalledWith({ paymentEnvironment: 1, iyzicoPaymentId: 1 }, expect.objectContaining({ unique: true }));
    expect(h.orders.collection.dropIndex).toHaveBeenCalledWith('iyzicoPaymentId_1');
  });
  it.each(['PAYMENT_CALLBACK_URL', 'MERCHANT_ADDRESS', 'MERCHANT_TAX_OFFICE', 'IYZICO_API_KEY'])('blocks checkout when %s is missing', async (key) => {
    config[key] = ''; expect(service.getReadiness().canAcceptPayments).toBe(false);
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow(); expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
  });
  it.each([undefined, '', 'false', 'TRUE', '1', 'true '])('blocks new and resumed production checkout when the switch is %p', async flag => {
    config.NODE_ENV = 'production';
    if (flag !== undefined) config.PAYMENT_CHECKOUT_ENABLED = flag;
    h.db.orders.push(pending());
    expect(service.getReadiness()).toMatchObject({ configured: true, canAcceptPayments: false });
    expect(service.getPublicReadiness()).toMatchObject({ canAcceptPayments: false, message: expect.stringContaining('henüz kullanıma açılmadı') });
    expect(await service.getOrderForUser(userId, orderId)).toMatchObject({ canResume: false, canReconcile: true });
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toMatchObject({ status: 503 });
    await expect(service.resumeOrder(userId, orderId)).rejects.toMatchObject({ status: 503 });
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
  });
  it.each([['production', 'true'], ['development', 'false'], ['test', 'false']])('allows configured checkout in %s with switch %s', async (environment, flag) => {
    config.NODE_ENV = environment;
    config.PAYMENT_CHECKOUT_ENABLED = flag;
    expect(service.getPublicReadiness()).toMatchObject({ canAcceptPayments: true });
    const result = await service.initializeCheckoutForm(userId, input(), '127.0.0.1');
    await expect(service.resumeOrder(userId, result.orderId)).resolves.toMatchObject({ status: 'success', orderId: result.orderId });
    expect(provider.checkoutFormInitialize.create).toHaveBeenCalledTimes(1);
  });
  it.each(['callback', 'webhook', 'reconciliation'])('keeps existing orders verifiable through %s with production checkout disabled', async method => {
    config.NODE_ENV = 'production';
    await startService();
    h.db.orders.push(pending());
    expect(service.getPublicReadiness().canAcceptPayments).toBe(false);
    if (method === 'callback') await service.handleCallback(token);
    else if (method === 'reconciliation') await service.reconcileOrder(orderId);
    else {
      const event = webhook();
      await service.handleProviderWebhook(event.body, event.signature);
    }
    expect(provider.checkoutForm.retrieve).toHaveBeenCalledTimes(1);
    expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, fulfillmentStatus: F.FULFILLED });
  });
  it('does not mix live endpoints with sandbox credentials or local return URLs and never exposes secrets', () => {
    config.IYZICO_API_KEY = 'sandbox-test-key'; config.FRONTEND_URL = 'http://localhost:3000';
    expect(service.getReadiness().checks.credentialMode).toBe(false); expect(service.getReadiness().checks.frontendUrl).toBe(false);
    expect(service.getPublicReadiness()).not.toHaveProperty('checks'); expect(JSON.stringify(service.getReadiness())).not.toContain(secret);
  });
  it('takes price and seller snapshot from the server, records accepted terms, and excludes buyer identity from storage', async () => {
    await service.initializeCheckoutForm(userId, input(), '::ffff:127.0.0.1');
    expect(provider.checkoutFormInitialize.create.mock.calls[0][0]).toMatchObject({ price: '99.50', paidPrice: '99.50', callbackUrl: config.PAYMENT_CALLBACK_URL, forceThreeDS: true, buyer: { ip: '127.0.0.1' } });
    expect(h.db.orders[0]).toMatchObject({ termsVersion: 'test-v1', sellerSnapshot: { complete: true, title: 'Test Eğitim Limited' } }); expect(h.db.orders[0]).not.toHaveProperty('identityNumber');
    config.MERCHANT_TITLE = 'Changed'; expect((await service.getOrderForUser(userId, h.db.orders[0]._id)).sellerSnapshot.title).toBe('Test Eğitim Limited');
  });
  it.each(['price', 'period', 'legal', 'merchant', 'grades', 'description', 'subtitle', 'features', 'gradePolicy'])('blocks a changed %s quote before opening the provider form', async field => {
    const context = await service.getCheckoutContext(userId, packageId);
    if (field === 'price') h.db.packages[0].price = 120;
    if (field === 'period') h.db.packages[0].period = 'yearly';
    if (field === 'legal') config.SALES_AGREEMENT_VERSION = 'sales-v-next';
    if (field === 'merchant') config.MERCHANT_TITLE = 'Another Test Merchant';
    if (field === 'grades') { h.db.grades.push({ _id: parentId, level: 8, isActive: true }); h.db.packages[0].gradeIds = [parentId]; }
    if (field === 'description') h.db.packages[0].description = 'Changed educational scope';
    if (field === 'subtitle') h.db.packages[0].subtitle = 'Changed lesson count';
    if (field === 'features') h.db.packages[0].features = ['Changed coaching promise'];
    if (field === 'gradePolicy') h.db.packages[0].gradePolicy = 'student-level';
    await expect(service.initializeCheckoutForm(userId, { ...input(), quoteHash: context.quoteHash! }, '127.0.0.1')).rejects.toThrow('Paket fiyatı');
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled(); expect(h.db.orders).toHaveLength(0);
  });
  async function cartCheckout() {
    const context = await service.getCheckoutContext(userId, packageId), cartId = new Types.ObjectId().toHexString();
    const row = { _id: cartId, userId, revision: 4, packageId, studentId: userId, quoteFingerprint: context.quoteHash,
      checkoutLeaseId: 'owned-lease', checkoutLeaseExpiresAt: new Date(Date.now() + 90000) };
    h.db.carts.push(row);
    return { row, dto: { ...input(), quoteHash: context.quoteHash!, privacyAccepted: true, salesAgreementAccepted: true },
      context: { cartId, revision: 4, leaseId: 'owned-lease' } };
  }
  it('snapshots explicit legal consents and binds the exact cart revision before initialization', async () => {
    const cart = await cartCheckout();
    const response = await service.initializeCheckoutForm(userId, cart.dto, '127.0.0.1', cart.context);
    expect(h.db.orders[0]).toMatchObject({ cartId: cart.row._id, cartRevision: 4, displayedQuoteHash: cart.dto.quoteHash,
      termsVersion: 'test-v1', privacyVersion: 'privacy-v2026-10-30', salesAgreementVersion: 'sales-v2026-10-30',
      preInformationVersion: 'preinfo-v2026-10-30', privacyAcceptedAt: expect.any(Date), salesAgreementAcceptedAt: expect.any(Date) });
    expect((cart.row as any).checkoutOrderId).toBe(response.orderId);
    const publicOrder = await service.getOrderForUser(userId, response.orderId);
    expect(publicOrder).toHaveProperty('privacyAcceptedAt'); expect(publicOrder).not.toHaveProperty('displayedQuoteHash');
  });
  it('preserves the purchased educational promises when the package is edited later', async () => {
    Object.assign(h.db.packages[0], { description: 'Accepted scope', subtitle: 'Weekly lessons', features: ['Live lesson', 'Homework'] });
    const cart = await cartCheckout(); const result = await service.initializeCheckoutForm(userId, cart.dto, '127.0.0.1', cart.context);
    Object.assign(h.db.packages[0], { description: 'New scope', subtitle: 'New lesson count', features: ['Other feature'] });
    expect(await service.getOrderForUser(userId, result.orderId)).toMatchObject({ packageDescription: 'Accepted scope', packageSubtitle: 'Weekly lessons', packageFeatures: ['Live lesson', 'Homework'] });
    await expect(service.initializeCheckoutForm(userId, { ...input() }, '127.0.0.1')).rejects.toThrow('içeriği değişti');
    expect(provider.checkoutFormInitialize.create).toHaveBeenCalledTimes(1);
  });
  it('clears the exact cart only after verified payment, and repeated callbacks cannot increment revision twice', async () => {
    const cart = await cartCheckout(); await service.initializeCheckoutForm(userId, cart.dto, '127.0.0.1', cart.context);
    expect(cart.row.packageId).toBe(packageId); const checkoutToken = h.db.orders[0].iyzicoToken;
    await service.handleCallback(checkoutToken); await service.handleCallback(checkoutToken);
    expect(cart.row.revision).toBe(5); expect(cart.row.packageId).toBeUndefined();
    expect((cart.row as any).quoteFingerprint).toBeUndefined(); expect((cart.row as any).checkoutLeaseId).toBeUndefined();
  });
  it.each(['revision', 'order'])('does not clear a newer cart whose %s has changed before an old callback', async field => {
    const cart = await cartCheckout(); await service.initializeCheckoutForm(userId, cart.dto, '127.0.0.1', cart.context);
    if (field === 'revision') cart.row.revision = 5;
    else (cart.row as any).checkoutOrderId = new Types.ObjectId().toHexString();
    await service.handleCallback(h.db.orders[0].iyzicoToken);
    expect(cart.row.packageId).toBe(packageId); expect(h.db.orders[0].status).toBe(S.COMPLETED);
  });
  it('does not clear a cart for invalid provider proof or an unknown payment outcome', async () => {
    const cart = await cartCheckout(); await service.initializeCheckoutForm(userId, cart.dto, '127.0.0.1', cart.context);
    overrides = { paidPrice: '0.01' };
    await expect(service.handleCallback(h.db.orders[0].iyzicoToken)).rejects.toThrow();
    expect(cart.row.packageId).toBe(packageId); expect(cart.row.revision).toBe(4);
  });
  it('rejects an expired or stolen cart lease before any provider side effect', async () => {
    const cart = await cartCheckout(); cart.row.checkoutLeaseExpiresAt = new Date(Date.now() - 1);
    await expect(service.initializeCheckoutForm(userId, cart.dto, '127.0.0.1', cart.context)).rejects.toThrow('Sepet değişti');
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled(); expect(h.db.orders[0].status).toBe(S.FAILED);
    expect(h.db.orders[0].pendingCheckoutKey).toBeUndefined();
  });
  it('records new explicit cart consents when resuming the same pending hosted checkout', async () => {
    h.db.orders.push(pending()); const cart = await cartCheckout();
    expect(await service.initializeCheckoutForm(userId, cart.dto, '127.0.0.1', cart.context)).toMatchObject({ orderId, reused: true });
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
    expect(h.db.orders[0]).toMatchObject({ cartId: cart.row._id, cartRevision: 4, privacyAcceptedAt: expect.any(Date) });
    await service.handleCallback(token); expect(cart.row.packageId).toBeUndefined();
  });
  it.each(['11111111111', '10000000147', '123'])('rejects invalid identity %s', async (identityNumber) => {
    await expect(service.initializeCheckoutForm(userId, { ...input(), identityNumber }, '127.0.0.1')).rejects.toThrow(); expect(h.db.orders).toHaveLength(0);
  });
  it.each(['termsAccepted', 'privacyAccepted', 'salesAgreementAccepted'])('rejects direct initialization without explicit %s even if called internally', async field => {
    for (const value of [undefined, false, 'true']) {
      await expect(service.initializeCheckoutForm(userId, { ...input(), [field]: value } as any, '127.0.0.1')).rejects.toThrow('onayları gerekli');
    }
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled(); expect(h.db.orders).toHaveLength(0);
  });
  it('creates at most one hosted checkout during concurrent initialization and reuses it after completion', async () => {
    const outcomes = await Promise.allSettled([service.initializeCheckoutForm(userId, input(), '127.0.0.1'), service.initializeCheckoutForm(userId, input(), '127.0.0.1')]);
    expect(outcomes.some((outcome) => outcome.status === 'fulfilled')).toBe(true); expect(h.db.orders).toHaveLength(1); expect(provider.checkoutFormInitialize.create).toHaveBeenCalledTimes(1);
    expect(await service.initializeCheckoutForm(userId, input(), '127.0.0.1')).toMatchObject({ reused: true });
  });
  it('uses one checkout lock and a canonical provider item for either hexadecimal case of the same package', async () => {
    h.db.users[0].parentId = parentId;
    h.db.users.push({ _id: parentId, role: UserRole.PARENT, isActive: true, firstName: 'Veli', lastName: 'Test', email: 'parent@example.test' });
    const outcomes = await Promise.allSettled([
      service.initializeCheckoutForm(userId, { ...input(), packageId: packageId.toUpperCase() }, '127.0.0.1'),
      service.initializeCheckoutForm(parentId, { ...input(), studentId: userId }, '127.0.0.1'),
    ]);
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(h.db.orders).toHaveLength(1);
    expect(h.db.orders[0]).toMatchObject({ package: packageId, pendingCheckoutKey: `live:${userId}:${packageId}` });
    expect(provider.checkoutFormInitialize.create).toHaveBeenCalledTimes(1);
    expect(provider.checkoutFormInitialize.create.mock.calls[0][0].basketItems[0].id).toBe(packageId);
    await expect(service.handleCallback(h.db.orders[0].iyzicoToken)).resolves.toMatchObject({ status: 'success' });
  });
  it('does not open a second form if a callback captures the previous order between the eligibility check and slot acquisition', async () => {
    h.db.orders.push(pending());
    const findOne = h.orders.findOne.getMockImplementation();
    let completedBetweenChecks = false;
    h.orders.findOne.mockImplementation((filter: any) => {
      const query = findOne(filter);
      if (filter.pendingCheckoutKey && !completedBetweenChecks) {
        const exec = query.exec;
        query.exec = async () => {
          completedBetweenChecks = true;
          await service.handleCallback(token);
          return exec();
        };
      }
      return query;
    });
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('hâlen aktif');
    expect(completedBetweenChecks).toBe(true);
    expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, fulfillmentStatus: F.FULFILLED });
    expect(h.db.orders[1]).toMatchObject({ status: S.FAILED, failureCode: 'INITIALIZE_REJECTED' });
    expect(h.db.orders[1].pendingCheckoutKey).toBeUndefined();
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
  });
  it('does not expose the hosted session of a different payer for a linked child', async () => {
    h.db.orders.push(pending()); h.db.users[0].parentId = parentId; h.db.users.push({ _id: parentId, role: UserRole.PARENT, isActive: true });
    await expect(service.initializeCheckoutForm(parentId, { ...input(), studentId: userId }, '127.0.0.1')).rejects.toThrow('başka bir alıcı'); expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
  });
  it.each(['expired', 'changed'])('does not silently replace an %s checkout', async (condition) => {
    h.db.orders.push(pending(condition === 'expired' ? { checkoutExpiresAt: new Date(Date.now() - 1000) } : {})); if (condition === 'changed') h.db.packages[0].price = 120;
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow(); expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
  });
  it('blocks active same-package duplicate purchases and allows a new charge only after expiry', async () => {
    h.db.orders.push(paid({ fulfillmentStatus: F.FULFILLED, fulfillmentAt: new Date() })); expect((await service.getCheckoutContext(userId, packageId)).eligibility.canPurchase).toBe(false);
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('hâlen aktif');
    h.db.orders[0].validUntil = new Date(Date.now() - 1); delete h.db.orders[0].pendingCheckoutKey;
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).resolves.toHaveProperty('orderId');
  });
  it.each(['profile', 'package', 'enrollment'])('rejects inconsistent class scope from %s', async (source) => {
    if (source === 'profile') h.db.users[0].grade = 7;
    if (source === 'package') h.db.grades[0].level = 7;
    if (source === 'enrollment') { h.db.grades.push({ _id: parentId, level: 7, isActive: true }); h.db.enrollments.push({ studentId: userId, gradeId: parentId }); }
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow(); expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
  });
  it('reports class eligibility before collecting billing data', async () => {
    h.db.users[0].grade = 7;
    expect((await service.getCheckoutContext(userId, packageId)).eligibility.canPurchase).toBe(false);
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
  });
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('resolves a shared student-level package to only grade %i and grants no other classes', async level => {
    const configured = Array.from({ length: 8 }, (_, index) => ({ _id: new Types.ObjectId().toHexString(), level: index + 1, isActive: true }));
    h.db.grades.splice(0, h.db.grades.length, ...configured); h.db.enrollments.length = 0; h.db.users[0].grade = level;
    Object.assign(h.db.packages[0], { gradePolicy: 'student-level', gradeIds: configured.map(grade => grade._id) });
    const target = configured[level - 1]._id, context = await service.getCheckoutContext(userId, packageId);
    expect(context).toMatchObject({ package: { gradePolicy: 'student-level' }, resolvedGradeIds: [target], eligibility: { canPurchase: true } });
    await service.initializeCheckoutForm(userId, { ...input(), quoteHash: context.quoteHash! }, '127.0.0.1');
    expect(h.db.orders[0]).toMatchObject({ packageGradePolicy: 'student-level', gradeIds: [target] });
    await service.handleCallback(h.db.orders[0].iyzicoToken);
    expect(h.db.orders[0].fulfillmentStatus).toBe(F.FULFILLED); expect(h.db.enrollments).toHaveLength(1);
    expect(oid(h.db.enrollments[0].gradeId)).toBe(target);
  });
  it.each(['missing-level', 'duplicate-level', 'inactive', 'unknown-policy', 'missing-student-level', 'inconsistent-student-level', 'out-of-range'])('fails closed for student-level policy with %s before provider interaction', async issue => {
    h.db.enrollments.length = 0;
    h.db.grades.push({ _id: parentId, level: 7, isActive: true });
    Object.assign(h.db.packages[0], { gradePolicy: 'student-level', gradeIds: [gradeId, parentId] });
    if (issue === 'missing-level') h.db.packages[0].gradeIds = [parentId];
    if (issue === 'duplicate-level') h.db.grades[1].level = 8;
    if (issue === 'inactive') h.db.grades[1].isActive = false;
    if (issue === 'unknown-policy') h.db.packages[0].gradePolicy = 'all';
    if (issue === 'missing-student-level') delete h.db.users[0].grade;
    if (issue === 'inconsistent-student-level') h.db.enrollments.push({ studentId: userId, gradeId: parentId });
    if (issue === 'out-of-range') h.db.grades[1].level = 9;
    expect((await service.getCheckoutContext(userId, packageId)).eligibility.canPurchase).toBe(false);
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow();
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled(); expect(h.db.orders).toHaveLength(0);
  });
  it('fulfills only the resolved historical class even if the shared package mapping changes after checkout', async () => {
    h.db.grades.push({ _id: parentId, level: 7, isActive: true });
    Object.assign(h.db.packages[0], { gradePolicy: 'student-level', gradeIds: [gradeId, parentId] });
    await service.initializeCheckoutForm(userId, input(), '127.0.0.1');
    h.db.packages[0].gradeIds = [parentId]; h.db.packages[0].gradePolicy = 'fixed';
    await service.handleCallback(h.db.orders[0].iyzicoToken);
    expect(h.db.orders[0]).toMatchObject({ gradeIds: [gradeId], fulfillmentStatus: F.FULFILLED, packageGradePolicy: 'student-level' });
    expect(h.db.enrollments).toHaveLength(1); expect(oid(h.db.enrollments[0].gradeId)).toBe(gradeId);
  });
  it('keeps fixed-policy multiple same-level class assignment unchanged', async () => {
    h.db.grades.push({ _id: parentId, level: 8, isActive: true }); h.db.packages[0].gradeIds = [gradeId, parentId];
    await service.initializeCheckoutForm(userId, input(), '127.0.0.1');
    await service.handleCallback(h.db.orders[0].iyzicoToken);
    expect(h.db.orders[0]).toMatchObject({ packageGradePolicy: 'fixed', gradeIds: [gradeId, parentId], fulfillmentStatus: F.FULFILLED });
    expect(h.db.enrollments).toHaveLength(2);
  });
  it('rejects direct checkout of a legacy active package without assigned classes', async () => {
    h.db.packages[0].gradeIds = []; h.db.enrollments.length = 0; delete h.db.users[0].grade;
    expect((await service.getCheckoutContext(userId, packageId)).eligibility.canPurchase).toBe(false);
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('sınıf atamaları');
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
  });
  it('preserves captured money but fails assignment for a legacy order without classes', async () => {
    h.db.orders.push(pending({ gradeIds: [] }));
    expect(await service.handleCallback(token)).toMatchObject({ status: 'pending' });
    expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, providerFraudStatus: 1, fulfillmentStatus: F.FAILED, fulfillmentError: 'CLASS_ASSIGNMENT_REVIEW' });
    expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it('keeps provider initialization failures generic and releases the retry key', async () => {
    provider.checkoutFormInitialize.create.mockImplementation((_r: any, cb: any) => cb(null, { status: 'failure', errorMessage: 'private-provider-detail' }));
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('başlatılamadı'); expect(h.db.orders[0]).toMatchObject({ status: S.FAILED }); expect(h.db.orders[0].pendingCheckoutKey).toBeUndefined();
    provider.checkoutFormInitialize.create.mockImplementation((request: any, cb: any) => cb(null, { status: 'success', conversationId: request.conversationId,
      token: `checkout-${request.conversationId}`, tokenExpireTime: 1800, paymentPageUrl: 'https://api.iyzipay.com/checkoutform/test', signature: paymentSignature(secret, [request.conversationId, `checkout-${request.conversationId}`]) }));
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).resolves.toHaveProperty('orderId');
  });
  it('ignores late provider callbacks after initialization timeout', async () => {
    jest.useFakeTimers(); try {
      let callback: any, request: any; provider.checkoutFormInitialize.create.mockImplementation((r: any, cb: any) => { request = r; callback = cb; });
      const promise = service.initializeCheckoutForm(userId, input(), '127.0.0.1'), rejection = expect(promise).rejects.toThrow('yanıt vermedi'); await until(() => !!callback);
      await jest.advanceTimersByTimeAsync(30001); await rejection;
      await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('İkinci tahsilatı');
      expect(provider.checkoutFormInitialize.create).toHaveBeenCalledTimes(1);
      callback(null, { status: 'success', conversationId: request.conversationId, token, signature: paymentSignature(secret, [request.conversationId, token]) });
      await Promise.resolve(); expect(h.db.orders[0].status).toBe(S.FAILED); expect(h.db.orders[0].iyzicoToken).toBeUndefined();
    } finally { jest.useRealTimers(); }
  });
  it('does not query the provider for an unknown token', async () => { await expect(service.handleCallback(token)).rejects.toThrow('Sipariş bulunamadı'); expect(provider.checkoutForm.retrieve).not.toHaveBeenCalled(); });
  it.each(['CHECKOUT_FORM_AUTH', 'CHECKOUTFORM_AUTH'])('recovers a lost browser return from verified HPP %s without exposing the order', async iyziEventType => {
    h.db.orders.push(pending()); const event = webhook({ iyziEventType });
    await expect(service.handleProviderWebhook(event.body, event.signature)).resolves.toBeUndefined();
    expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, fulfillmentStatus: F.FULFILLED, providerWebhookFingerprint: expect.any(String) });
    expect(h.db.orders[0].providerWebhookLeaseId).toBeUndefined();
    expect(provider.checkoutForm.retrieve).toHaveBeenCalledTimes(1);
    expect(h.enrollments.updateOne).toHaveBeenCalledTimes(1);
    await expect(service.handleProviderWebhook({ ...event.body, iyziEventTime: Date.now() + 100, iyziReferenceCode: 'changed-unsigned-reference' }, event.signature.toUpperCase())).resolves.toBeUndefined();
    expect(provider.checkoutForm.retrieve).toHaveBeenCalledTimes(1); expect(h.enrollments.updateOne).toHaveBeenCalledTimes(1);
    expect(await service.getOrderForUser(userId, orderId)).not.toHaveProperty('providerWebhookFingerprint');
  });
  it.each(['missing', 'wrong', 'tampered', 'ambiguous-number'])('rejects a %s HPP signature or payload before any order lookup or provider request', async issue => {
    h.db.orders.push(pending()); const event = webhook();
    const body = issue === 'tampered' ? { ...event.body, token: 'different-token' } : issue === 'ambiguous-number' ? { ...event.body, iyziPaymentId: Number.MAX_SAFE_INTEGER + 1 } : event.body;
    const signature = issue === 'missing' ? undefined : issue === 'wrong' ? '0'.repeat(64) : event.signature;
    await expect(service.handleProviderWebhook(body, signature)).rejects.toThrow('Ödeme bildirimi doğrulanamadı');
    expect(h.orders.findOne).not.toHaveBeenCalled(); expect(provider.checkoutForm.retrieve).not.toHaveBeenCalled();
  });
  it.each(['order', 'token', 'environment', 'unrelated-product', 'intermediate'])('does not retrieve an irrelevant signed %s notification', async issue => {
    h.db.orders.push(pending(issue === 'environment' ? { paymentEnvironment: 'sandbox' } : {}));
    const event = webhook(issue === 'order' ? { paymentConversationId: parentId } : issue === 'token' ? { token: 'different-token' }
      : issue === 'unrelated-product' ? { iyziEventType: 'CONTACTLESS_REFUND' } : issue === 'intermediate' ? { status: 'INIT_THREEDS' } : {});
    await expect(service.handleProviderWebhook(event.body, event.signature)).resolves.toBeUndefined();
    expect(provider.checkoutForm.retrieve).not.toHaveBeenCalled(); expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it.each([{ paymentId: '54321' }, { paymentStatus: 'FAILURE' }, { paidPrice: '99.49' }])('never grants access from a signed notification when signed CF retrieve disagrees %p', async change => {
    h.db.orders.push(pending()); const event = webhook(); overrides = change;
    await expect(service.handleProviderWebhook(event.body, event.signature)).rejects.toThrow('Ödeme bildirimi henüz işlenemedi');
    expect(h.db.orders[0].status).toBe(S.PENDING); expect(h.db.orders[0].providerWebhookFingerprint).toBeUndefined();
    expect(h.db.orders[0].providerWebhookLeaseId).toBeUndefined(); expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it('does not acknowledge pending fraud review as processed and rechecks the same event later', async () => {
    h.db.orders.push(pending()); const event = webhook(); overrides = { fraudStatus: 0 };
    await expect(service.handleProviderWebhook(event.body, event.signature)).rejects.toThrow('Ödeme bildirimi henüz işlenemedi');
    expect(h.db.orders[0]).toMatchObject({ status: S.PENDING, providerFraudStatus: 0 });
    expect(h.db.orders[0].providerWebhookFingerprint).toBeUndefined(); expect(h.enrollments.updateOne).not.toHaveBeenCalled();
    overrides = { fraudStatus: 1 }; await service.handleProviderWebhook(event.body, event.signature);
    expect(h.db.orders[0].status).toBe(S.COMPLETED); expect(provider.checkoutForm.retrieve).toHaveBeenCalledTimes(2);
  });
  it('retries a valid notification after a transient provider failure and releases its lease', async () => {
    h.db.orders.push(pending()); const event = webhook();
    provider.checkoutForm.retrieve.mockImplementationOnce((_request: unknown, callback: (error: unknown) => void) => callback(new Error('private-provider-detail')));
    await expect(service.handleProviderWebhook(event.body, event.signature)).rejects.toThrow('Ödeme bildirimi henüz işlenemedi');
    expect(h.db.orders[0].providerWebhookLeaseId).toBeUndefined(); expect(h.db.orders[0].providerWebhookFingerprint).toBeUndefined();
    await service.handleProviderWebhook(event.body, event.signature); expect(h.db.orders[0].status).toBe(S.COMPLETED);
  });
  it('uses a database lease so a simultaneous webhook replay cannot start a second retrieve', async () => {
    h.db.orders.push(pending()); const event = webhook();
    const retrieve = provider.checkoutForm.retrieve.getMockImplementation();
    let finish: (() => void) | undefined;
    provider.checkoutForm.retrieve.mockImplementation((request: unknown, callback: unknown) => { finish = () => retrieve(request, callback); });
    const first = service.handleProviderWebhook(event.body, event.signature); await until(() => !!finish);
    await expect(service.handleProviderWebhook(event.body, event.signature)).rejects.toThrow('Ödeme bildirimi henüz işlenemedi');
    expect(provider.checkoutForm.retrieve).toHaveBeenCalledTimes(1); finish!(); await first;
    await service.handleProviderWebhook(event.body, event.signature); expect(provider.checkoutForm.retrieve).toHaveBeenCalledTimes(1);
  });
  it('acknowledges a verified failure only once and never grants package access', async () => {
    h.db.orders.push(pending()); const event = webhook({ status: 'FAILURE' }); overrides = { paymentStatus: 'FAILURE' };
    await service.handleProviderWebhook(event.body, event.signature); await service.handleProviderWebhook(event.body, event.signature);
    expect(h.db.orders[0]).toMatchObject({ status: S.FAILED, providerPaymentStatus: 'FAILURE', providerWebhookFingerprint: expect.any(String) });
    expect(provider.checkoutForm.retrieve).toHaveBeenCalledTimes(1); expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it.each([{ token: 'different-token' }, { conversationId: userId }, { basketId: 'wrong' }, { currency: 'USD' }, { price: '0.01' }, { paidPrice: '99.49' }])('rejects signed mismatched payment %p', async (change) => {
    h.db.orders.push(pending()); overrides = change; await expect(service.handleCallback(token)).rejects.toThrow(); expect(h.db.orders[0].status).toBe(S.PENDING); expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it('rejects a forged signature', async () => {
    h.db.orders.push(pending()); provider.checkoutForm.retrieve.mockImplementation((_r: any, cb: any) => cb(null, { status: 'success', signature: '0'.repeat(64) }));
    await expect(service.handleCallback(token)).rejects.toThrow('doğrulanamadı'); expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it.each([{ itemId: gradeId }, { paidPrice: '0.01' }, { paymentTransactionId: undefined }])('rejects incomplete provider line items %p', async (change) => {
    h.db.orders.push(pending()); overrides = { itemTransactions: [{ itemId: packageId, price: '99.50', paidPrice: '99.50', paymentTransactionId: 'tx', ...change }] };
    await expect(service.handleCallback(token)).rejects.toThrow('paket bilgisi'); expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it('keeps intermediate 3DS results pending and accepts the later approved result', async () => {
    h.db.orders.push(pending()); overrides = { paymentStatus: 'INIT_THREEDS' }; expect(await service.handleCallback(token)).toMatchObject({ status: 'pending' }); expect(h.db.orders[0].status).toBe(S.PENDING);
    overrides = {}; expect(await service.handleCallback(token)).toMatchObject({ status: 'success' });
  });
  it.each(['FAILURE', 'INIT_THREEDS'])('cannot overwrite a newer fraud review or release its slot with a stale signed %s', async staleStatus => {
    h.db.orders.push(pending());
    const responses: Array<(error: unknown, result: unknown) => void> = [];
    provider.checkoutForm.retrieve.mockImplementation((_request: unknown, callback: (error: unknown, result: unknown) => void) => responses.push(callback));
    const oldRequest = service.handleCallback(token); await until(() => responses.length === 1);
    const newRequest = service.handleCallback(token); await until(() => responses.length === 2);
    const receipt = { status: 'success', paymentStatus: 'SUCCESS', token, paymentId: '12345', currency: 'TRY', basketId: `BASKET_${orderId}`, conversationId: orderId,
      paidPrice: '99.50', price: '99.50', installment: 1, fraudStatus: 0, itemTransactions: [{ itemId: packageId, price: '99.50', paidPrice: '99.50', paymentTransactionId: 'transaction-12345' }] };
    responses[1](null, signed(receipt)); await newRequest;
    responses[0](null, signed({ ...receipt, paymentStatus: staleStatus, fraudStatus: -1 }));
    await expect(oldRequest).resolves.toMatchObject({ status: 'pending' });
    expect(h.db.orders[0]).toMatchObject({ status: S.PENDING, providerPaymentStatus: 'SUCCESS', providerFraudStatus: 0,
      pendingCheckoutKey: `live:${userId}:${packageId}` });
    expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it('preserves pending status when the provider query fails without a signed financial result', async () => {
    h.db.orders.push(pending()); provider.checkoutForm.retrieve.mockImplementation((_r: any, cb: any) => cb(null, { status: 'failure' }));
    await expect(service.handleCallback(token)).rejects.toThrow('henüz doğrulanamadı'); expect(h.db.orders[0]).toMatchObject({ status: S.PENDING, reconciliationError: 'PROVIDER_UNAVAILABLE' }); expect(await service.callbackFailure(token)).toHaveProperty('orderId', orderId);
  });
  it('holds fraud review without granting or allowing local cancellation', async () => {
    h.db.orders.push(pending()); overrides = { fraudStatus: 0 }; expect(await service.handleCallback(token)).toMatchObject({ status: 'pending' });
    await expect(service.cancelOrder(userId, orderId)).rejects.toThrow(); expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it('records payment first, then grants package access while retaining manual enrollment', async () => {
    h.db.orders.push(pending()); expect(await service.handleCallback(token)).toMatchObject({ status: 'success', fulfillmentStatus: F.FULFILLED });
    expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, iyzicoPaymentTransactionId: 'transaction-12345', providerPaidPrice: 99.5, fulfillmentAttempts: 1 });
    expect(h.db.enrollments[0]).toMatchObject({ accessSource: 'manual', packageGrants: [{ orderId, environment: 'live', unlimited: false }] });
    expect(h.enrollments.updateOne.mock.calls[0][2]).toMatchObject({ runValidators: true, upsert: true });
  });
  it('creates sourced package grants when no manual enrollment exists', async () => {
    h.db.orders.push(pending()); h.db.enrollments.length = 0; await service.handleCallback(token); expect(h.db.enrollments[0]).toMatchObject({ accessSource: 'package' });
  });
  it('blocks another charge when captured money is awaiting assignment or fraud review', async () => {
    h.db.orders.push(paid({ fulfillmentStatus: F.FAILED }));
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('ödemeniz zaten alındı');
    h.db.orders.splice(0, 1, pending({ providerPaymentStatus: 'SUCCESS', providerFraudStatus: 0 }));
    await expect(service.resumeOrder(userId, orderId)).rejects.toThrow();
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('incelemede');
    expect((await service.getOrderForUser(userId, orderId)).canResume).toBe(false);
  });
  it('never grants live access for a sandbox payment', async () => {
    config.IYZICO_BASE_URL = 'https://sandbox-api.iyzipay.com'; h.db.orders.push(pending({ paymentEnvironment: 'sandbox' }));
    expect(await service.handleCallback(token)).toMatchObject({ status: 'success', fulfillmentStatus: F.SKIPPED_SANDBOX }); expect(h.enrollments.updateOne).not.toHaveBeenCalled(); expect(await service.getActivePackage(userId)).toBeNull();
  });
  it('uses an atomic lease during simultaneous callback/fulfillment and never extends access on replay', async () => {
    h.db.orders.push(pending()); await Promise.all([service.handleCallback(token), service.handleCallback(token)]);
    expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, fulfillmentStatus: F.FULFILLED, fulfillmentAttempts: 1 }); expect(h.db.enrollments[0].packageGrants).toHaveLength(1);
    const dates = [h.db.orders[0].paidAt.getTime(), h.db.orders[0].validUntil.getTime()]; await service.handleCallback(token);
    expect([h.db.orders[0].paidAt.getTime(), h.db.orders[0].validUntil.getTime()]).toEqual(dates); expect(h.db.orders[0].fulfillmentAttempts).toBe(1);
  });
  it('recovers expired leases without rewriting access dates', async () => {
    const row = paid({ fulfillmentStatus: F.PROCESSING, fulfillmentLeaseId: 'old', fulfillmentLeaseExpiresAt: new Date(Date.now() - 1) }); h.db.orders.push(row); const end = row.validUntil.getTime();
    await service.handleCallback(token); expect(row.fulfillmentStatus).toBe(F.FULFILLED); expect(row.validUntil.getTime()).toBe(end);
  });
  it('preserves captured payment when assignment fails and recovers after class correction', async () => {
    h.db.orders.push(pending()); h.db.users[0].grade = 7; expect(await service.handleCallback(token)).toMatchObject({ status: 'pending' });
    expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, fulfillmentStatus: F.FAILED, fulfillmentError: 'CLASS_ASSIGNMENT_REVIEW' }); const date = h.db.orders[0].paidAt.getTime();
    h.db.users[0].grade = 8; expect(await service.reconcileOrder(orderId)).toMatchObject({ status: 'success' }); expect(h.db.orders[0].paidAt.getTime()).toBe(date);
  });
  it('does not falsely fulfill already expired access', async () => {
    h.db.orders.push(paid({ validUntil: new Date(Date.now() - 1) })); await service.handleCallback(token);
    expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, fulfillmentStatus: F.FAILED, fulfillmentError: 'ACCESS_PERIOD_EXPIRED' }); expect(h.enrollments.updateOne).not.toHaveBeenCalled();
  });
  it('retries enrollment unique conflicts rather than swallowing a lost grant', async () => {
    h.db.orders.push(pending()); h.enrollments.updateOne.mockImplementationOnce(() => ({ setOptions: () => ({ exec: () => Promise.reject({ code: 11000 }) }) }));
    expect(await service.handleCallback(token)).toMatchObject({ status: 'success' }); expect(h.enrollments.updateOne).toHaveBeenCalledTimes(2); expect(h.db.enrollments[0].packageGrants).toHaveLength(1);
  });
  it('recovers transient assignment failure using the same stable grant and expiry', async () => {
    h.db.orders.push(pending()); h.enrollments.updateOne.mockImplementationOnce(() => ({ setOptions: () => ({ exec: () => Promise.reject(new Error('database unavailable')) }) }));
    await service.handleCallback(token); const end = h.db.orders[0].validUntil.getTime(); expect(h.db.orders[0].fulfillmentStatus).toBe(F.FAILED);
    await service.reconcileOrder(orderId); expect(h.db.orders[0]).toMatchObject({ fulfillmentStatus: F.FULFILLED, fulfillmentAttempts: 2 }); expect(h.db.orders[0].validUntil.getTime()).toBe(end);
  });
  it('does not assign one live provider ID to two different orders', async () => {
    h.db.orders.push(paid({ _id: parentId, iyzicoToken: 'other', fulfillmentAt: new Date() }), pending()); await expect(service.handleCallback(token)).rejects.toThrow('başka bir siparişe bağlı'); expect(h.db.orders[1].status).toBe(S.PENDING);
  });
  it('keeps live and sandbox numeric provider IDs independent', async () => {
    h.db.orders.push(paid({ _id: parentId, iyzicoToken: 'other', paymentEnvironment: 'sandbox' }), pending()); await expect(service.handleCallback(token)).resolves.toMatchObject({ status: 'success' });
  });
  it('accounts for a late approved payment after local cancellation without refunding', async () => {
    h.db.orders.push(pending()); await service.cancelOrder(userId, orderId); expect(h.db.orders[0].status).toBe(S.CANCELLED);
    expect(await service.handleCallback(token)).toMatchObject({ status: 'success' }); expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, cancelledAt: expect.any(Date) }); expect(provider.refund.create).not.toHaveBeenCalled();
  });
  it('blocks a second hosted session after local cancellation until its bank expiry', async () => {
    h.db.orders.push(pending()); await service.cancelOrder(userId, orderId);
    expect(h.db.orders[0].pendingCheckoutKey).toBe(`live:${userId}:${packageId}`);
    expect((await service.getCheckoutContext(userId, packageId)).eligibility.canPurchase).toBe(false);
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('İkinci tahsilatı');
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
    h.db.orders[0].checkoutExpiresAt = new Date(Date.now() - 1);
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).resolves.toHaveProperty('orderId');
    expect(provider.checkoutFormInitialize.create).toHaveBeenCalledTimes(1);
  });
  it.each([
    { status: S.CANCELLED }, { status: S.FAILED }, { status: S.FAILED, providerPaymentStatus: 'FAILURE' },
    { status: S.FAILED, checkoutExpiresAt: undefined },
    { status: S.FAILED, iyzicoToken: undefined, checkoutInitializedAt: undefined, failureCode: 'INITIALIZE_FAILED' },
  ])('blocks unresolved legacy sessions without a deduplication key %p', async (change) => {
    const row = pending(change); delete row.pendingCheckoutKey; h.db.orders.push(row);
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('İkinci tahsilatı');
    expect(provider.checkoutFormInitialize.create).not.toHaveBeenCalled();
  });
  it('allows retry after a signed provider failure of a locally cancelled session', async () => {
    h.db.orders.push(pending()); await service.cancelOrder(userId, orderId);
    overrides = { paymentStatus: 'FAILURE' }; await service.handleCallback(token);
    expect(h.db.orders[0]).toMatchObject({ status: S.CANCELLED, providerPaymentStatus: 'FAILURE', providerVerifiedAt: expect.any(Date) });
    expect(h.db.orders[0].pendingCheckoutKey).toBeUndefined();
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).resolves.toHaveProperty('orderId');
  });
  it('records the actual provider expiry when the user cancels during initialization', async () => {
    let callback: any, request: any;
    provider.checkoutFormInitialize.create.mockImplementation((r: any, cb: any) => { request = r; callback = cb; });
    const promise = service.initializeCheckoutForm(userId, input(), '127.0.0.1');
    const rejection = expect(promise).rejects.toThrow('Sipariş kapatıldı'); await until(() => !!callback);
    await service.cancelOrder(userId, h.db.orders[0]._id);
    callback(null, { status: 'success', conversationId: request.conversationId, token, tokenExpireTime: 7200,
      paymentPageUrl: 'https://api.iyzipay.com/checkoutform/test', signature: paymentSignature(secret, [request.conversationId, token]) });
    await rejection;
    expect(h.db.orders[0]).toMatchObject({ status: S.CANCELLED, iyzicoToken: token });
    expect(h.db.orders[0].checkoutExpiresAt.getTime()).toBeGreaterThan(Date.now() + 7100000);
    await expect(service.initializeCheckoutForm(userId, input(), '127.0.0.1')).rejects.toThrow('İkinci tahsilatı');
    expect(provider.checkoutFormInitialize.create).toHaveBeenCalledTimes(1);
  });
  it('checks current active account and current admin role before financial access', async () => {
    h.db.users[0].isActive = false; await expect(service.getUserOrders(userId)).rejects.toThrow('Aktif kullanıcı'); await expect(service.requireAdmin(userId)).rejects.toThrow();
    h.db.users[0].isActive = true; await expect(service.requireAdmin(userId)).rejects.toThrow('yönetici'); h.db.users[0].role = UserRole.ADMIN; await expect(service.requireAdmin(userId)).resolves.toBeUndefined();
    h.db.users[0].role = UserRole.SUPERADMIN; await expect(service.requireAdmin(userId)).resolves.toBeUndefined();
  });
  it('allows linked parent visibility but denies unrelated pupils and nonpayer mutations', async () => {
    h.db.orders.push(pending()); h.db.users[0].parentId = parentId; h.db.users.push({ _id: parentId, role: UserRole.PARENT, isActive: true });
    expect((await service.getUserOrders(parentId)).items).toHaveLength(1); await expect(service.cancelOrder(parentId, orderId)).rejects.toThrow('ödeyen'); await expect(service.resumeOrder(parentId, orderId)).rejects.toThrow('siparişi başlatan');
    delete h.db.users[0].parentId; await expect(service.getOrderForUser(parentId, orderId)).rejects.toThrow('Sipariş bulunamadı'); await expect(service.getUserOrders(parentId, { studentId: userId })).rejects.toThrow('erişiminiz yok');
  });
  it('serializes order details without provider tokens, hosted URL, IP, dedup key or lease IDs', async () => {
    h.db.orders.push(pending({ termsAcceptedIp: 'private', fulfillmentLeaseId: 'private' }));
    for (const row of [await service.getOrderForUser(userId, orderId), await service.getAdminOrder(orderId)]) for (const key of ['iyzicoToken', 'paymentPageUrl', 'termsAcceptedIp', 'pendingCheckoutKey', 'fulfillmentLeaseId']) expect(row).not.toHaveProperty(key);
  });
  it('creates one local refund request without sending a refund or revoking paid access', async () => {
    h.db.orders.push(paid({ fulfillmentAt: new Date(), fulfillmentStatus: F.FULFILLED })); await service.requestRefund(userId, orderId, 'İlk iade talebi açıklaması.'); const at = h.db.orders[0].refundRequestedAt.getTime();
    await service.requestRefund(userId, orderId, 'İkinci açıklama değiştirmemeli.'); expect(h.db.orders[0]).toMatchObject({ status: S.COMPLETED, refundRequestStatus: 'REQUESTED', refundReason: 'İlk iade talebi açıklaması.' }); expect(h.db.orders[0].refundRequestedAt.getTime()).toBe(at); expect(provider.refund.create).not.toHaveBeenCalled();
  });
  it.each([pending(), paid({ paymentEnvironment: 'sandbox' })])('rejects refund requests without a verified live charge', async (row) => {
    h.db.orders.push(row); await expect(service.requestRefund(userId, orderId, 'Geçerli iade talebi açıklaması.')).rejects.toThrow();
  });
  it('uses full filtered aggregates and count for summaries rather than just one page', async () => {
    h.db.orders.push(paid(), paid({ _id: parentId })); h.orders.countDocuments.mockReturnValue(h.query(() => 37)); h.orders.aggregate.mockReturnValue(h.query(() => [{ totalOrders: 37, completedOrders: 30, liveCents: 123456, sandboxCents: 12000 }]));
    const page = await service.getAllOrders({ page: 1, pageSize: 1 }); expect(page.items).toHaveLength(1); expect(page.pagination).toMatchObject({ total: 37, totalPages: 37 }); expect(page.summary).toMatchObject({ liveRevenue: 1234.56, sandboxRevenue: 120 });
  });
  it('searches a combined pupil first and last name while escaping each term', async () => {
    h.db.orders.push(paid());
    expect((await service.getAllOrders({ q: 'Test Öğrenci' })).pagination.total).toBe(1);
  });
  it('escapes literal regex punctuation and uses inclusive Turkish calendar dates', async () => {
    h.db.orders.push(paid({ packageName: 'Math + Reading [8]', createdAt: new Date('2026-10-17T21:15:00Z') }), paid({ _id: parentId, packageName: 'Other', createdAt: new Date('2026-10-17T20:59:59Z') }));
    expect((await service.getAllOrders({ q: '+ Reading [8]', from: '2026-10-18', to: '2026-10-18' })).pagination.total).toBe(1);
  });
  it('does not report an old unverified completed record as a successful payment', async () => {
    h.db.orders.push(paid({ providerVerifiedAt: undefined, fulfillmentAt: new Date(), fulfillmentStatus: F.FULFILLED }));
    expect(await service.reconcileOrder(orderId)).toMatchObject({ status: 'pending' });
    expect((await service.getOrderForUser(userId, orderId)).canRequestRefund).toBe(false);
  });
  it.each([{ paymentEnvironment: undefined }, { paymentEnvironment: 'sandbox' }, { accessStartsAt: new Date(Date.now() + 100000) }, { fulfillmentStatus: F.FAILED }, { providerVerifiedAt: undefined }])('does not activate unverified, sandbox, future or unfulfilled order %p', async (change) => {
    h.db.orders.push(paid({ fulfillmentAt: new Date(), fulfillmentStatus: F.FULFILLED, ...change })); expect(await service.getActivePackage(userId)).toBeNull();
  });
});
