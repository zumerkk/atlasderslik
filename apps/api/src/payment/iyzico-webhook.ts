import { ForbiddenException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

export interface IyzicoWebhookReceipt {
  orderId: string;
  token: string;
  paymentId: string;
  status: 'SUCCESS' | 'FAILURE';
  fingerprint: string;
}

// Current HPP documentation uses CHECKOUT_FORM_AUTH; the CF example also
// documents CHECKOUTFORM_AUTH. Compare the original signed event string.
const checkoutEvents = new Set(['CHECKOUT_FORM_AUTH', 'CHECKOUTFORM_AUTH']);

export function verifyIyzicoWebhook(body: unknown, signature: unknown, secret: string): IyzicoWebhookReceipt | null {
  const invalid = () => new ForbiddenException('Ödeme bildirimi doğrulanamadı.');
  if (!secret || typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)
    || !body || typeof body !== 'object' || Array.isArray(body)) throw invalid();
  const { iyziEventType, iyziPaymentId, token, paymentConversationId, status } = body as Record<string, unknown>;
  const paymentId = typeof iyziPaymentId === 'number' && Number.isSafeInteger(iyziPaymentId) ? String(iyziPaymentId) : iyziPaymentId;
  if (typeof iyziEventType !== 'string' || !/^[A-Z0-9_]{1,64}$/.test(iyziEventType)
    || typeof paymentId !== 'string' || !/^\d{1,24}$/.test(paymentId)
    || typeof token !== 'string' || !/^[A-Za-z0-9_-]{8,200}$/.test(token)
    || typeof paymentConversationId !== 'string' || !/^[a-f0-9]{24}$/.test(paymentConversationId)
    || typeof status !== 'string' || !/^[A-Z0-9_]{1,48}$/.test(status)) throw invalid();

  // HPP V3 uses concatenation without delimiters, not the CF retrieve signature.
  const expected = createHmac('sha256', secret)
    .update(secret + iyziEventType + paymentId + token + paymentConversationId + status, 'utf8').digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw invalid();
  if (!checkoutEvents.has(iyziEventType) || (status !== 'SUCCESS' && status !== 'FAILURE')) return null;

  // Timestamp and reference-code fields are not covered by the V3 signature.
  // Deduplicate on the authenticated message, not those caller-supplied fields.
  return { orderId: paymentConversationId, token, paymentId, status, fingerprint: createHash('sha256').update(expected).digest('hex') };
}
