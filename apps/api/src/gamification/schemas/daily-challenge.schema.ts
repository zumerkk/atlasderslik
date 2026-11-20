import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyChallengeDocument = DailyChallenge & Document;

/**
 * One verified bonus question per day and exact approved curriculum scope.
 * Students with the same class, subject permissions and curriculum revisions
 * share a question. Legacy questions without verification cannot be served.
 *
 * `correctLetter` and `explanation` are NEVER sent to a student before they
 * answer; the controller strips them and grading happens server-side.
 */
@Schema({ timestamps: true })
export class DailyChallenge {
    /** YYYY-MM-DD:curriculumHash, using Europe/Istanbul calendar dates. */
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

    @Prop() curriculumHash: string;
    @Prop() verifiedContentHash: string;
    @Prop({ type: [String], default: [] }) outcomeIds: string[];
}

export const DailyChallengeSchema = SchemaFactory.createForClass(DailyChallenge);

// One question per grade per day.
DailyChallengeSchema.index({ dateKey: 1, gradeLevel: 1 }, { unique: true });
