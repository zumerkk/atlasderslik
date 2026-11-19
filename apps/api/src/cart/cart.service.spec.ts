import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CartService } from './cart.service';

const userId = '507f1f77bcf86cd799439012', studentId = '507f1f77bcf86cd799439015', packageId = '507f1f77bcf86cd799439013';
const id = (value: any) => String(value?._id || value || '');
function matches(row: any, filter: any): boolean {
  return Object.entries(filter).every(([key, expected]: [string, any]) => {
    if (key === '$or') return expected.some((part: any) => matches(row, part));
    if (expected && typeof expected === 'object' && !(expected instanceof Date) && !(expected instanceof Types.ObjectId)) {
      return Object.entries(expected).every(([op, value]: [string, any]) => op === '$exists' ? (row[key] !== undefined) === value
        : op === '$lte' ? row[key] !== undefined && row[key] <= value : op === '$gt' ? row[key] > value : false);
    }
    return expected instanceof Types.ObjectId || row[key] instanceof Types.ObjectId ? id(row[key]) === id(expected) : row[key] === expected;
  });
}
function fixture() {
  const rows: any[] = [];
  const query = (run: () => any) => {
    const result: any = { select: jest.fn(() => result), exec: jest.fn(async () => run()) }; return result;
  };
  function change(row: any, update: any, inserting = false) {
    if (inserting) Object.assign(row, update.$setOnInsert);
    Object.assign(row, update.$set);
    for (const [key, value] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + Number(value);
    for (const key of Object.keys(update.$unset || {})) delete row[key];
  }
  const model: any = {
    collection: { createIndex: jest.fn().mockResolvedValue('userId_1') },
    findOne: jest.fn(filter => query(() => { const row = rows.find(row => matches(row, filter)); return row ? { ...row } : null; })),
    findOneAndUpdate: jest.fn((filter, update, options) => query(() => {
      let row = rows.find(row => matches(row, filter));
      const inserting = !row && options?.upsert;
      if (inserting) { row = { _id: new Types.ObjectId().toHexString(), userId: filter.userId }; rows.push(row); }
      if (!row) return null;
      change(row, update, inserting); return { ...row };
    })),
    updateOne: jest.fn((filter, update) => query(() => {
      const row = rows.find(row => matches(row, filter)); if (!row) return { matchedCount: 0 };
      change(row, update); return { matchedCount: 1 };
    })),
  };
  let context: any = {
    package: { _id: packageId, name: 'Atlas', description: 'Eğitim', price: 99.5, period: 'monthly' },
    student: { _id: userId, firstName: 'Öğrenci', lastName: 'Test', grade: 6 }, quoteHash: 'a'.repeat(64),
    eligibility: { canPurchase: true, reason: null }, payment: { canAcceptPayments: true, mode: 'live', message: 'Hazır' },
  };
  const payments: any = {
    getStudents: jest.fn().mockResolvedValue([{ _id: userId, firstName: 'Öğrenci', lastName: 'Test' }]),
    getCheckoutContext: jest.fn(async () => context),
    getPublicReadiness: jest.fn(() => context.payment),
    getMerchant: jest.fn().mockReturnValue({ title: 'Test Kurumu', complete: true }),
    getLegalVersions: jest.fn().mockReturnValue({ terms: 'terms-v2026-10-30', privacy: 'privacy-v2026-10-30', salesAgreement: 'sales-v2026-10-30', preInformation: 'preinfo-v2026-10-30' }),
    initializeCheckoutForm: jest.fn().mockResolvedValue({ status: 'success', orderId: 'order', paymentPageUrl: 'https://api.iyzipay.com/checkoutform/test' }),
  };
  return { rows, model, payments, context, setContext: (value: any) => { context = value; }, service: new CartService(model, payments) };
}
const checkout = (revision = 1) => ({ revision, identityNumber: '10000000146', phone: '+905551234567', city: 'İstanbul',
  address: 'Yalnız kurgu test adresi', termsAccepted: true, privacyAccepted: true, salesAgreementAccepted: true });
async function until(check: () => boolean) { for (let i = 0; i < 100; i++) { if (check()) return; await Promise.resolve(); } throw new Error('Fixture step not reached'); }

describe('CartService single learner and package checkout', () => {
  let h: ReturnType<typeof fixture>;
  beforeEach(async () => { h = fixture(); await h.service.onModuleInit(); });

  it('creates one owned empty cart even with concurrent reads, with no provider side effects', async () => {
    const views = await Promise.all([h.service.get(userId), h.service.get(userId)]);
    expect(h.rows).toHaveLength(1); expect(views[0]).toMatchObject({ revision: 0, item: null, quote: null, canCheckout: false });
    expect(views[0].id).toBe(views[1].id); expect(h.payments.initializeCheckoutForm).not.toHaveBeenCalled();
    expect(h.model.collection.createIndex).toHaveBeenCalledWith({ userId: 1 }, { unique: true });
  });
  it('keeps separate accounts isolated', async () => {
    const a = await h.service.get(userId), b = await h.service.get(studentId);
    expect(a.id).not.toBe(b.id); expect(h.rows).toHaveLength(2);
  });
  it('checks the fresh account before creating any cart', async () => {
    h.payments.getStudents.mockRejectedValue(new ForbiddenException('Hesap aktif değil'));
    await expect(h.service.get(userId)).rejects.toThrow(); expect(h.rows).toHaveLength(0);
  });
  it('allows saving a cart while merchant keys are unavailable', async () => {
    h.context.payment.canAcceptPayments = false;
    const view = await h.service.put(userId, { packageId, revision: 0 });
    expect(view).toMatchObject({ revision: 1, canPurchase: true, canCheckout: false, quote: { amount: 99.5, currency: 'TRY' } });
    expect(h.rows[0].studentId).toBe(userId); expect(h.rows[0].quoteFingerprint).toBe('a'.repeat(64));
  });
  it('does not store an unselected or unrelated child', async () => {
    h.context.student = null; h.context.quoteHash = null;
    await expect(h.service.put(userId, { packageId, revision: 0 })).rejects.toThrow('öğrenciyi seçin');
    expect(h.rows).toHaveLength(0);
    h.payments.getCheckoutContext.mockRejectedValue(new ForbiddenException('Bu öğrenciye erişiminiz yok'));
    await expect(h.service.put(userId, { packageId, studentId, revision: 0 })).rejects.toThrow();
  });
  it('CAS permits only one concurrent edit using the same revision', async () => {
    const result = await Promise.allSettled([h.service.put(userId, { packageId, revision: 0 }), h.service.put(userId, { packageId, revision: 0 })]);
    expect(result.filter(row => row.status === 'fulfilled')).toHaveLength(1); expect(h.rows[0].revision).toBe(1);
  });
  it.each(['put', 'clear', 'checkout'])('rejects stale revision during %s', async action => {
    await h.service.put(userId, { packageId, revision: 0 });
    const promise = action === 'put' ? h.service.put(userId, { packageId, revision: 0 })
      : action === 'clear' ? h.service.clear(userId, { revision: 0 }) : h.service.checkout(userId, checkout(0), '127.0.0.1');
    await expect(promise).rejects.toThrow('Sepet başka'); expect(h.payments.initializeCheckoutForm).not.toHaveBeenCalled();
  });
  it('removes only the selected account cart and increments its revision', async () => {
    await h.service.put(userId, { packageId, revision: 0 });
    const view = await h.service.clear(userId, { revision: 1 });
    expect(view).toMatchObject({ revision: 2, item: null, quote: null }); expect(h.rows[0].quoteFingerprint).toBeUndefined();
  });
  it('displays a changed price without silently accepting it and blocks checkout', async () => {
    await h.service.put(userId, { packageId, revision: 0 });
    h.context.package.price = 120; h.context.quoteHash = 'b'.repeat(64);
    expect(await h.service.get(userId)).toMatchObject({ revision: 1, quoteChanged: true, quote: { amount: 120 }, canCheckout: false });
    await expect(h.service.checkout(userId, checkout(), '127.0.0.1')).rejects.toThrow('Paket fiyatı');
    expect(h.payments.initializeCheckoutForm).not.toHaveBeenCalled();
    const renewed = await h.service.put(userId, { packageId, revision: 1 });
    expect(renewed).toMatchObject({ revision: 2, quoteChanged: false, canCheckout: true });
    await h.service.checkout(userId, checkout(2), '127.0.0.1'); expect(h.payments.initializeCheckoutForm).toHaveBeenCalledTimes(1);
  });
  it('rechecks eligibility and readiness before taking a checkout lease', async () => {
    await h.service.put(userId, { packageId, revision: 0 }); h.context.eligibility.canPurchase = false; h.context.eligibility.reason = 'Paket zaten aktif';
    await expect(h.service.checkout(userId, checkout(), '127.0.0.1')).rejects.toThrow('zaten aktif');
    h.context.eligibility.canPurchase = true; h.context.payment.canAcceptPayments = false;
    await expect(h.service.checkout(userId, checkout(), '127.0.0.1')).rejects.toThrow('Hazır');
    expect(h.payments.initializeCheckoutForm).not.toHaveBeenCalled(); expect(h.rows[0].checkoutLeaseId).toBeUndefined();
  });
  it.each(['termsAccepted', 'privacyAccepted', 'salesAgreementAccepted'])('requires explicit %s without creating a hosted form', async field => {
    await h.service.put(userId, { packageId, revision: 0 });
    await expect(h.service.checkout(userId, { ...checkout(), [field]: false }, '127.0.0.1')).rejects.toThrow('onayları');
    expect(h.payments.initializeCheckoutForm).not.toHaveBeenCalled();
  });
  it('hydrates selection and price guard only from the authenticated server cart', async () => {
    await h.service.put(userId, { packageId, revision: 0 });
    await h.service.checkout(userId, checkout(), '203.0.113.12');
    expect(h.payments.initializeCheckoutForm).toHaveBeenCalledWith(userId, expect.objectContaining({ packageId, studentId: userId,
      quoteHash: 'a'.repeat(64), privacyAccepted: true, salesAgreementAccepted: true }), '203.0.113.12',
      expect.objectContaining({ cartId: h.rows[0]._id, revision: 1, leaseId: expect.any(String) }));
    expect(h.rows[0].packageId).toBe(packageId); expect(h.rows[0].checkoutLeaseId).toBeUndefined();
  });
  it('allows one concurrent checkout and blocks edits and clearing while it runs', async () => {
    await h.service.put(userId, { packageId, revision: 0 });
    let finish!: (value: any) => void;
    h.payments.initializeCheckoutForm.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const first = h.service.checkout(userId, checkout(), '127.0.0.1'); await until(() => !!finish);
    await expect(h.service.checkout(userId, checkout(), '127.0.0.1')).rejects.toThrow('ödeme hazırlanıyor');
    await expect(h.service.put(userId, { packageId, revision: 1 })).rejects.toThrow('ödeme hazırlanıyor');
    await expect(h.service.clear(userId, { revision: 1 })).rejects.toThrow('ödeme hazırlanıyor');
    finish({ orderId: 'order' }); await first; expect(h.payments.initializeCheckoutForm).toHaveBeenCalledTimes(1);
  });
  it('an expired checkout worker cannot release a newer lease or clear a changed cart', async () => {
    await h.service.put(userId, { packageId, revision: 0 });
    let finish!: (value: any) => void;
    h.payments.initializeCheckoutForm.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const first = h.service.checkout(userId, checkout(), '127.0.0.1'); await until(() => !!finish);
    h.rows[0].checkoutLeaseId = 'new-worker'; h.rows[0].revision = 2;
    finish({ orderId: 'old-order' }); await first;
    expect(h.rows[0]).toMatchObject({ revision: 2, packageId, checkoutLeaseId: 'new-worker' });
  });
  it('releases only its own lease after a provider error and preserves the cart selection', async () => {
    await h.service.put(userId, { packageId, revision: 0 }); h.payments.initializeCheckoutForm.mockRejectedValue(new Error('generic provider failure'));
    await expect(h.service.checkout(userId, checkout(), '127.0.0.1')).rejects.toThrow();
    expect(h.rows[0]).toMatchObject({ revision: 1, packageId }); expect(h.rows[0].checkoutLeaseId).toBeUndefined();
  });
  it('does not expose raw checkout leases, fingerprints or billing information', async () => {
    await h.service.put(userId, { packageId, revision: 0 }); Object.assign(h.rows[0], { checkoutLeaseId: 'private-lease', address: 'private-address', iyzicoToken: 'private-token' });
    const json = JSON.stringify(await h.service.get(userId));
    for (const secret of ['private-lease', 'private-address', 'private-token', 'quoteFingerprint', 'quoteHash']) expect(json).not.toContain(secret);
  });
  it('keeps a removed package visible for cleanup but does not allow checkout', async () => {
    await h.service.put(userId, { packageId, revision: 0 }); h.payments.getCheckoutContext.mockRejectedValue(new NotFoundException());
    expect(await h.service.get(userId)).toMatchObject({ item: { package: { name: 'Atlas' } }, canCheckout: false });
  });
  it('does not leak a pupil name after the parent relationship is removed', async () => {
    await h.service.put(userId, { packageId, revision: 0 }); h.payments.getStudents.mockResolvedValue([]);
    h.payments.getCheckoutContext.mockRejectedValue(new ForbiddenException('Bu öğrenciye erişiminiz yok'));
    expect(await h.service.get(userId)).toMatchObject({ item: { student: null }, canPurchase: false, canCheckout: false });
  });
});
