import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Unit } from './unit.schema';

export type TopicDocument = Topic & Document;

@Schema({ timestamps: true })
export class Topic {
    @Prop({ required: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
    unitId: Types.ObjectId;

    @Prop({ type: Number, default: 0 })
    order: number;

    @Prop()
    objective?: string; // Kazanım açıklaması
}

export const TopicSchema = SchemaFactory.createForClass(Topic);
