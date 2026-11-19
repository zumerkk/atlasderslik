import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CartCheckoutDto, CartItemDto, CartRevisionDto } from './cart.dto';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
const transform = (metatype: new () => unknown, value: unknown) => pipe.transform(value, { type: 'body', metatype });
const packageId = '507f1f77bcf86cd799439013';
const buyer = { revision: 1, identityNumber: '10000000146', phone: '+905551234567', city: 'İstanbul', address: 'Kurgu test adresi 10',
  termsAccepted: true, privacyAccepted: true, salesAgreementAccepted: true };

describe('strict cart request contracts', () => {
  it('accepts one package selection and the complete checkout consent', async () => {
    await expect(transform(CartItemDto, { packageId, revision: 0 })).resolves.toMatchObject({ packageId, revision: 0 });
    await expect(transform(CartCheckoutDto, buyer)).resolves.toMatchObject(buyer);
  });
  it.each(['price', 'amount', 'userId', 'parentId', 'quantity', '$set'])('rejects injected %s on a cart item', async field => {
    await expect(transform(CartItemDto, { packageId, revision: 0, [field]: 1 })).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each(['packageId', 'studentId', 'price', 'quoteHash', 'cartId', 'leaseId'])('rejects caller-selected %s during checkout', async field => {
    await expect(transform(CartCheckoutDto, { ...buyer, [field]: packageId })).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([undefined, -1, 0.5, '1', Number.MAX_SAFE_INTEGER])('rejects an invalid revision %p', async revision => {
    await expect(transform(CartRevisionDto, { revision })).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each(['termsAccepted', 'privacyAccepted', 'salesAgreementAccepted'])('requires explicit true %s', async field => {
    await expect(transform(CartCheckoutDto, { ...buyer, [field]: false })).rejects.toBeInstanceOf(BadRequestException);
    const missing: any = { ...buyer }; delete missing[field];
    await expect(transform(CartCheckoutDto, missing)).rejects.toBeInstanceOf(BadRequestException);
  });
});
