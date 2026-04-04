import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TestDocument = Test & Document;

@Schema({ timestamps: true })
export class Test {
    @Prop({ required: true })
    title: string;

    @Prop({ default: '' })
    description: string;

    @Prop({ required: true })
    gradeLevel: number;

    @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
    subjectId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    teacherId: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Question' }], default: [] })
    questionIds: Types.ObjectId[];

    @Prop({ default: 0 })
    duration: number; // dakika — 0 = süresiz

    @Prop({ default: true })
    isActive: boolean;
}

export const TestSchema = SchemaFactory.createForClass(Test);
