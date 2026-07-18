import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaTypes } from 'mongoose';

export type AssignmentDocument = Assignment & Document;

@Schema({ timestamps: true })
export class Assignment {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    dueDate: Date;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Subject', required: true })
    subjectId: Types.ObjectId;

    @Prop({ required: true })
    gradeLevel: number;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Grade' })
    gradeId: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
    teacherId: Types.ObjectId;

    @Prop({ default: 100 })
    maxScore: number;

    @Prop()
    instructions: string;

    // Optional: link to a specific LiveClass or Group if needed
    @Prop({ type: SchemaTypes.ObjectId, ref: 'LiveClass' })
    classId: Types.ObjectId;

    @Prop({ type: [String], default: [] })
    attachments: string[]; // Öğretmenin eklediği dosyalar (resim/PDF URL)

    // Optic Form (Answer Sheet) Support
    @Prop({ default: false })
    isOpticTest: boolean;

    @Prop({ default: 4 })
    opticOptionsCount: number; // e.g., 4 (A-D) or 5 (A-E)

    @Prop({ type: [String], default: [] })
    answerKey: string[]; // e.g., ['A', 'B', 'C', 'C']
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
