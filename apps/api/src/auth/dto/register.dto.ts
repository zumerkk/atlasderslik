import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { UserRole } from '@repo/shared';
const trimmed = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const email = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
export class AccountIdentityDto {
    @Transform(email) @IsEmail() @MaxLength(254) email: string;
    @IsString() @MinLength(8) @MaxLength(72)
    @Matches(/^(?=.*\p{L})(?=.*\d)[\s\S]+$/u, { message: 'Şifre en az bir harf ve bir rakam içermelidir.' }) password: string;
    @Transform(trimmed) @IsString() @MinLength(2) @MaxLength(80) firstName: string;
    @Transform(trimmed) @IsString() @MinLength(2) @MaxLength(80) lastName: string;
}
export class RegisterDto extends AccountIdentityDto {
    @IsIn([UserRole.STUDENT, UserRole.PARENT], { message: 'Kayıt için öğrenci veya veli hesabı seçin.' }) role: UserRole;
    @ValidateIf((value, grade) => value.role === UserRole.STUDENT || grade !== undefined)
    @IsInt() @Min(1) @Max(8) grade?: number;
    @Equals(true, { message: 'Kullanım koşullarını kabul etmelisiniz.' }) termsAccepted: boolean;
    @Equals(true, { message: 'Gizlilik ve kişisel veri bilgilendirmesini okuduğunuzu onaylayın.' }) privacyAccepted: boolean;
}
export class LoginDto {
    @Transform(email) @IsEmail() @MaxLength(254) email: string;
    @IsString() @MinLength(1) @MaxLength(256) password: string;
}
export class CreateStudentDto extends AccountIdentityDto {
    @IsInt() @Min(1) @Max(8) grade: number;
    @Equals(true, { message: 'Öğrencinin velisi/yasal temsilcisi olduğunuzu onaylayın.' }) guardianConsent: boolean;
}
export class ChangePasswordDto {
    @IsString() @MinLength(1) @MaxLength(256) currentPassword: string;
    @IsString() @MinLength(8) @MaxLength(72) @Matches(/^(?=.*\p{L})(?=.*\d)[\s\S]+$/u) newPassword: string;
}
export class UpdateProfileDto {
    @ValidateIf((_, value) => value !== undefined) @Transform(trimmed) @IsString() @MinLength(2) @MaxLength(80) firstName?: string;
    @ValidateIf((_, value) => value !== undefined) @Transform(trimmed) @IsString() @MinLength(2) @MaxLength(80) lastName?: string;
    @ValidateIf((_, value) => value !== undefined) @IsString() @MaxLength(20)
    @Matches(/^(?:|\+90[1-9]\d{9})$/, { message: 'Telefonu +90 biçiminde girin.' }) phone?: string;
}
