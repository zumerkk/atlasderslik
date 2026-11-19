import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongoSchema, Types } from 'mongoose';

export interface CartQuoteSnapshot {
  amount: number;
  currency: 'TRY';
  period: string;
  packageName: string;
}

export type CartDocument = HydratedDocument<Cart>;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: MongoSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  revision: number;

  @Prop({ type: MongoSchema.Types.ObjectId, ref: 'Package' })
  packageId?: Types.ObjectId;

  @Prop({ type: MongoSchema.Types.ObjectId, ref: 'User' })
  studentId?: Types.ObjectId;

  @Prop({ type: Object })
  quoteSnapshot?: CartQuoteSnapshot;

  @Prop({ select: false })
  quoteFingerprint?: string;

  @Prop({ type: MongoSchema.Types.ObjectId, ref: 'Order' })
  checkoutOrderId?: Types.ObjectId;

  @Prop({ select: false })
  checkoutLeaseId?: string;

  @Prop({ select: false })
  checkoutLeaseExpiresAt?: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.index({ userId: 1 }, { unique: true });
