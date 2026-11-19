import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { ROLES } from '@repo/shared';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService, private readonly users: UsersService) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret?.trim() || (process.env.NODE_ENV === 'production' && secret.length < 32)) {
            throw new Error('JWT_SECRET must be configured securely before authentication starts.');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: { sub?: unknown; sv?: unknown }) {
        if (typeof payload.sub !== 'string' || !Types.ObjectId.isValid(payload.sub)) throw new UnauthorizedException();
        const user = await this.users.findOne(payload.sub);
        if (!user?.isActive || !ROLES.includes(user.role as typeof ROLES[number])) throw new UnauthorizedException('Hesabınız artık aktif değil.');
        const version = payload.sv === undefined ? 0 : payload.sv;
        if (!Number.isInteger(version) || Number(version) < 0 || version !== (user.sessionVersion || 0)) throw new UnauthorizedException('Oturumunuz yenilenmeli. Yeniden giriş yapın.');
        return { userId: payload.sub, username: user.email, role: user.role };
    }
}
