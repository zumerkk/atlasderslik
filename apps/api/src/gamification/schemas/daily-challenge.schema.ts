import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyChallengeDocument = DailyChallenge & Document;

/**
 * One AI-generated bonus question per (day, grade). Generated lazily on the
 * first request of the day and reused for every student in that grade — so the
 * question rotates daily, is identical for classmates (fair), and costs one
 * model call per grade per day rather than one per page view.
 *
 * `correctLetter` and `explanation` are NEVER sent to a student before they
 * answer; the controller strips them and grading happens server-side.
 */
@Schema({ timestamps: true })
export class DailyChallenge {
    /** YYYY-MM-DD in Europe/Istanbul. */
    @Prop({ required: true, index: true })
    dateKey: string;

    @Prop({ required: true })
    gradeLevel: number;

    @Prop({ required: true })
    subject: string;

    @Prop({ required: true })
    questionText: string;

    @Prop({ type: [{ letter: String, text: String }], required: true })
    options: { letter: string; text: string }[];

    @Prop({ required: true })
    correctLetter: string;

    @Prop()
    explanation: string;

    /** True when the AI call failed and a curated fallback question was used. */
    @Prop({ default: false })
    isFallback: boolean;
}

export const DailyChallengeSchema = SchemaFactory.createForClass(DailyChallenge);

// One question per grade per day.
DailyChallengeSchema.index({ dateKey: 1, gradeLevel: 1 }, { unique: true });
