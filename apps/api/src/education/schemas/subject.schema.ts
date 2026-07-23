import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaTypes } from 'mongoose';

export type SubjectDocument = Subject & Document;

@Schema({ timestamps: true })
export class Subject {
    @Prop({ required: true })
    name: string; // Matematik

    @Prop({ type: Number, required: true })
    gradeLevel: number; // 5, 6, 7, 8 (Easier lookup)

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Grade' })
    gradeId?: Types.ObjectId; // Reference to specific grade/class (e.g. 8. Sınıf SATÜRN)

    @Prop()
    icon?: string;

    @Prop({ default: true })
    isActive: boolean;

    // Zoom meeting link fields
    @Prop({ default: '' })
    zoomUrl: string;

    @Prop({ default: '' })
    zoomMeetingId: string;

    @Prop({ default: '' })
    zoomPasscode: string;
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);

