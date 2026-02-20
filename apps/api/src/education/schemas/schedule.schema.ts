import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScheduleDocument = Schedule & Document;

@Schema({ timestamps: true })
export class Schedule {
    @Prop({ type: Types.ObjectId, ref: 'Grade', required: true })
    gradeId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
    subjectId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    teacherId: Types.ObjectId;

    @Prop({ required: true, min: 1, max: 5 })
    dayOfWeek: number; // 1=Pazartesi, 2=Salı, ..., 5=Cuma

    @Prop({ required: true })
    startTime: string; // "09:00"

    @Prop({ required: true })
    endTime: string; // "09:40"

    @Prop({ default: '' })
    room: string;

    @Prop({ default: true })
    isActive: boolean;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);

// Prevent double-booking: same grade, same day, same start time
ScheduleSchema.index({ gradeId: 1, dayOfWeek: 1, startTime: 1 }, { unique: true });
