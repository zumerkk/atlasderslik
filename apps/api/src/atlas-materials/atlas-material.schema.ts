import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export interface AtlasMaterialContent {
  title: string;
  introduction: string;
  sections: { title: string; body: string; outcomeIds: string[] }[];
  questions: { question: string; answer: string; explanation: string; outcomeIds: string[] }[];
}

@Schema({ timestamps: true })
export class AtlasMaterial {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true }) ownerId: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId }) studentId?: Types.ObjectId;
  @Prop({ type: SchemaTypes.ObjectId, required: true }) topicId: Types.ObjectId;
  @Prop({ required: true }) title: string;
  @Prop({ enum: ['lesson', 'worksheet'], required: true }) kind: string;
  @Prop({ type: Object, required: true }) content: AtlasMaterialContent;
  @Prop({ type: Object, required: true }) curriculum: {
    topic: string; subject: string; gradeLevel: number; schoolYear: string;
    version: string; sourceUrl: string; sourceTitle: string;
    outcomes: { id: string; code: string; text: string }[];
  };
  @Prop({ required: true }) curriculumHash: string;
  // New independently reviewed materials carry a deterministic content digest.
  @Prop() contentHash?: string;
  @Prop({ default: 'atlas-a4-v1' }) templateVersion: string;
}
export const AtlasMaterialSchema = SchemaFactory.createForClass(AtlasMaterial);
