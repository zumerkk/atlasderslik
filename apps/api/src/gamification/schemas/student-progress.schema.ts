import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, SchemaTypes } from 'mongoose';

export type StudentProgressDocument = StudentProgress & Document;

/**
 * Stores only what CANNOT be derived from real activity.
 *
 * Earned XP is always recomputed from submissions / optic results / challenge
 * answers, so it can never drift out of sync with the underlying data. What we
 * persist here is the part that has no other source of truth: how much XP the
 * student has spent, which titles they bought, and their answers to the daily
 * challenge (which also feed the activity streak).
 */
@Schema({ timestamps: true })
export class StudentProgress {
    @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, unique: true, index: true })
    studentId: Types.ObjectId;

    @Prop({ default: 0 })
    spentXp: number;

    @Prop({ type: [String], default: [] })
    unlockedTitles: string[];

    @Prop({ type: String, default: null })
    activeTitle: string | null;

    /** One entry per answered daily challenge. `date` is a YYYY-MM-DD key. */
    @Prop({
        type: [{
            date: String,
            subject: String,
            correct: Boolean,
            xpAwarded: Number,
            answeredAt: Date,
        }],
        default: [],
    })
    challengeLog: {
        date: string;
        subject: string;
        correct: boolean;
        xpAwarded: number;
        answeredAt: Date;
    }[];
}

export const StudentProgressSchema = SchemaFactory.createForClass(StudentProgress);
