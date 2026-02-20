import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
    @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true })
    assignmentId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    studentId: Types.ObjectId;

    @Prop()
    fileUrl: string; // Link to the homework file

    @Prop()
    note: string; // Student note

    @Prop()
    grade: number; // 0-100

    @Prop()
    feedback: string; // Teacher feedback

    @Prop({ default: false })
    isLate: boolean;

    @Prop({ default: Date.now })
    submittedAt: Date;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
