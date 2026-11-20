import { HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

function context() {
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn(), headersSent: false };
    const request = { method: 'POST', url: '/payment/callback?token=private-fixture', path: '/payment/callback', route: { path: '/payment/callback' } };
    const host = { switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }) } as unknown as ArgumentsHost;
    return { response, host };
}

describe('API error disclosure boundary', () => {
    it('does not return or log unexpected database messages, stacks or query tokens', () => {
        const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        try {
            const { response, host } = context();
            new GlobalExceptionFilter().catch(new Error('private-fixture connection failure'), host);
            expect(response.status).toHaveBeenCalledWith(500);
            expect(response.json.mock.calls[0][0]).toMatchObject({ message: 'Sunucu hatası oluştu.', path: '/payment/callback' });
            expect(JSON.stringify(response.json.mock.calls)).not.toContain('private-fixture');
            expect(JSON.stringify(log.mock.calls)).not.toContain('private-fixture');
        } finally { log.mockRestore(); }
    });

    it('keeps intentional client errors useful without echoing the query string', () => {
        const { response, host } = context();
        new GlobalExceptionFilter().catch(new HttpException('Kullanım bütçesi doldu.', 429), host);
        expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
            statusCode: 429, message: 'Kullanım bütçesi doldu.', error: 'Too Many Requests', path: '/payment/callback',
        }));
    });

    it('preserves actionable AtlasAI codes without exposing arbitrary exception data', () => {
        const { response, host } = context();
        new GlobalExceptionFilter().catch(new HttpException({
            message: 'Daha net bir soru fotoğrafı yükleyin.', code: 'ATLAS_INPUT_UNREADABLE', privateData: 'private-fixture',
        }, 400), host);
        expect(response.json.mock.calls[0][0]).toMatchObject({ statusCode: 400, code: 'ATLAS_INPUT_UNREADABLE' });
        expect(JSON.stringify(response.json.mock.calls)).not.toContain('private-fixture');
    });

    it.each(['PRIVATE_SECRET', 'ATLAS_bad', 'ATLAS_' + 'A'.repeat(71), { secret: 'private-fixture' }])('omits an unrecognized error code', code => {
        const { response, host } = context();
        new GlobalExceptionFilter().catch(new HttpException({ message: 'İstek tamamlanamadı.', code }, 503), host);
        expect(response.json.mock.calls[0][0]).not.toHaveProperty('code');
    });
});
