import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudentEnrollmentDocument = StudentEnrollment & Document;

@Schema({ timestamps: true })
export class StudentEnrollment {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    studentId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Grade', required: true })
    gradeId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    parentId: Types.ObjectId;

    @Prop({ default: Date.now })
    enrollmentDate: Date;
}

export const StudentEnrollmentSchema = SchemaFactory.createForClass(StudentEnrollment);
