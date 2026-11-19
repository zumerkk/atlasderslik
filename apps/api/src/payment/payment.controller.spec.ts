import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Test } from '@nestjs/testing';
import request from 'supertest';

describe('PaymentController provider callback', () => {
  it('passes the raw HPP signature separately and returns no order or token in a webhook acknowledgement', async () => {
    const body = { token: 'private-token' }, signature = 'private-signature';
    const service: any = { handleProviderWebhook: jest.fn().mockResolvedValue({ orderId: 'private-order' }) };
    const module = await Test.createTestingModule({ controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: service }] }).compile();
    const app = module.createNestApplication({ logger: false });
    await app.init();
    try {
      const response = await request(app.getHttpServer()).post('/payment/provider-webhook')
        .set('X-IYZ-SIGNATURE-V3', signature).send(body).expect(204);
      expect(response.text).toBe(''); expect(response.headers['cache-control']).toBe('no-store');
      expect(service.handleProviderWebhook).toHaveBeenCalledWith(body, signature);
    } finally { await app.close(); }
  });
  it('verifies the provider POST token on the server, then issues a no-store 303 redirect', async () => {
    const result = { status: 'success', orderId: 'order' };
    const service: any = { handleCallback: jest.fn().mockResolvedValue(result), getFrontendResultUrl: jest.fn().mockReturnValue('https://atlasderslik.com/payment/result?orderId=order') };
    const response: any = { setHeader: jest.fn(), redirect: jest.fn() };
    await new PaymentController(service).providerCallback({ token: 'checkout-token' }, response);
    expect(service.handleCallback).toHaveBeenCalledWith('checkout-token');
    expect(service.getFrontendResultUrl).toHaveBeenCalledWith(result);
    expect(response.redirect).toHaveBeenCalledWith(303, 'https://atlasderslik.com/payment/result?orderId=order');
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });
  it('does not include provider tokens or internal errors in a failed redirect', async () => {
    const service: any = { callbackFailure: jest.fn().mockResolvedValue({ status: 'failure' }), handleCallback: jest.fn().mockRejectedValue(new Error('private-provider-error')), getFrontendResultUrl: jest.fn().mockReturnValue('https://atlasderslik.com/payment/result') };
    const response: any = { setHeader: jest.fn(), redirect: jest.fn() };
    await new PaymentController(service).providerCallback({ token: 'checkout-token' }, response);
    expect(service.getFrontendResultUrl).toHaveBeenCalledWith({ status: 'failure' });
  });
  it('uses the authenticated identity and actual request IP when initializing', async () => {
    const service: any = { initializeCheckoutForm: jest.fn() };
    const dto: any = { packageId: 'package' };
    new PaymentController(service).initializePayment({ user: { userId: 'authenticated-payer' }, ip: '203.0.113.1' }, dto);
    expect(service.initializeCheckoutForm).toHaveBeenCalledWith('authenticated-payer', dto, '203.0.113.1');
  });

  it.each(['readiness', 'orders', 'reconcile'])('requires fresh admin status before financial %s access', async (action) => {
    const service: any = { requireAdmin: jest.fn().mockRejectedValue(new Error('admin-revoked')), getAdminReadiness: jest.fn(), getAllOrders: jest.fn(), reconcileOrder: jest.fn() };
    const controller = new PaymentController(service);
    const request = { user: { userId: 'stale-admin' } };
    const operation = action === 'readiness' ? controller.getReadiness(request) : action === 'orders' ? controller.getAllOrders(request, {}) : controller.reconcileOrder(request, 'order-id');
    await expect(operation).rejects.toThrow('admin-revoked');
    expect(service.requireAdmin).toHaveBeenCalledWith('stale-admin');
    expect(service.getAdminReadiness).not.toHaveBeenCalled();
    expect(service.getAllOrders).not.toHaveBeenCalled();
    expect(service.reconcileOrder).not.toHaveBeenCalled();
  });
});
