import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerStorageService } from '@nestjs/throttler';
import { AuthController } from './auth.controller';

describe('Auth endpoint rate limiting', () => {
    let storage: ThrottlerStorageService;
    let guard: ThrottlerGuard;

    beforeEach(async () => {
        storage = new ThrottlerStorageService();
        guard = new ThrottlerGuard([{ ttl: 60000, limit: 100 }], storage, new Reflector());
        await guard.onModuleInit();
    });

    afterEach(() => storage.onApplicationShutdown());

    function request(method: 'login' | 'register' | 'getProfile', ip = '192.0.2.10') {
        const response = { header: jest.fn() };
        const context = {
            getClass: () => AuthController,
            getHandler: () => AuthController.prototype[method],
            switchToHttp: () => ({
                getRequest: () => ({ ip, headers: {} }),
                getResponse: () => response,
            }),
        } as unknown as ExecutionContext;
        return { context, response };
    }

    it('enforces 20 login attempts despite the controller skip, and sends Retry-After', async () => {
        const { context, response } = request('login');
        for (let attempt = 0; attempt < 20; attempt++) {
            await expect(guard.canActivate(context)).resolves.toBe(true);
        }
        await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 429 });
        expect(response.header).toHaveBeenCalledWith('Retry-After', expect.any(Number));
        await expect(guard.canActivate(request('login', '192.0.2.11').context)).resolves.toBe(true);
    });

    it('enforces a separate five-request registration budget', async () => {
        const { context } = request('register');
        for (let attempt = 0; attempt < 5; attempt++) {
            await expect(guard.canActivate(context)).resolves.toBe(true);
        }
        await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 429 });
        await expect(guard.canActivate(request('login').context)).resolves.toBe(true);
    });

    it('preserves the existing profile throttle exemption', async () => {
        const increment = jest.spyOn(storage, 'increment');
        await expect(guard.canActivate(request('getProfile').context)).resolves.toBe(true);
        expect(increment).not.toHaveBeenCalled();
    });
});
