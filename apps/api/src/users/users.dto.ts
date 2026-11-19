import { IsBoolean, IsIn, IsInt, IsMongoId, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { UserRole } from '@repo/shared';
import { AccountIdentityDto, UpdateProfileDto } from '../auth/dto/register.dto';

export class AdminCreateUserDto extends AccountIdentityDto {
    @IsIn([UserRole.STUDENT, UserRole.PARENT, UserRole.TEACHER, UserRole.ADMIN]) role: UserRole;
    @ValidateIf((value, grade) => value.role === UserRole.STUDENT || grade !== undefined)
    @IsInt() @Min(1) @Max(8) grade?: number;
}
export class AdminUpdateUserDto extends UpdateProfileDto {
    @ValidateIf((_, value) => value !== undefined) @IsString() @MinLength(8) @MaxLength(72)
    @Matches(/^(?=.*\p{L})(?=.*\d)[\s\S]+$/u) password?: string;
    @ValidateIf((_, value) => value !== undefined) @IsString() @MinLength(2) @MaxLength(80) city?: string;
    @ValidateIf((_, value) => value !== undefined) @IsString() @MinLength(10) @MaxLength(500) address?: string;
}
export class AssignParentDto { @IsMongoId() parentId: string; }
export class UserStatusDto { @IsBoolean() isActive: boolean; }
export class SetPasswordDto {
    @IsString() @MinLength(8) @MaxLength(72) @Matches(/^(?=.*\p{L})(?=.*\d)[\s\S]+$/u) password: string;
}
