import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Package } from './package.schema';

export type OrderDocument = Order & Document;

export enum OrderStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

@Schema({ timestamps: true })
export class Order {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Package', required: true })
    package: Package;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Prop()
    paymentId: string;

    @Prop()
    iyzicoPaymentId: string;

    @Prop()
    iyzicoToken: string;

    @Prop()
    paidAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

