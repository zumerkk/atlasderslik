import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@repo/shared';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async create(createUserDto: any): Promise<User> {
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(createUserDto.password, salt);
        const createdUser = new this.userModel({
            ...createUserDto,
            passwordHash: hash,
            role: createUserDto.role || UserRole.STUDENT, // Default Role
        });
        return createdUser.save();
    }

    async findOneByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).exec();
    }
    async findAll(): Promise<User[]> {
        return this.userModel.find().select('-passwordHash').exec();
    }

    async findOne(id: string): Promise<User | null> {
        return this.userModel.findById(id).select('-passwordHash').exec();
    }

    async remove(id: string): Promise<User | null> {
        return this.userModel.findByIdAndDelete(id).exec();
    }

    async update(id: string, updateUserDto: any): Promise<User | null> {
        if (updateUserDto.password) {
            const salt = await bcrypt.genSalt();
            updateUserDto.passwordHash = await bcrypt.hash(updateUserDto.password, salt);
            delete updateUserDto.password;
        }
        return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).select('-passwordHash').exec();
    }

    // ─── Password Management ─────────────────────────────────

    /**
     * Validate password strength: min 8 chars, at least 1 letter and 1 digit
     */
    validatePasswordStrength(password: string): { valid: boolean; message: string } {
        if (!password || password.length < 8) {
            return { valid: false, message: 'Şifre en az 8 karakter olmalıdır.' };
        }
        if (!/[a-zA-Z]/.test(password)) {
            return { valid: false, message: 'Şifre en az bir harf içermelidir.' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'Şifre en az bir rakam içermelidir.' };
        }
        return { valid: true, message: '' };
    }

    /**
     * Generate a random secure password (10 chars: letters + digits + special)
     */
    generateRandomPassword(): string {
        const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
        const bytes = crypto.randomBytes(10);
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += charset[bytes[i] % charset.length];
        }
        // Ensure at least one letter, one digit, one special char
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        if (!hasLetter) password = password.slice(0, -2) + 'Ax';
        if (!hasDigit) password = password.slice(0, -1) + '7';
        return password;
    }

    /**
     * Set a user's password (admin action). Returns the user without passwordHash.
     */
    async setPassword(id: string, password: string): Promise<User> {
        const validation = this.validatePasswordStrength(password);
        if (!validation.valid) {
            throw new BadRequestException(validation.message);
        }

        const user = await this.userModel.findById(id);
        if (!user) {
            throw new NotFoundException('Kullanıcı bulunamadı.');
        }

        const salt = await bcrypt.genSalt();
        user.passwordHash = await bcrypt.hash(password, salt);
        await user.save();

        const { passwordHash: _, ...result } = user.toObject();
        return result as unknown as User;
    }

    /**
     * Generate a random password for a user. Returns { user, temporaryPassword }.
     */
    async generatePassword(id: string): Promise<{ user: User; temporaryPassword: string }> {
        const temporaryPassword = this.generateRandomPassword();
        const user = await this.setPassword(id, temporaryPassword);
        return { user, temporaryPassword };
    }
}
