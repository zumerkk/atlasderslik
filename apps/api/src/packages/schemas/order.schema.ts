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

export enum FulfillmentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    FULFILLED = 'FULFILLED',
    FAILED = 'FAILED',
    SKIPPED_SANDBOX = 'SKIPPED_SANDBOX',
}

@Schema({ timestamps: true })
export class Order {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Package', required: true })
    package: Package;

    @Prop({ required: true })
    amount: number;

    @Prop({ default: 'TRY', enum: ['TRY'] })
    currency: string;

    @Prop({ enum: ['sandbox', 'live'] })
    paymentEnvironment: string;

    @Prop({ default: '' })
    packageName: string;

    @Prop()
    packageDescription?: string;

    @Prop()
    packageSubtitle?: string;

    @Prop({ type: [String], default: undefined })
    packageFeatures?: string[];

    @Prop({ default: 'monthly', enum: ['monthly', 'yearly', 'one-time'] })
    packagePeriod: string;

    @Prop({ enum: ['fixed', 'student-level'] })
    packageGradePolicy?: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    beneficiary: User;

    @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'Grade', default: [] })
    gradeIds: MongooseSchema.Types.ObjectId[];

    @Prop({ select: false })
    pendingCheckoutKey?: string;

    @Prop({ required: true, enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Prop()
    paymentId: string;

    @Prop()
    iyzicoPaymentId: string;

    @Prop({ select: false })
    iyzicoToken: string;

    @Prop({ select: false })
    providerWebhookFingerprint?: string;

    @Prop({ select: false })
    providerWebhookLeaseId?: string;

    @Prop({ select: false })
    providerWebhookLeaseExpiresAt?: Date;

    @Prop({ select: false })
    paymentPageUrl: string;

    @Prop()
    checkoutExpiresAt: Date;

    @Prop()
    checkoutInitializedAt: Date;

    @Prop()
    accessStartsAt: Date;

    @Prop()
    validUntil: Date;

    @Prop()
    fulfillmentAt: Date;

    @Prop({ enum: FulfillmentStatus, default: FulfillmentStatus.PENDING })
    fulfillmentStatus: FulfillmentStatus;

    @Prop({ default: 0 })
    fulfillmentAttempts: number;

    @Prop()
    fulfillmentError: string;

    @Prop({ select: false })
    fulfillmentLeaseId: string;

    @Prop({ select: false })
    fulfillmentLeaseExpiresAt: Date;

    @Prop()
    providerPaymentStatus: string;

    @Prop()
    providerFraudStatus: number;

    @Prop()
    providerVerifiedAt: Date;

    @Prop()
    iyzicoPaymentTransactionId: string;

    @Prop()
    providerPaidPrice: number;

    @Prop()
    lastReconciledAt: Date;

    @Prop()
    reconciliationError: string;

    @Prop()
    cancelledAt: Date;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    cancelledBy: User;

    @Prop({ enum: ['NONE', 'REQUESTED'], default: 'NONE' })
    refundRequestStatus: string;

    @Prop()
    refundRequestedAt: Date;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    refundRequestedBy: User;

    @Prop({ select: false })
    refundReason: string;

    @Prop()
    termsAcceptedAt: Date;

    @Prop({ type: Object })
    sellerSnapshot: Record<string, string | boolean>;

    @Prop()
    termsVersion: string;

    @Prop()
    privacyAcceptedAt: Date;

    @Prop()
    privacyVersion: string;

    @Prop()
    salesAgreementAcceptedAt: Date;

    @Prop()
    salesAgreementVersion: string;

    @Prop()
    preInformationVersion: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Cart' })
    cartId?: MongooseSchema.Types.ObjectId;

    @Prop()
    cartRevision?: number;

    @Prop({ select: false })
    displayedQuoteHash?: string;

    @Prop({ select: false })
    termsAcceptedIp: string;

    @Prop()
    failureCode: string;

    @Prop()
    paidAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Partial indexes exclude legacy nulls and guarantee idempotence across API replicas.
OrderSchema.index({ pendingCheckoutKey: 1 }, { unique: true, partialFilterExpression: { pendingCheckoutKey: { $type: 'string' } } });
OrderSchema.index({ iyzicoToken: 1 }, { unique: true, partialFilterExpression: { iyzicoToken: { $type: 'string' } } });
OrderSchema.index({ paymentEnvironment: 1, iyzicoPaymentId: 1 }, {
    unique: true,
    partialFilterExpression: { paymentEnvironment: { $type: 'string' }, iyzicoPaymentId: { $type: 'string' } },
});
OrderSchema.index({ createdAt: -1, _id: -1 });
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ beneficiary: 1, createdAt: -1 });
