import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@repo/shared';

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
}
