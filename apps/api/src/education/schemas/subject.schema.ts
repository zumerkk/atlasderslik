import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubjectDocument = Subject & Document;

@Schema({ timestamps: true })
export class Subject {
    @Prop({ required: true })
    name: string; // Matematik

    @Prop({ type: Number, required: true })
    gradeLevel: number; // 5, 6, 7, 8 (Easier lookup)

    @Prop()
    icon?: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);
// Compound index to prevent duplicate subject for same grade
SubjectSchema.index({ name: 1, gradeLevel: 1 }, { unique: true });
