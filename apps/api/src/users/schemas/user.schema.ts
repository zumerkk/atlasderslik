import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole, ROLES } from '@repo/shared';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    passwordHash: string;

    @Prop({ required: true })
    firstName: string;

    @Prop({ required: true })
    lastName: string;

    @Prop({ required: true, enum: ROLES, default: UserRole.STUDENT })
    role: string;

    @Prop({ default: true })
    isActive: boolean;

    // For Students
    @Prop({ required: false })
    grade: number; // e.g. 5, 6, 7, 8

    // For Teachers
    @Prop({ type: [{ type: String }], default: [] }) // Store Subject IDs as strings for now
    assignedSubjects: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
