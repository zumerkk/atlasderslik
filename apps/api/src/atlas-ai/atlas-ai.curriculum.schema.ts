import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type AtlasCurriculumEntryDocument = AtlasCurriculumEntry & Document;

@Schema({ timestamps: true })
export class AtlasCurriculumEntry {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Topic', required: true }) topicId: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Grade', required: true }) gradeId: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Subject', required: true }) subjectId: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Unit', required: true }) unitId: Types.ObjectId;
  @Prop({ required: true }) schoolYear: string;
  @Prop({ required: true }) version: string;
  @Prop({ required: true, enum: ['TYMM', 'PREVIOUS'] }) program: 'TYMM' | 'PREVIOUS';
  @Prop({ required: true }) sourceUrl: string;
  @Prop({ required: true }) sourceTitle: string;
  @Prop({ required: true }) sourceLocator: string;
  @Prop({ type: [{ code: String, text: String }], default: [] }) outcomes: { code: string; text: string }[];
  @Prop({ required: true }) topicName: string;
  @Prop({ required: true }) unitName: string;
  @Prop({ required: true }) subjectName: string;
  @Prop({ required: true }) gradeLevel: number;
  @Prop({ required: true }) contentHash: string;
  @Prop({ enum: ['draft', 'approved', 'revoked'], default: 'draft' }) status: string;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true }) submittedBy: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' }) approvedBy?: Types.ObjectId;
  @Prop() approvedAt?: Date;
  @Prop() approvedHash?: string;
  @Prop({ default: '' }) reviewNote: string;
}

export const AtlasCurriculumEntrySchema = SchemaFactory.createForClass(AtlasCurriculumEntry);
AtlasCurriculumEntrySchema.index({ topicId: 1, gradeId: 1, schoolYear: 1 }, { unique: true });
AtlasCurriculumEntrySchema.index({ gradeId: 1, subjectId: 1, schoolYear: 1, status: 1 });
