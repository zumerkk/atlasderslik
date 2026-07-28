import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiService } from './ai.service';
import { StudentProgress, StudentProgressDocument } from './schemas/student-progress.schema';
import { DailyChallenge, DailyChallengeDocument } from './schemas/daily-challenge.schema';
import { Submission, SubmissionDocument } from '../education/schemas/submission.schema';
import { StudentEnrollment, StudentEnrollmentDocument } from '../education/schemas/student-enrollment.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

/**
 * XP economy. Everything except `STREAK_DAY` is earned from a concrete,
 * verifiable record in the database, so a student's XP can always be
 * recomputed from scratch and audited.
 */
export const XP = {
    OPTIC_TEST: 50,      // per optic test completed
    CORRECT_ANSWER: 10,  // per correct optic answer
    ASSIGNMENT: 30,      // per non-optic assignment submitted
    ON_TIME_BONUS: 20,   // submitted before the deadline
    CHALLENGE_CORRECT: 50,
    CHALLENGE_ATTEMPT: 5, // consolation XP for trying
    STREAK_DAY: 25,      // per consecutive active day
} as const;

export const STORE_ITEMS = [
    { id: 'focus', title: 'Odak Ustası', cost: 100, icon: '🎯' },
    { id: 'math', title: 'Matematik Profesörü', cost: 200, icon: '🎓' },
    { id: 'science', title: 'Fen Bilimi Üstadı', cost: 300, icon: '🔬' },
    { id: 'turkish', title: 'Türkçe Kalemi', cost: 300, icon: '✒️' },
    { id: 'genius', title: 'Sınav Dâhisi', cost: 500, icon: '⚡' },
    { id: 'marathon', title: 'Maraton Koşucusu', cost: 750, icon: '🏃' },
    { id: 'champion', title: 'LGS Şampiyonu', cost: 1000, icon: '🏆' },
    { id: 'legend', title: 'Atlas Efsanesi', cost: 2000, icon: '👑' },
] as const;

/** Official LGS subject weights (katsayı) and question counts. */
const LGS_SUBJECTS = [
    { match: ['türkçe'], weight: 4, questions: 20 },
    { match: ['matematik'], weight: 4, questions: 20 },
    { match: ['fen'], weight: 4, questions: 20 },
    { match: ['inkılap', 'inkilap', 'tarih'], weight: 1, questions: 10 },
    { match: ['din'], weight: 1, questions: 10 },
    { match: ['ingilizce', 'i̇ngilizce'], weight: 1, questions: 10 },
];
const LGS_MAX_WEIGHTED = LGS_SUBJECTS.reduce((s, x) => s + x.weight * x.questions, 0); // 270

@Injectable()
export class GamificationService {
    private readonly logger = new Logger(GamificationService.name);

    constructor(
        @InjectModel(StudentProgress.name) private progressModel: Model<StudentProgressDocument>,
        @InjectModel(DailyChallenge.name) private challengeModel: Model<DailyChallengeDocument>,
        @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
        @InjectModel(StudentEnrollment.name) private enrollmentModel: Model<StudentEnrollmentDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly ai: AiService,
    ) { }

    // ─── helpers ────────────────────────────────────────

    /** Both string and ObjectId student ids exist in this database (legacy data). */
    private idMatch(studentId: string) {
        const oid = Types.ObjectId.isValid(studentId) ? new Types.ObjectId(studentId) : null;
        return oid ? { $in: [oid, studentId.toString()] as any } : studentId.toString();
    }

    /** YYYY-MM-DD in Europe/Istanbul, so "today" matches the students' day. */
    private dateKey(d: Date = new Date()): string {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(d);
    }

    private async getOrCreateProgress(studentId: string): Promise<StudentProgressDocument> {
        const sid = Types.ObjectId.isValid(studentId) ? new Types.ObjectId(studentId) : studentId;
        const existing = await this.progressModel.findOne({ studentId: sid as any }).exec();
        if (existing) return existing;
        return this.progressModel.create({ studentId: sid, spentXp: 0, unlockedTitles: [], challengeLog: [] });
    }

