import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GradeDocument = Grade & Document;

@Schema({ timestamps: true })
export class Grade {
    @Prop({ required: true, unique: true, type: Number })
    level: number; // 5, 6, 7, 8

    @Prop({ default: true })
    isActive: boolean;
}

export const GradeSchema = SchemaFactory.createForClass(Grade);
