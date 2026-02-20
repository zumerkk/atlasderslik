import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Subject } from './subject.schema';

export type UnitDocument = Unit & Document;

@Schema({ timestamps: true })
export class Unit {
    @Prop({ required: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
    subjectId: Types.ObjectId;

    @Prop({ type: Number, default: 0 })
    order: number;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);
