import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);

        if (user) {
            // Reject inactive users
            if (!user.isActive) {
                return null;
            }
            const isMatch = await bcrypt.compare(pass, user.passwordHash);
            if (isMatch) {
                const { passwordHash, ...result } = user.toObject();
                return result;
            }
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.email, sub: user._id.toString(), role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: user
        };
    }

    async register(createUserDto: any) {
        // Check if user exists? UsersService.create throws duplicate key error if exists
        return this.usersService.create(createUserDto);
    }
}
