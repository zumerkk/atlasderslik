import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema({ timestamps: true })
export class Question {
    @Prop({ default: '' })
    text: string;

    @Prop({ type: [String], default: [] })
    options: string[]; // e.g. ["A) ...", "B) ...", "C) ...", "D) ..."]

    @Prop({ required: true })
    correctAnswer: number; // index of correct option (0-3)

    @Prop({ default: '' })
    objective: string; // Kazanım

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

    // ─── Photo-based question fields ────────────────────────
    @Prop({ default: '' })
    imageUrl: string; // Question image URL (photo of the question)

    @Prop({ default: 'TEST', enum: ['TEST', 'OPEN_ENDED'] })
    type: string; // TEST = multiple choice, OPEN_ENDED = open ended question

    @Prop({ type: [String], default: [] })
    optionImages: string[]; // Option images [A_url, B_url, C_url, D_url]
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
