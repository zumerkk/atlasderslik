import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VideoDocument = Video & Document;

@Schema({ timestamps: true })
export class Video {
    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    videoUrl: string; // YouTube link or MP4 URL

    @Prop()
    durationMinutes: number;

    @Prop({ required: true })
    gradeLevel: number; // e.g., 8

    @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
    subjectId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Topic' })
    topicId: Types.ObjectId; // Optional: Link to specific topic

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    teacherId: Types.ObjectId;

    @Prop({ default: 0 })
    views: number;
}

export const VideoSchema = SchemaFactory.createForClass(Video);
