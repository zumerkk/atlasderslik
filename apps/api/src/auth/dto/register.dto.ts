import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { UserRole } from '@repo/shared';

/** Roles allowed for self-registration (public endpoint) */
const SELF_REGISTER_ROLES = [UserRole.STUDENT, UserRole.PARENT, UserRole.TEACHER] as const;

export class RegisterDto {
    @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz.' })
    email: string;

    @IsString()
    @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
    password: string;

    @IsString({ message: 'Ad alanı zorunludur.' })
    @MinLength(2, { message: 'Ad en az 2 karakter olmalıdır.' })
    firstName: string;

    @IsString({ message: 'Soyad alanı zorunludur.' })
    @MinLength(2, { message: 'Soyad en az 2 karakter olmalıdır.' })
    lastName: string;

    @IsEnum(SELF_REGISTER_ROLES, {
        message: 'Geçersiz hesap türü. Yalnızca STUDENT, PARENT veya TEACHER seçilebilir.',
    })
    role: UserRole;

    @IsOptional()
    @IsNumber({}, { message: 'Sınıf geçerli bir sayı olmalıdır.' })
    grade?: number;
}