    /** Only show a first name + last initial — these boards are visible to classmates. */
    private maskName(first?: string, last?: string): string {
        const f = (first || '').trim();
        const l = (last || '').trim();
        if (!f && !l) return 'Öğrenci';
        return l ? `${f} ${l.charAt(0).toUpperCase()}.` : f;
    }

    // ─── XP + streak ────────────────────────────────────

    /**
     * Recomputes earned XP from real records. Returns the breakdown too, so the
     * UI can show students exactly where their points came from.
     */
    async getXpSummary(studentId: string) {
        const [subs, progress] = await Promise.all([
            this.submissionModel.find({ studentId: this.idMatch(studentId) as any })
                .select('opticResult submittedAt isLate assignmentId')
                .lean().exec(),
            this.getOrCreateProgress(studentId),
        ]);

        const opticSubs = subs.filter((s: any) => s.opticResult);
        const totalCorrect = opticSubs.reduce((a: number, s: any) => a + (s.opticResult?.correct || 0), 0);
        const plainSubs = subs.length - opticSubs.length;
        const onTime = subs.filter((s: any) => !s.isLate).length;

        const challengeCorrect = progress.challengeLog.filter((c) => c.correct).length;
        const challengeAttempts = progress.challengeLog.length;

        const streak = this.computeStreak(
            subs.map((s: any) => s.submittedAt).filter(Boolean),
            progress.challengeLog.map((c) => c.date),
        );

        const breakdown = [
            { label: 'Optik test çözümü', count: opticSubs.length, xp: opticSubs.length * XP.OPTIC_TEST },
            { label: 'Doğru cevaplar', count: totalCorrect, xp: totalCorrect * XP.CORRECT_ANSWER },
            { label: 'Ödev teslimi', count: plainSubs, xp: plainSubs * XP.ASSIGNMENT },
            { label: 'Zamanında teslim', count: onTime, xp: onTime * XP.ON_TIME_BONUS },
            { label: 'Günün sorusu (doğru)', count: challengeCorrect, xp: challengeCorrect * XP.CHALLENGE_CORRECT },
            { label: 'Günün sorusu (katılım)', count: challengeAttempts, xp: challengeAttempts * XP.CHALLENGE_ATTEMPT },
            { label: 'Çalışma serisi', count: streak.current, xp: streak.current * XP.STREAK_DAY },
        ];

        const earnedXp = breakdown.reduce((a, b) => a + b.xp, 0);

        return {
            earnedXp,
            spentXp: progress.spentXp,
            availableXp: Math.max(0, earnedXp - progress.spentXp),
            breakdown: breakdown.filter((b) => b.count > 0),
            streak,
            unlockedTitles: progress.unlockedTitles,
            activeTitle: progress.activeTitle || null,
            stats: {
                opticCount: opticSubs.length,
                totalCorrect,
                submissionCount: subs.length,
                challengeCorrect,
            },
        };
    }

