import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@repo/shared';
import * as crypto from 'crypto';
import { publicUser } from './user-response';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async create(createUserDto: any): Promise<User> {
        const strength = this.validatePasswordStrength(createUserDto.password);
        if (!strength.valid) throw new BadRequestException(strength.message);
        const email = String(createUserDto.email || '').trim().toLowerCase();
        if (await this.findOneByEmail(email)) throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');
        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(createUserDto.password, salt);
        const createdUser = new this.userModel({
            ...Object.fromEntries(['firstName', 'lastName', 'grade', 'parentId', 'phone', 'address', 'city', 'registrationConsentAt', 'registrationTermsVersion', 'registrationPrivacyVersion', 'registrationGuardianId'].filter(key => createUserDto[key] !== undefined).map(key => [key, createUserDto[key]])),
            email,
            passwordHash: hash,
            role: createUserDto.role || UserRole.STUDENT, // Default Role
        });
        return createdUser.save();
    }

    async findOneByEmail(email: string): Promise<UserDocument | null> {
        if (typeof email !== 'string' || !email.trim()) return null;
        const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.userModel.findOne({ email: { $regex: `^${escaped}$`, $options: 'i' } }).exec();
    }
    async findAll(role?: string): Promise<User[]> {
        const filter: any = {};
        if (role) filter.role = role;
        return this.userModel.find(filter).select('-passwordHash').populate('parentId', 'firstName lastName email').exec();
    }

    async findOne(id: string): Promise<User | null> {
        return this.userModel.findById(id).select('-passwordHash').populate('parentId', 'firstName lastName email').exec();
    }

    async remove(id: string): Promise<User | null> {
        return this.userModel.findByIdAndDelete(id).exec();
    }

    async update(id: string, updateUserDto: any): Promise<User | null> {
        // Prevent mass-assignment of sensitive fields
        const sanitized: Record<string, any> = Object.fromEntries(['firstName', 'lastName', 'phone', 'address', 'city'].filter(key => updateUserDto[key] !== undefined).map(key => [key, updateUserDto[key]]));

        if (updateUserDto.password) {
            const validation = this.validatePasswordStrength(updateUserDto.password);
            if (!validation.valid) throw new BadRequestException(validation.message);
            const salt = await bcrypt.genSalt();
            sanitized.passwordHash = await bcrypt.hash(updateUserDto.password, salt);
        }
        return this.userModel.findByIdAndUpdate(id, { $set: sanitized, ...(sanitized.passwordHash ? { $inc: { sessionVersion: 1 } } : {}) }, { returnDocument: 'after', runValidators: true }).select('-passwordHash').populate('parentId', 'firstName lastName email').exec();
    }

    async assignParent(studentId: string, parentId: string): Promise<User | null> {
        if (!Types.ObjectId.isValid(studentId) || !Types.ObjectId.isValid(parentId)) throw new BadRequestException('Geçerli öğrenci ve veli seçin.');
        const [student, parent] = await Promise.all([this.userModel.findById(studentId), this.userModel.findById(parentId)]);
        if (!student?.isActive || student.role !== UserRole.STUDENT || !parent?.isActive || parent.role !== UserRole.PARENT) throw new BadRequestException('Aktif öğrenci ve aktif veli hesapları seçilmelidir.');
        return this.userModel.findByIdAndUpdate(
            studentId,
            { parentId: new Types.ObjectId(parentId) },
            { new: true }
        ).select('-passwordHash').populate('parentId', 'firstName lastName email').exec();
    }

    // ─── Password Management ─────────────────────────────────

    /**
     * Validate password strength: min 8 chars, at least 1 letter and 1 digit
     */
    validatePasswordStrength(password: string): { valid: boolean; message: string } {
        if (typeof password !== 'string' || password.length < 8) {
            return { valid: false, message: 'Şifre en az 8 karakter olmalıdır.' };
        }
        if (Buffer.byteLength(password, 'utf8') > 72) return { valid: false, message: 'Şifre UTF-8 biçiminde en fazla 72 bayt olabilir.' };
        if (!/\p{L}/u.test(password)) {
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
        const updated = await this.userModel.findByIdAndUpdate(id,
            { $set: { passwordHash: await bcrypt.hash(password, salt) }, $inc: { sessionVersion: 1 } },
            { returnDocument: 'after' }).exec();
        return publicUser(updated) as unknown as User;
    }

    async changeOwnPassword(id: string, currentPassword: string, newPassword: string) {
        const validation = this.validatePasswordStrength(newPassword);
        if (!validation.valid) throw new BadRequestException(validation.message);
        const user = await this.userModel.findById(id);
        if (!user?.isActive || !await bcrypt.compare(currentPassword, user.passwordHash)) return null;
        if (currentPassword === newPassword) throw new BadRequestException('Yeni şifre mevcut şifreden farklı olmalıdır.');
        const hash = await bcrypt.hash(newPassword, 10);
        // CAS prevents simultaneous changes from authorizing each other with an old password.
        return this.userModel.findOneAndUpdate({ _id: id, passwordHash: user.passwordHash, isActive: true },
            { $set: { passwordHash: hash }, $inc: { sessionVersion: 1 } }, { returnDocument: 'after' }).exec();
    }

    async setActive(id: string, isActive: boolean, actorId: string) {
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Geçersiz kullanıcı.');
        if (new Types.ObjectId(id).equals(actorId)) throw new BadRequestException('Kendi hesabınızın aktifliğini bu ekrandan değiştiremezsiniz.');
        await this.requireAdminTarget(actorId, id);
        const user = await this.userModel.findByIdAndUpdate(id, { $set: { isActive }, $inc: { sessionVersion: 1 } }, { returnDocument: 'after' }).exec();
        return publicUser(user);
    }

    async requireAdminTarget(actorId: string, targetId: string) {
        if (!Types.ObjectId.isValid(targetId)) throw new BadRequestException('Geçersiz kullanıcı.');
        const [actor, target] = await Promise.all([this.userModel.findById(actorId), this.userModel.findById(targetId)]);
        if (!actor?.isActive || ![UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role as UserRole)) throw new ForbiddenException();
        if (!target) throw new NotFoundException('Kullanıcı bulunamadı.');
        if (target.role === UserRole.SUPERADMIN && actor.role !== UserRole.SUPERADMIN) throw new ForbiddenException('Bu yönetici hesabını yalnız üst yönetici değiştirebilir.');
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
