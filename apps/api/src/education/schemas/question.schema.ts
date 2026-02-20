import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema({ timestamps: true })
export class Question {
    @Prop({ required: true })
    text: string;

    @Prop({ type: [String], required: true })
    options: string[]; // e.g. ["A) ...", "B) ...", "C) ...", "D) ..."]

    @Prop({ required: true })
    correctAnswer: number; // index of correct option (0-3)

    @Prop({ required: true })
    gradeLevel: number;

    @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
    subjectId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Unit', required: false })
    unitId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Topic', required: false })
    topicId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    teacherId: Types.ObjectId;

    @Prop({ default: 'MEDIUM', enum: ['EASY', 'MEDIUM', 'HARD'] })
    difficulty: string;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