    /**
     * Consecutive active days ending today (or yesterday — a streak shouldn't
     * break until the day is actually over).
     */
    private computeStreak(submissionDates: Date[], challengeDates: string[]) {
        const days = new Set<string>();
        submissionDates.forEach((d) => days.add(this.dateKey(new Date(d))));
        challengeDates.forEach((d) => days.add(d));

        if (days.size === 0) return { current: 0, longest: 0, activeDays: 0, lastActive: null as string | null };

        const sorted = [...days].sort();
        const today = this.dateKey();
        const yesterday = this.dateKey(new Date(Date.now() - 86400000));

        // Longest run anywhere in the history.
        let longest = 1, run = 1;
        for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1] + 'T00:00:00Z').getTime();
            const cur = new Date(sorted[i] + 'T00:00:00Z').getTime();
            run = (cur - prev === 86400000) ? run + 1 : 1;
            longest = Math.max(longest, run);
        }

        // Current run only counts if it reaches today or yesterday.
        let current = 0;
        const last = sorted[sorted.length - 1];
        if (last === today || last === yesterday) {
            current = 1;
            for (let i = sorted.length - 1; i > 0; i--) {
                const prev = new Date(sorted[i - 1] + 'T00:00:00Z').getTime();
                const cur = new Date(sorted[i] + 'T00:00:00Z').getTime();
                if (cur - prev === 86400000) current++; else break;
            }
        }

        return { current, longest, activeDays: days.size, lastActive: last };
    }

    // ─── leaderboard ────────────────────────────────────

    /**
     * Real weekly ranking built from optic submissions in the last 7 days.
     * Scoped to the requesting student's grade so students compete with their
     * own class rather than the whole school.
     */
    async getLeaderboard(studentId: string, limit = 10) {
        const enrollments = await this.enrollmentModel.find({ studentId: this.idMatch(studentId) as any })
            .populate('gradeId', 'level label').lean().exec();
        const gradeIds = enrollments.map((e: any) => e.gradeId?._id || e.gradeId).filter(Boolean);
        const gradeLabel = (enrollments[0] as any)?.gradeId?.label || null;

        // Everyone enrolled in the same grade(s).
        const peers = await this.enrollmentModel.find({ gradeId: { $in: gradeIds } })
            .select('studentId').lean().exec();
        const peerIds = [...new Set(peers.map((p: any) => p.studentId?.toString()).filter(Boolean))];
        if (!peerIds.length) return { gradeLabel, weekly: [], allTime: [], me: null };

        const peerMatch = peerIds.flatMap((id) => Types.ObjectId.isValid(id) ? [new Types.ObjectId(id), id] : [id]);
        const weekAgo = new Date(Date.now() - 7 * 86400000);

        const rank = async (since?: Date) => {
            const rows = await this.submissionModel.aggregate([
                {
                    $match: {
                        studentId: { $in: peerMatch },
                        opticResult: { $exists: true, $ne: null },
                        ...(since ? { submittedAt: { $gte: since } } : {}),
                    },
                },
                {
                    $group: {
                        _id: '$studentId',
                        tests: { $sum: 1 },
                        correct: { $sum: '$opticResult.correct' },
                        incorrect: { $sum: '$opticResult.incorrect' },
                        scoreSum: { $sum: '$opticResult.score' },
                    },
                },
            ]).exec();

            const enriched = rows.map((r: any) => {
                const net = Math.max(0, r.correct - r.incorrect / 4);
                return {
                    studentId: r._id?.toString(),
                    tests: r.tests,
                    net: Number(net.toFixed(2)),
                    avgNet: Number((net / Math.max(1, r.tests)).toFixed(2)),
                    avgScore: Math.round(r.scoreSum / Math.max(1, r.tests)),
                    points: Math.round(net * 10 + r.tests * 5),
                };
            }).sort((a, b) => b.points - a.points);

            const ids = enriched.map((e) => e.studentId).filter(Boolean);
            const users = await this.userModel.find({ _id: { $in: ids.filter((i) => Types.ObjectId.isValid(i)) } })
                .select('firstName lastName').lean().exec();
            const nameMap = new Map(users.map((u: any) => [u._id.toString(), this.maskName(u.firstName, u.lastName)]));

            return enriched.map((e, i) => ({
                rank: i + 1,
                name: nameMap.get(e.studentId) || 'Öğrenci',
                isMe: e.studentId === studentId.toString(),
                ...e,
            }));
        };

        const [weekly, allTime] = await Promise.all([rank(weekAgo), rank()]);
        const me = weekly.find((w) => w.isMe) || allTime.find((a) => a.isMe) || null;

        return {
            gradeLabel,
            weekly: weekly.slice(0, limit),
            allTime: allTime.slice(0, limit),
            me,
            peerCount: peerIds.length,
        };
    }

    // ─── weak spots ─────────────────────────────────────

    /** Real per-subject accuracy from the student's own optic submissions. */
    async getWeakSpots(studentId: string) {
        const rows = await this.submissionModel.aggregate([
            { $match: { studentId: this.idMatch(studentId) as any, opticResult: { $exists: true, $ne: null } } },
            { $lookup: { from: 'assignments', localField: 'assignmentId', foreignField: '_id', as: 'a' } },
            { $unwind: { path: '$a', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'subjects', localField: 'a.subjectId', foreignField: '_id', as: 's' } },
            { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ['$s.name', 'Genel'] },
                    tests: { $sum: 1 },
                    correct: { $sum: '$opticResult.correct' },
                    incorrect: { $sum: '$opticResult.incorrect' },
                    empty: { $sum: '$opticResult.empty' },
                },
            },
        ]).exec();

        const subjects = rows.map((r: any) => {
            const attempted = r.correct + r.incorrect + r.empty;
            const accuracy = attempted > 0 ? Math.round((r.correct / attempted) * 100) : 0;
            const net = Math.max(0, r.correct - r.incorrect / 4);
            return {
                subject: r._id,
                tests: r.tests,
                correct: r.correct,
                incorrect: r.incorrect,
                empty: r.empty,
                questions: attempted,
                net: Number(net.toFixed(2)),
                accuracy,
                level: accuracy >= 75 ? 'strong' : accuracy >= 55 ? 'medium' : 'weak',
            };
        }).sort((a, b) => a.accuracy - b.accuracy);

        return {
            hasData: subjects.length > 0,
            subjects,
            weakest: subjects.filter((s) => s.level !== 'strong').slice(0, 3).map((s) => s.subject),
        };
    }

    // ─── LGS simulation ─────────────────────────────────

    /**
     * Weighted-net LGS estimate using the official subject coefficients
     * (Türkçe/Matematik/Fen ×4, others ×1). A real LGS score also depends on
     * nationwide standardisation, so this is explicitly an estimate — subjects
     * the student has no data for are left out of the weighting rather than
     * assumed to be zero.
     */
    async getLgsSimulation(studentId: string) {
        const weak = await this.getWeakSpots(studentId);
        if (!weak.hasData) {
            return { hasData: false, estimatedScore: null, weightedNet: 0, coverage: 0, subjects: [], targets: [] };
        }

        let weightedNet = 0;
        let coveredWeight = 0;
        const detail: any[] = [];

        for (const def of LGS_SUBJECTS) {
            const found = weak.subjects.find((s) =>
                def.match.some((m) => s.subject.toLocaleLowerCase('tr').includes(m)));
            if (!found) continue;
            // Scale the student's accuracy onto that subject's real question count.
            const projectedNet = (found.accuracy / 100) * def.questions;
            weightedNet += projectedNet * def.weight;
            coveredWeight += def.weight * def.questions;
            detail.push({
                subject: found.subject,
                accuracy: found.accuracy,
                projectedNet: Number(projectedNet.toFixed(1)),
                maxNet: def.questions,
                weight: def.weight,
            });
        }

        if (coveredWeight === 0) {
            return { hasData: false, estimatedScore: null, weightedNet: 0, coverage: 0, subjects: [], targets: [] };
        }

        // Project the covered subjects onto the full exam.
        const projectedFull = (weightedNet / coveredWeight) * LGS_MAX_WEIGHTED;
        const estimatedScore = Math.round(195 + (projectedFull / LGS_MAX_WEIGHTED) * 305);
        const coverage = Math.round((coveredWeight / LGS_MAX_WEIGHTED) * 100);

        const targets = [
            { name: 'Fen Lisesi (üst düzey)', minScore: 480 },
            { name: 'Sosyal Bilimler Lisesi', minScore: 450 },
            { name: 'Nitelikli Anadolu Lisesi', minScore: 420 },
            { name: 'Anadolu Lisesi', minScore: 350 },
        ].map((t) => ({ ...t, reached: estimatedScore >= t.minScore, gap: Math.max(0, t.minScore - estimatedScore) }));

        return {
            hasData: true,
            estimatedScore: Math.min(500, Math.max(195, estimatedScore)),
            weightedNet: Number((projectedFull / 4).toFixed(1)),
            coverage,
            subjects: detail,
            targets,
        };
    }

    // ─── daily challenge ────────────────────────────────

    private fallbackQuestion(gradeLevel: number) {
        return {
            subject: 'Matematik',
            questionText: '2⁸ × 5⁶ işleminin sonucu kaç basamaklı bir sayıdır?',
            options: [
                { letter: 'A', text: '6 basamaklı' },
                { letter: 'B', text: '7 basamaklı' },
                { letter: 'C', text: '8 basamaklı' },
                { letter: 'D', text: '9 basamaklı' },
            ],
            correctLetter: 'B',
            explanation: '2⁸ × 5⁶ = 2² × (2⁶ × 5⁶) = 4 × 10⁶ = 4.000.000 → 7 basamaklıdır.',
            isFallback: true,
        };
    }

    /** Today's question for the student's grade, generating it once per day. */
    async getDailyChallenge(studentId: string) {
        const enrollments = await this.enrollmentModel.find({ studentId: this.idMatch(studentId) as any })
            .populate('gradeId', 'level').lean().exec();
        const gradeLevel = (enrollments[0] as any)?.gradeId?.level || 8;
        const dateKey = this.dateKey();

        let challenge = await this.challengeModel.findOne({ dateKey, gradeLevel }).lean().exec();
        if (!challenge) challenge = await this.generateChallenge(dateKey, gradeLevel);
        if (!challenge) {
            // AI unavailable and the racing write also failed — serve the static question.
            challenge = { dateKey, gradeLevel, ...this.fallbackQuestion(gradeLevel) } as any;
        }
        const q = challenge as NonNullable<typeof challenge>;

        const progress = await this.getOrCreateProgress(studentId);
        const answered = progress.challengeLog.find((c) => c.date === dateKey);

        return {
            id: (q as any)._id?.toString(),
            subject: q.subject,
            questionText: q.questionText,
            // Correct answer is deliberately withheld until the student answers.
            options: q.options.map((o) => ({ letter: o.letter, text: o.text })),
            alreadyAnswered: !!answered,
            ...(answered ? {
                correctLetter: q.correctLetter,
                explanation: q.explanation,
                wasCorrect: answered.correct,
            } : {}),
        };
    }

    /** Rotates subject by day so students don't get the same subject repeatedly. */
    private async generateChallenge(dateKey: string, gradeLevel: number) {
        const subjects = ['Matematik', 'Fen Bilimleri', 'Türkçe', 'T.C. İnkılap Tarihi', 'İngilizce', 'Din Kültürü'];
        const dayIndex = Math.floor(new Date(dateKey + 'T00:00:00Z').getTime() / 86400000);
        const subject = subjects[dayIndex % subjects.length];

        const parsed = await this.ai.chatJson<any>({
            system:
                'Sen Türk Milli Eğitim müfredatına hakim bir soru yazarısın. Verilen sınıf seviyesi ve ders için ' +
                'MEB müfredatına uygun, tek doğru cevabı olan 4 şıklı bir çoktan seçmeli soru üret. ' +
                'SADECE şu JSON şemasında yanıt ver: {"questionText": string, "options": [{"letter":"A","text":string}, ' +
                '{"letter":"B","text":string}, {"letter":"C","text":string}, {"letter":"D","text":string}], ' +
                '"correctLetter": "A"|"B"|"C"|"D", "explanation": string}. ' +
                'Açıklama, çözümü adım adım ve Türkçe anlatmalı. Şıklardan tam olarak biri doğru olmalı.',
            user: `Sınıf seviyesi: ${gradeLevel}. Ders: ${subject}. Zorluk: orta. Bugünün tarihi: ${dateKey}.`,
            temperature: 0.9,
            maxTokens: 700,
        });

        const valid =
            parsed &&
            typeof parsed.questionText === 'string' &&
            Array.isArray(parsed.options) &&
            parsed.options.length === 4 &&
            ['A', 'B', 'C', 'D'].includes(parsed.correctLetter) &&
            parsed.options.every((o: any) => o?.letter && o?.text);

        const payload = valid
            ? {
                subject,
                questionText: parsed.questionText,
                options: parsed.options.map((o: any) => ({ letter: o.letter, text: String(o.text) })),
                correctLetter: parsed.correctLetter,
                explanation: parsed.explanation || '',
                isFallback: false,
            }
            : { ...this.fallbackQuestion(gradeLevel), subject: this.fallbackQuestion(gradeLevel).subject };

        if (!valid) this.logger.warn(`Daily challenge fell back to the static question (${dateKey}, grade ${gradeLevel}).`);

        try {
            return (await this.challengeModel.create({ dateKey, gradeLevel, ...payload })).toObject();
        } catch {
            // Another request generated it first — reuse theirs.
            return this.challengeModel.findOne({ dateKey, gradeLevel }).lean().exec() as any;
        }
    }

    /** Grades the answer server-side and records it once per day. */
    async answerDailyChallenge(studentId: string, letter: string) {
        const enrollments = await this.enrollmentModel.find({ studentId: this.idMatch(studentId) as any })
            .populate('gradeId', 'level').lean().exec();
        const gradeLevel = (enrollments[0] as any)?.gradeId?.level || 8;
        const dateKey = this.dateKey();

        const challenge = await this.challengeModel.findOne({ dateKey, gradeLevel }).lean().exec();
        if (!challenge) throw new BadRequestException('Bugünün sorusu henüz hazır değil.');

        const progress = await this.getOrCreateProgress(studentId);
        if (progress.challengeLog.some((c) => c.date === dateKey)) {
            throw new BadRequestException('Bugünün sorusunu zaten cevapladınız.');
        }

        const correct = String(letter).toUpperCase() === challenge.correctLetter;
        const xpAwarded = correct ? XP.CHALLENGE_CORRECT : XP.CHALLENGE_ATTEMPT;

        progress.challengeLog.push({
            date: dateKey, subject: challenge.subject, correct, xpAwarded, answeredAt: new Date(),
        });
        await progress.save();

        return {
            correct,
            xpAwarded,
            correctLetter: challenge.correctLetter,
            explanation: challenge.explanation,
        };
    }

    // ─── store ──────────────────────────────────────────

    async getStore(studentId: string) {
        const summary = await this.getXpSummary(studentId);
        return {
            availableXp: summary.availableXp,
            earnedXp: summary.earnedXp,
            spentXp: summary.spentXp,
            activeTitle: summary.activeTitle,
            items: STORE_ITEMS.map((it) => ({
                ...it,
                unlocked: summary.unlockedTitles.includes(it.id),
                affordable: summary.availableXp >= it.cost,
            })),
        };
    }

    async buyTitle(studentId: string, itemId: string) {
        const item = STORE_ITEMS.find((i) => i.id === itemId);
        if (!item) throw new BadRequestException('Geçersiz ürün.');

        const progress = await this.getOrCreateProgress(studentId);
        if (progress.unlockedTitles.includes(itemId)) {
            throw new BadRequestException('Bu unvan zaten açık.');
        }

        // Re-check affordability against freshly computed XP, not a client value.
        const summary = await this.getXpSummary(studentId);
        if (summary.availableXp < item.cost) {
            throw new BadRequestException(`Yetersiz XP. Gereken: ${item.cost}, mevcut: ${summary.availableXp}.`);
        }

        progress.spentXp += item.cost;
        progress.unlockedTitles.push(itemId);
        if (!progress.activeTitle) progress.activeTitle = itemId;
        await progress.save();

        return this.getStore(studentId);
    }

    async setActiveTitle(studentId: string, itemId: string) {
        const progress = await this.getOrCreateProgress(studentId);
        if (itemId && !progress.unlockedTitles.includes(itemId)) {
            throw new BadRequestException('Bu unvan henüz açılmamış.');
        }
        progress.activeTitle = itemId || null;
        await progress.save();
        return { activeTitle: progress.activeTitle };
    }

    // ─── AI coach ───────────────────────────────────────

    /** Coaching tip grounded in the student's real numbers. */
    async getCoachTip(studentId: string) {
        const [summary, weak] = await Promise.all([
            this.getXpSummary(studentId),
            this.getWeakSpots(studentId),
        ]);

        const weakest = weak.subjects[0];
        const context = weak.hasData
            ? `Çözdüğü optik test: ${summary.stats.opticCount}. Toplam doğru: ${summary.stats.totalCorrect}. ` +
            `Çalışma serisi: ${summary.streak.current} gün. ` +
            `Ders bazlı başarı: ${weak.subjects.map((s) => `${s.subject} %${s.accuracy}`).join(', ')}. ` +
            `En zayıf ders: ${weakest?.subject} (%${weakest?.accuracy}).`
            : 'Öğrenci henüz hiç optik test çözmemiş.';

        const tip = await this.ai.chat({
            system:
                'Sen Atlas Derslik platformunda görev yapan uzman bir LGS öğrenci koçusun. ' +
                'Öğrencinin GERÇEK verilerine dayanarak kısa, somut ve motive edici TEK bir tavsiye cümlesi yaz ' +
                '(en fazla 30 kelime, Türkçe). Hangi derse neden odaklanması gerektiğini net söyle. Uydurma veri kullanma.',
            user: context,
            temperature: 0.7,
            maxTokens: 120,
        });

        return {
            tip: tip || this.staticTip(summary, weak),
            aiGenerated: !!tip,
            context: { weakest: weakest?.subject || null, streak: summary.streak.current },
        };
    }

    private staticTip(summary: any, weak: any) {
        if (!weak.hasData) {
            return 'Henüz optik test çözmemişsin. İlk testini çözerek kişisel analizini başlat!';
        }
        const w = weak.subjects[0];
        return `${w.subject} dersinde başarın %${w.accuracy}. Bu hafta bu derse ağırlık vererek netini hızla yükseltebilirsin.`;
    }

    /** Study plan built from the student's actual weak subjects. */
    async getStudyPlan(studentId: string) {
        const weak = await this.getWeakSpots(studentId);
        const focus = weak.hasData
            ? weak.subjects.slice(0, 2).map((s) => `${s.subject} (%${s.accuracy})`).join(' ve ')
            : 'genel tekrar';

        const plan = await this.ai.chat({
            system:
                'Sen Atlas Derslik yapay zeka rehberlik servisisin. Öğrenci için bugüne özel, 3 adımlı, ' +
                'toplam 45 dakikalık somut bir çalışma planı üret. Türkçe, kısa ve madde madde yaz. ' +
                'Format: "1) ... (süre) → 2) ... (süre) → 3) ... (süre)". Sadece planı yaz, giriş cümlesi ekleme.',
            user: `Öğrencinin en zayıf dersleri: ${focus}. Bu derslere ağırlık veren bir plan üret.`,
            temperature: 0.6,
            maxTokens: 220,
        });

        return {
            plan: plan || `1) ${weak.subjects[0]?.subject || 'Matematik'} 20 soru (20dk) → 2) 5dk mola → 3) Yanlış analiz + tekrar (20dk)`,
            aiGenerated: !!plan,
            focusSubjects: weak.subjects.slice(0, 2).map((s) => s.subject),
        };
    }

    /** Everything the student dashboard widgets need, in one round trip. */
    async getOverview(studentId: string) {
        const [xp, leaderboard, weakSpots, lgs, challenge, store] = await Promise.all([
            this.getXpSummary(studentId),
            this.getLeaderboard(studentId),
            this.getWeakSpots(studentId),
            this.getLgsSimulation(studentId),
            this.getDailyChallenge(studentId),
            this.getStore(studentId),
        ]);
        return { xp, leaderboard, weakSpots, lgs, challenge, store };
    }
}
