import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { ActivePackageQueryDto, AdminOrdersQueryDto, InitializePaymentDto, PaymentCallbackDto, RefundRequestDto, UserOrdersQueryDto } from './payment.dto';

const valid = { packageId: '507f1f77bcf86cd799439013', identityNumber: '10000000146', phone: '+905551234567', city: 'İstanbul', address: 'Test Mahallesi Test Sokak 10', termsAccepted: true, privacyAccepted: true, salesAgreementAccepted: true };

describe('payment input validation', () => {
  it('accepts complete billing data and trims before validation', async () => {
    const dto = plainToInstance(InitializePaymentDto, { ...valid, city: ' İstanbul ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.city).toBe('İstanbul');
  });
  it.each([{ packageId: 'bad' }, { city: '   ' }, { address: '          ' }, { phone: '+905' }, { identityNumber: '123' }, { termsAccepted: false }, { termsAccepted: 'true' }])('rejects malformed or unaccepted billing input %p', async (patch) => {
    expect((await validate(plainToInstance(InitializePaymentDto, { ...valid, ...patch }))).length).toBeGreaterThan(0);
  });
  it.each(['', 'x'.repeat(201), '<script>', 'token with spaces'])('rejects callback token %s', async (token) => {
    expect((await validate(plainToInstance(PaymentCallbackDto, { token }))).length).toBeGreaterThan(0);
  });

  it.each([{ price: 0.01 }, { buyer: { id: 'other-payer' } }, { $set: { status: 'COMPLETED' } }])('rejects unknown checkout fields under the controller strict pipe %p', async (extra) => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    await expect(pipe.transform({ ...valid, ...extra }, { type: 'body', metatype: InitializePaymentDto })).rejects.toThrow();
  });
  it.each(['termsAccepted', 'privacyAccepted', 'salesAgreementAccepted'])('requires explicit %s on the direct initialize contract', async field => {
    for (const value of [undefined, false, 'true']) {
      expect(await validate(plainToInstance(InitializePaymentDto, { ...valid, [field]: value }))).not.toHaveLength(0);
    }
  });

  it.each([{ page: '0' }, { pageSize: '101' }, { status: 'other' }, { environment: 'other' }, { from: '2026-02-30' }, { q: { $gt: '' } }])('rejects malformed admin filter %p', async (filter) => {
    expect((await validate(plainToInstance(AdminOrdersQueryDto, filter))).length).toBeGreaterThan(0);
  });

  it('converts valid page query values and accepts explicit selected pupils', async () => {
    const dto = plainToInstance(UserOrdersQueryDto, { page: '2', pageSize: '25', studentId: valid.packageId });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ page: 2, pageSize: 25 });
    expect(await validate(plainToInstance(ActivePackageQueryDto, { studentId: valid.packageId }))).toHaveLength(0);
  });

  it.each(['short', ' '.repeat(20), 'x'.repeat(1001)])('rejects invalid local refund reason', async (reason) => {
    expect((await validate(plainToInstance(RefundRequestDto, { reason }))).length).toBeGreaterThan(0);
  });
});
