import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@repo/shared';
import { ChangePasswordDto, CreateStudentDto, RegisterDto } from './dto/register.dto';
import { publicUser } from '../users/user-response';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService, private config: ConfigService) { }
    async validateUser(email: string, pass: string): Promise<any> {
        if (typeof email !== 'string' || typeof pass !== 'string') return null;
        const user = await this.usersService.findOneByEmail(email);
        if (!user?.isActive || !await bcrypt.compare(pass, user.passwordHash)) return null;
        return user;
    }
    async login(user: any) {
        const payload = { username: user.email, sub: String(user._id), role: user.role, sv: user.sessionVersion || 0 };
        return { access_token: this.jwtService.sign(payload), user: publicUser(user) };
    }
    async register(input: RegisterDto) {
        if (![UserRole.STUDENT, UserRole.PARENT].includes(input.role)) throw new BadRequestException('Öğrenci veya veli hesabı seçin.');
        if (input.termsAccepted !== true || input.privacyAccepted !== true) throw new BadRequestException('Üyelik bilgilendirmelerini onaylayın.');
        if (input.role === UserRole.STUDENT && (!Number.isInteger(input.grade) || input.grade! < 1 || input.grade! > 8)) throw new BadRequestException('Öğrencinin sınıfını seçin.');
        if (input.role === UserRole.PARENT && input.grade !== undefined) throw new BadRequestException('Veli hesabına öğrenci sınıfı atanamaz.');
        const user = await this.createAccount(input, {
            role: input.role, ...(input.role === UserRole.STUDENT ? { grade: input.grade } : {}), registrationConsentAt: new Date(),
            registrationTermsVersion: this.config.get('MEMBERSHIP_TERMS_VERSION') || 'terms-v2026-10-30',
            registrationPrivacyVersion: this.config.get('PRIVACY_POLICY_VERSION') || 'privacy-v2026-10-30',
        });
        return this.login(user);
    }
    private async createAccount(input: { firstName: string; lastName: string; email: string; password: string }, extra: Record<string, unknown>) {
        const validation = this.usersService.validatePasswordStrength(input.password);
        if (!validation.valid) throw new BadRequestException(validation.message);
        const email = input.email.trim().toLowerCase();
        if (await this.usersService.findOneByEmail(email)) throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');
        try {
            return await this.usersService.create({ firstName: input.firstName.trim(), lastName: input.lastName.trim(), email, password: input.password, ...extra });
        } catch (error) {
            if ((error as { code?: number })?.code === 11000) throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');
            throw error;
        }
    }
    async createStudent(actorId: string, input: CreateStudentDto) {
        const parent = await this.usersService.findOne(actorId);
        if (!parent?.isActive || parent.role !== UserRole.PARENT) throw new ForbiddenException('Öğrenci hesabını yalnız aktif veli oluşturabilir.');
        if (input.guardianConsent !== true) throw new BadRequestException('Yasal temsilci onayı gerekir.');
        const user = await this.createAccount(input, { role: UserRole.STUDENT, parentId: actorId, grade: input.grade,
            registrationGuardianId: actorId, registrationConsentAt: new Date(),
            registrationTermsVersion: this.config.get('MEMBERSHIP_TERMS_VERSION') || 'terms-v2026-10-30',
            registrationPrivacyVersion: this.config.get('PRIVACY_POLICY_VERSION') || 'privacy-v2026-10-30',
        });
        return publicUser(user);
    }
    async changePassword(actorId: string, input: ChangePasswordDto) {
        const updated = await this.usersService.changeOwnPassword(actorId, input.currentPassword, input.newPassword);
        if (!updated) throw new BadRequestException('Mevcut şifre doğrulanamadı.');
        return this.login(updated);
    }
}
