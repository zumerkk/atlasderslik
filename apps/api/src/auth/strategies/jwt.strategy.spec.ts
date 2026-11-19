import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy live account authority', () => {
    const id = '507f1f77bcf86cd799439011';
    const config = { get: () => 'test-only-long-secret-for-authentication' } as unknown as ConfigService;
    let users: { findOne: jest.Mock };
    let strategy: JwtStrategy;
    beforeEach(() => {
        users = { findOne: jest.fn().mockResolvedValue({ role: 'STUDENT', email: 'student@atlas.local', isActive: true }) };
        strategy = new JwtStrategy(config, users as unknown as UsersService);
    });

    it('uses current database role instead of the stale token privilege', async () => {
        const payload = { sub: id, role: 'ADMIN', username: 'forged@atlas.local' };
        expect(await strategy.validate(payload)).toEqual({ userId: id, role: 'STUDENT', username: 'student@atlas.local' });
        expect(users.findOne).toHaveBeenCalledWith(id);
    });

    it.each([null, { isActive: false, role: 'ADMIN' }, { isActive: true, role: 'UNKNOWN' }])('rejects removed, disabled or invalid accounts: %j', async (user) => {
        users.findOne.mockResolvedValue(user);
        await expect(strategy.validate({ sub: id })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it.each([undefined, '', 'not-an-id', { $ne: null }])('rejects invalid identity before querying: %j', async (sub) => {
        await expect(strategy.validate({ sub })).rejects.toBeInstanceOf(UnauthorizedException);
        expect(users.findOne).not.toHaveBeenCalled();
    });

    it('does not start authentication with a known fallback secret', () => {
        expect(() => new JwtStrategy({ get: () => '' } as unknown as ConfigService, users as unknown as UsersService)).toThrow('JWT_SECRET');
    });

    it('invalidates previously signed sessions after password reset or account status changes', async () => {
        users.findOne.mockResolvedValue({ role: 'STUDENT', isActive: true, email: 'student@atlas.local', sessionVersion: 2 });
        await expect(strategy.validate({ sub: id })).rejects.toBeInstanceOf(UnauthorizedException);
        await expect(strategy.validate({ sub: id, sv: 1 })).rejects.toBeInstanceOf(UnauthorizedException);
        await expect(strategy.validate({ sub: id, sv: 2 })).resolves.toMatchObject({ userId: id });
    });

    it.each([-1, '0', null, 0.5])('rejects malformed session versions %j', async (sv) => {
        await expect(strategy.validate({ sub: id, sv })).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
