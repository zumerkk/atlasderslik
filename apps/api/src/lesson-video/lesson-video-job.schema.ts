import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type LessonVideoJobDocument = LessonVideoJob & Document;
export type LessonSummary = {
  overview: string;
  sections: { title: string; summary: string; outcomeIds: string[]; timestampSeconds: number }[];
  keyPoints: string[];
  excludedContentNote: string;
  coverage: { audioMinutes: number; sampledFrames: number; note: string };
};

@Schema({ timestamps: true })
export class LessonVideoJob {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Video', required: true }) videoId: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true }) requestedBy: Types.ObjectId;
  @Prop({ required: true }) sourceHash: string;
  @Prop({ required: true }) curriculumVersion: string;
  @Prop({ enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued' }) status: string;
  @Prop({ default: 0 }) attempts: number;
  @Prop() leaseUntil?: Date;
  @Prop() claimToken?: string;
  @Prop() progress?: string;
  @Prop() error?: string;
  @Prop({ type: SchemaTypes.Mixed }) summary?: LessonSummary;
  @Prop() completedAt?: Date;
  @Prop() nextAttemptAt?: Date;
}

export const LessonVideoJobSchema = SchemaFactory.createForClass(LessonVideoJob);
LessonVideoJobSchema.index({ videoId: 1, sourceHash: 1, curriculumVersion: 1 }, { unique: true });
LessonVideoJobSchema.index({ status: 1, nextAttemptAt: 1, leaseUntil: 1 });
LessonVideoJobSchema.index({ requestedBy: 1, createdAt: 1 });

export type LessonVideoQuotaDocument = LessonVideoQuota & Document;
@Schema()
export class LessonVideoQuota {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true }) userId: Types.ObjectId;
  @Prop({ required: true }) day: string;
  @Prop({ default: 0 }) count: number;
  @Prop({ required: true }) expiresAt: Date;
}
export const LessonVideoQuotaSchema = SchemaFactory.createForClass(LessonVideoQuota);
LessonVideoQuotaSchema.index({ userId: 1, day: 1 }, { unique: true });
LessonVideoQuotaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
