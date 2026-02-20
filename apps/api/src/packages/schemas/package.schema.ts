import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PackageDocument = Package & Document;

@Schema({ timestamps: true })
export class Package {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ default: '' })
    subtitle: string; // "Haftada 6 Ders | Maks 10 Kişi"

    @Prop({ required: true })
    price: number;

    @Prop({ required: true, default: true })
    isActive: boolean;

    @Prop()
    features: string[];

    @Prop({ default: '' })
    badge: string; // "En Popüler", "VIP", or empty

    @Prop({ default: 0 })
    sortOrder: number;

    @Prop({ default: 'monthly', enum: ['monthly', 'yearly', 'one-time'] })
    period: string;
}

export const PackageSchema = SchemaFactory.createForClass(Package);
