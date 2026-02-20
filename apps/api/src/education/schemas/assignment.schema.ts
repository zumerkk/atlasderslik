import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssignmentDocument = Assignment & Document;

@Schema({ timestamps: true })
export class Assignment {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    dueDate: Date;

    @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
    subjectId: Types.ObjectId;

    @Prop({ required: true })
    gradeLevel: number;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    teacherId: Types.ObjectId;

    @Prop({ default: 100 })
    maxScore: number;

    @Prop()
    instructions: string;

    // Optional: link to a specific LiveClass or Group if needed
    @Prop({ type: Types.ObjectId, ref: 'LiveClass' })
    classId: Types.ObjectId;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
