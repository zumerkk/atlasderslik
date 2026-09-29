import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import type { AtlasStudyPlan } from '@repo/shared';

export type AtlasSavedPlanDocument = AtlasSavedPlan & Document;

/** Only server-generated plans are stored. One current plan per account/student. */
@Schema({ timestamps: true })
export class AtlasSavedPlan {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ required: true })
  accessScope: string;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  plan: AtlasStudyPlan;

  @Prop({ type: [String], default: [] })
  completedBlockIds: string[];

  updatedAt: Date;
}

export const AtlasSavedPlanSchema = SchemaFactory.createForClass(AtlasSavedPlan);
AtlasSavedPlanSchema.index({ ownerId: 1, studentId: 1 }, { unique: true });
