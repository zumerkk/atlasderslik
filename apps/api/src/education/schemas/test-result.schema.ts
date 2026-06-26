import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TestResultDocument = TestResult & Document;

@Schema({ timestamps: true })
export class TestResult {
    @Prop({ type: Types.ObjectId, ref: 'Test', required: true })
    testId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    studentId: Types.ObjectId;

    // questionId -> selectedOptionIndex (0-3), empty/skipped is saved as -1 or omitted
    @Prop({ type: Map, of: Number, required: true })
    answers: Map<string, number>;

    @Prop({ required: true })
    score: number; // percentage (0 to 100)

    @Prop({ required: true })
    correctCount: number;

    @Prop({ required: true })
    wrongCount: number;

    @Prop({ required: true })
    emptyCount: number;

    @Prop({ required: true, default: 0 })
    durationSeconds: number;
}

export const TestResultSchema = SchemaFactory.createForClass(TestResult);
