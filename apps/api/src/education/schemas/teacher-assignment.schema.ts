import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeacherAssignmentDocument = TeacherAssignment & Document;

@Schema({ timestamps: true })
export class TeacherAssignment {
    @Prop({ type: Types.ObjectId, ref: 'Grade', required: true })
    gradeId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
    subjectId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    teacherId: Types.ObjectId;

    @Prop({ default: '' })
    notes: string;
}

export const TeacherAssignmentSchema = SchemaFactory.createForClass(TeacherAssignment);

// Unique compound index: one teacher per grade+subject combo (can be relaxed if needed)
TeacherAssignmentSchema.index({ gradeId: 1, subjectId: 1, teacherId: 1 }, { unique: true });
