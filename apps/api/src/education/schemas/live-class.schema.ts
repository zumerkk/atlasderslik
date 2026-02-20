import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LiveClassDocument = LiveClass & Document;

@Schema({ timestamps: true })
export class LiveClass {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    url: string; // The meeting link (Zoom, Google Meet, etc.)

    @Prop({ required: true })
    startTime: Date;

    @Prop({ required: true, default: 40 })
    durationMinutes: number;

    @Prop({ required: true })
    gradeLevel: number; // e.g., 8

    @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
    subjectId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    teacherId: Types.ObjectId;

    @Prop({ default: true })
    isActive: boolean;
}

export const LiveClassSchema = SchemaFactory.createForClass(LiveClass);
