import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaTypes } from 'mongoose';

export type PackageDocument = Package & Document;

@Schema({ timestamps: true })
export class Package {
    @Prop({ required: true, trim: true, minlength: 2, maxlength: 120 })
    name: string;

    @Prop({ required: true, trim: true, minlength: 10, maxlength: 4000 })
    description: string;

    @Prop({ default: '', trim: true, maxlength: 180 })
    subtitle: string; // "Haftada 6 Ders | Maks 10 Kişi"

    @Prop({ required: true, min: 0.01, max: 9_999_999.99 })
    price: number;

    @Prop({ default: 0, min: 0, max: 9_999_999.99 })
    originalPrice: number; // Asıl fiyat (üstü çizili gösterilir, 0 ise gösterilmez)

    @Prop({ required: true, default: false })
    isActive: boolean;

    @Prop({ type: [String], default: [] })
    features: string[];

    @Prop({ default: '', trim: true, maxlength: 50 })
    badge: string; // "En Popüler", "VIP", or empty

    @Prop({ default: 0, min: 0, max: 10000 })
    sortOrder: number;

    @Prop({ default: 'monthly', enum: ['monthly', 'yearly', 'one-time'] })
    period: string;

    @Prop({ default: 'fixed', enum: ['fixed', 'student-level'] })
    gradePolicy: 'fixed' | 'student-level';

    // Fixed grants all same-level classes; student-level resolves exactly the
    // configured class matching the student's authoritative level at checkout.
    @Prop({ type: [SchemaTypes.ObjectId], ref: 'Grade', default: [] })
    gradeIds: Types.ObjectId[];
}

export const PackageSchema = SchemaFactory.createForClass(Package);
