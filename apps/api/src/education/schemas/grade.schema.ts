import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GradeDocument = Grade & Document;

@Schema({ timestamps: true })
export class Grade {
    @Prop({ required: true, type: Number })
    level: number;

    @Prop({ default: '' })
    label: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const GradeSchema = SchemaFactory.createForClass(Grade);
