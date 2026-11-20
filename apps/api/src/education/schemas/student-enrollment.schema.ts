import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaTypes } from 'mongoose';

export type StudentEnrollmentDocument = StudentEnrollment & Document;

@Schema({ _id: false })
export class PackageEnrollmentGrant {
    @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', required: true })
    orderId: Types.ObjectId;

    @Prop({ type: Date, required: true })
    startsAt: Date;

    @Prop({ type: Date })
    expiresAt?: Date;

    @Prop({ default: false })
    unlimited: boolean;

    @Prop({ required: true, enum: ['live', 'sandbox'] })
    environment: string;

    @Prop({ type: Date })
    revokedAt?: Date;
}

const PackageEnrollmentGrantSchema = SchemaFactory.createForClass(PackageEnrollmentGrant);

@Schema({ timestamps: true })
export class StudentEnrollment {
    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
    studentId: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'Grade', required: true })
    gradeId: Types.ObjectId;

    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: false })
    parentId: Types.ObjectId;

    @Prop({ default: Date.now })
    enrollmentDate: Date;

    // Records created before package access tracking are institution/manual grants.
    @Prop({ enum: ['manual', 'package'], default: 'manual' })
    accessSource: string;

    @Prop({ type: [PackageEnrollmentGrantSchema], default: [] })
    packageGrants: PackageEnrollmentGrant[];
}

export const StudentEnrollmentSchema = SchemaFactory.createForClass(StudentEnrollment);

// Prevent duplicate: same student in same grade
StudentEnrollmentSchema.index({ studentId: 1, gradeId: 1 }, { unique: true });

/** One access rule for course, video, assessment, analytics and AI queries. */
export function activePackageGrant(now = new Date()) {
    return { environment: 'live', startsAt: { $lte: now }, revokedAt: { $exists: false },
        $or: [{ unlimited: true }, { expiresAt: { $gt: now } }],
    };
}

export function enrollmentAccessState(row: { accessSource?: string; packageGrants?: PackageEnrollmentGrant[] }, now = new Date()) {
    const active = (row.packageGrants || []).filter(grant => grant.environment === 'live' && grant.revokedAt === undefined
        && new Date(grant.startsAt).getTime() <= now.getTime()
        && (grant.unlimited === true || (!!grant.expiresAt && new Date(grant.expiresAt).getTime() > now.getTime())));
    const manual = row.accessSource === undefined || row.accessSource === 'manual';
    const accessGranted = manual || (row.accessSource === 'package' && active.length > 0);
    const unlimited = manual || active.some(grant => grant.unlimited === true);
    return { accessGranted, activePaidGrant: active.length > 0,
        accessEndsAt: !accessGranted || unlimited ? null : new Date(Math.max(...active.map(grant => new Date(grant.expiresAt!).getTime()))),
    };
}

export function activeEnrollmentAccess(now = new Date()) {
    return { $or: [
        { accessSource: { $exists: false } },
        { accessSource: 'manual' },
        { accessSource: 'package', packageGrants: { $elemMatch: activePackageGrant(now) } },
    ] };
}

// Administrative inspection can opt into expired rows only in server code.
// Writes are deliberately not filtered: a renewal must update the same unique
// student/class row after its prior grant has expired.
StudentEnrollmentSchema.pre(['find', 'findOne', 'countDocuments', 'distinct'], function () {
    if (this.getOptions().includeExpiredEnrollments === true) return;
    this.setQuery({ $and: [this.getFilter(), activeEnrollmentAccess()] });
});
StudentEnrollmentSchema.pre('aggregate', function () {
    if (this.options.includeExpiredEnrollments === true) return;
    const first = this.pipeline()[0];
    const position = first && ('$geoNear' in first || '$search' in first || '$vectorSearch' in first) ? 1 : 0;
    this.pipeline().splice(position, 0, { $match: activeEnrollmentAccess() });
});
