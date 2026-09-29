import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '@repo/shared';
import type {
  AtlasInsights,
  AtlasStudentInsight,
  AtlasTopicInsight,
} from '@repo/shared';
import { User } from '../users/schemas/user.schema';
import { StudentEnrollment } from '../education/schemas/student-enrollment.schema';
import { TeacherAssignment } from '../education/schemas/teacher-assignment.schema';
import { Assignment } from '../education/schemas/assignment.schema';
import { Submission } from '../education/schemas/submission.schema';
import { TestResult } from '../education/schemas/test-result.schema';
import { Test } from '../education/schemas/test.schema';
import { Question } from '../education/schemas/question.schema';
import { Schedule } from '../education/schemas/schedule.schema';
import { LiveClass } from '../education/schemas/live-class.schema';
import { buildAtlasClassScope } from './atlas-ai.scope';

const STUDENT_LIMIT = 8;
const TEST_LIMIT = 80;
const QUESTION_LIMIT = 2000;
const DAY = 86400000;
const idOf = (value: any): string => String(value?._id || value || '');
const label = (value: unknown, max = 160): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
const nameOf = (value: any): string =>
  label(value?.name || value?.label || value?.title);
const dateOf = (value: unknown): Date | null => {
  if (!value || !(typeof value === 'string' || value instanceof Date))
    return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};
const numeric = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Keep both legacy strings and ObjectIds: Mongoose does not cast $expr values. */
const identity = (field: string, id: string): any => ({
  $or: [
    { [field]: new Types.ObjectId(id) },
    {
      $expr: {
        $eq: [
          {
            $convert: {
              input: `$${field}`,
              to: 'string',
              onError: '',
              onNull: '',
            },
          },
          id,
        ],
      },
    },
  ],
});

export function atlasMonthWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((item) => item.type === 'year')?.value);
  const month = Number(parts.find((item) => item.type === 'month')?.value);
  // Istanbul is UTC+03:00 throughout the current academic calendar.
  const start = new Date(Date.UTC(year, month - 1, 1, -3));
  const end = new Date(Date.UTC(year, month, 1, -3));
  const previousStart = new Date(Date.UTC(year, month - 2, 1, -3));
  return {
    start,
    end,
    previousStart,
    label: new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: 'long',
    }).format(now),
  };
}

type TeacherAccess = { gradeId: string; subjectId: string }[];
type TeachingPair = { gradeId: string; subjectId: string; level: number };

/** Preserve class/subject pairs; two independent $in lists would cross permissions. */
export function atlasTeachingExpression(
  pairs: TeachingPair[],
  prefix = '',
): any {
  const asString = (field: string) => ({
    $convert: {
      input: `$${prefix}${field}`,
      to: 'string',
      onError: '',
      onNull: '',
    },
  });
  return {
    $or: pairs.map((pair) => ({
      $and: [
        { $eq: [asString('subjectId'), pair.subjectId] },
        {
          $or: [
            { $eq: [asString('gradeId'), pair.gradeId] },
            {
              $and: [
                { $eq: [{ $ifNull: [`$${prefix}gradeId`, null] }, null] },
                {
                  $eq: [
                    {
                      $convert: {
                        input: `$${prefix}gradeLevel`,
                        to: 'double',
                        onError: null,
                        onNull: null,
                      },
                    },
                    pair.level,
                  ],
                },
              ],
            },
          ],
        },
      ],
    })),
  };
}
type Actor = { _id: any; role: string; firstName?: string; lastName?: string };

/** Produces measured facts; neither prompts nor model output participate in authorization. */
@Injectable()
export class AtlasAnalyticsService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<any>,
    @InjectModel(StudentEnrollment.name)
    private readonly enrollments: Model<any>,
    @InjectModel(TeacherAssignment.name) private readonly teaching: Model<any>,
    @InjectModel(Assignment.name) private readonly assignments: Model<any>,
    @InjectModel(Submission.name) private readonly submissions: Model<any>,
    @InjectModel(TestResult.name) private readonly results: Model<any>,
    @InjectModel(Test.name) private readonly tests: Model<any>,
    @InjectModel(Question.name) private readonly questions: Model<any>,
    @InjectModel(Schedule.name) private readonly schedules: Model<any>,
    @InjectModel(LiveClass.name) private readonly liveClasses: Model<any>,
  ) {}

  async build(
    actor: Actor,
    selectedStudentId?: string,
    now = new Date(),
  ): Promise<AtlasInsights> {
    if (selectedStudentId && !Types.ObjectId.isValid(selectedStudentId))
      throw new BadRequestException('Geçerli bir öğrenci seçin.');
    const selectedId = selectedStudentId
      ? String(new Types.ObjectId(selectedStudentId))
      : undefined;
    const actorId = idOf(actor._id);
    let teacherAccess: TeacherAccess | undefined;
    let students: any[];
    if (actor.role === UserRole.STUDENT) {
      if (selectedId && selectedId !== actorId)
        throw new ForbiddenException(
          'Yalnızca kendi öğrenme bilgilerinize erişebilirsiniz.',
        );
      students = [actor];
    } else if (actor.role === UserRole.PARENT) {
      students = await this.users
        .find({
          $and: [identity('parentId', actorId)],
          role: UserRole.STUDENT,
          isActive: true,
          ...(selectedId ? { _id: new Types.ObjectId(selectedId) } : {}),
        })
        .select('_id firstName lastName')
        .sort({ _id: 1 })
        .limit(STUDENT_LIMIT)
        .lean()
        .exec();
    } else if (actor.role === UserRole.TEACHER) {
      const rows = await this.teaching
        .find(identity('teacherId', actorId))
        .select('gradeId subjectId')
        .lean()
        .exec();
      teacherAccess = rows
        .map((row) => ({
          gradeId: idOf(row.gradeId),
          subjectId: idOf(row.subjectId),
        }))
        .filter(
          (row) =>
            Types.ObjectId.isValid(row.gradeId) &&
            Types.ObjectId.isValid(row.subjectId),
        );
      const gradeIds = [...new Set(teacherAccess.map((row) => row.gradeId))];
      if (!gradeIds.length) students = [];
      else {
        // Group before limiting so a pupil enrolled in multiple classes appears once.
        const scopedEnrollments = await this.enrollments
          .aggregate([
            {
              $match: {
                $expr: {
                  $in: [
                    {
                      $convert: {
                        input: '$gradeId',
                        to: 'string',
                        onError: '',
                        onNull: '',
                      },
                    },
                    gradeIds,
                  ],
                },
                ...(selectedId ? identity('studentId', selectedId) : {}),
              },
            },
            {
              $group: {
                _id: {
                  $convert: {
                    input: '$studentId',
                    to: 'string',
                    onError: '',
                    onNull: '',
                  },
                },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: STUDENT_LIMIT },
          ])
          .exec();
        const studentIds = scopedEnrollments
          .map((row) => row._id)
          .filter((id) => Types.ObjectId.isValid(id));
        students = studentIds.length
          ? await this.users
              .find({
                _id: { $in: studentIds.map((id) => new Types.ObjectId(id)) },
                role: UserRole.STUDENT,
                isActive: true,
              })
              .select('_id firstName lastName')
              .sort({ _id: 1 })
              .limit(STUDENT_LIMIT)
              .lean()
              .exec()
          : [];
      }
    } else if (
      [UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role as UserRole)
    ) {
      students = await this.users
        .find({
          role: UserRole.STUDENT,
          isActive: true,
          ...(selectedId ? { _id: new Types.ObjectId(selectedId) } : {}),
        })
        .select('_id firstName lastName')
        .sort({ _id: 1 })
        .limit(STUDENT_LIMIT)
        .lean()
        .exec();
    } else throw new ForbiddenException('Bu hesap öğrenme analizine erişemez.');
    if (selectedId && !students.length)
      throw new ForbiddenException(
        'Bu öğrencinin öğrenme bilgilerine erişiminiz yok.',
      );
    const window = atlasMonthWindow(now);
    return {
      generatedAt: now.toISOString(),
      period: {
        label: window.label,
        start: window.start.toISOString(),
        end: window.end.toISOString(),
      },
      students: await Promise.all(
        students.map((student) => this.student(student, now, teacherAccess)),
      ),
      selectedStudentId:
        selectedId || (students.length ? idOf(students[0]._id) : null),
    };
  }

  private async student(
    student: any,
    now: Date,
    teacherAccess?: TeacherAccess,
  ): Promise<AtlasStudentInsight> {
    const studentId = idOf(student._id);
    const owner = identity('studentId', studentId);
    const window = atlasMonthWindow(now);
    const enrollments = await this.enrollments
      .find(owner)
      .select('gradeId')
      .populate('gradeId', 'level label')
      .lean()
      .exec();
    const classes = enrollments.filter(
      (row) =>
        row.gradeId &&
        (!teacherAccess ||
          teacherAccess.some((access) => access.gradeId === idOf(row.gradeId))),
    );
    const classIds = classes.map((row) => idOf(row.gradeId));
    const pairs: TeachingPair[] | undefined = teacherAccess?.flatMap(
      (access) => {
        const enrollment = classes.find(
          (row) => idOf(row.gradeId) === access.gradeId,
        );
        return enrollment
          ? [{ ...access, level: Number(enrollment.gradeId.level) }]
          : [];
      },
    );
    const subjects = pairs
      ? [...new Set(pairs.map((pair) => pair.subjectId))]
      : undefined;
    const contentScope = pairs
      ? { $expr: atlasTeachingExpression(pairs) }
      : buildAtlasClassScope(
          classIds,
          classes.map((row) => row.gradeId?.level),
        );
    // All actual timetable slots block a plan. Other teachers' course names are
    // replaced with an anonymous busy label before leaving this service.
    const timetableScope = buildAtlasClassScope(
      enrollments.filter((row) => row.gradeId).map((row) => idOf(row.gradeId)),
      [],
    );
    const liveClassScope = buildAtlasClassScope(
      enrollments.filter((row) => row.gradeId).map((row) => idOf(row.gradeId)),
      enrollments.map((row) => row.gradeId?.level),
    );
    const resultAccess: any[] = pairs
      ? [
          {
            $lookup: {
              from: this.tests.collection.name,
              localField: 'testId',
              foreignField: '_id',
              as: 'test',
            },
          },
          { $unwind: '$test' },
          { $match: { $expr: atlasTeachingExpression(pairs, 'test.') } },
        ]
      : [];
    const submissionAccess: any[] = pairs
      ? [
          {
            $lookup: {
              from: this.assignments.collection.name,
              localField: 'assignmentId',
              foreignField: '_id',
              as: 'assignment',
            },
          },
          { $unwind: '$assignment' },
          { $match: { $expr: atlasTeachingExpression(pairs, 'assignment.') } },
        ]
      : [];
    const metricGroup = {
      $group: {
        _id: null,
        count: { $sum: 1 },
        averageScore: { $avg: '$score' },
        correct: { $sum: '$correctCount' },
        wrong: { $sum: '$wrongCount' },
        empty: { $sum: '$emptyCount' },
      },
    };
    const [
      resultSummary,
      submissionSummary,
      scheduleRows,
      assignmentRows,
      liveClassRows,
    ] = await Promise.all([
      this.results
        .aggregate([
          { $match: owner },
          ...resultAccess,
          { $set: { activityAt: { $ifNull: ['$updatedAt', '$createdAt'] } } },
          {
            $facet: {
              current: [
                {
                  $match: {
                    activityAt: { $gte: window.start, $lt: window.end },
                  },
                },
                metricGroup,
              ],
              previous: [
                {
                  $match: {
                    activityAt: {
                      $gte: window.previousStart,
                      $lt: window.start,
                    },
                  },
                },
                metricGroup,
              ],
              recent: [
                {
                  $match: {
                    activityAt: {
                      $gte: new Date(now.getTime() - 90 * DAY),
                      $lte: now,
                    },
                  },
                },
                { $sort: { activityAt: -1, _id: -1 } },
                { $limit: TEST_LIMIT + 1 },
                {
                  $project: {
                    testId: 1,
                    answers: 1,
                    correctCount: 1,
                    wrongCount: 1,
                    emptyCount: 1,
                    activityAt: 1,
                  },
                },
              ],
            },
          },
        ])
        .exec(),
      this.submissions
        .aggregate([
          {
            $match: {
              $and: [owner],
              submittedAt: { $gte: window.start, $lt: window.end },
            },
          },
          ...submissionAccess,
          // Resubmissions overwrite the same document; count each assignment once.
          { $group: { _id: '$assignmentId' } },
          { $count: 'count' },
        ])
        .exec(),
      this.schedules
        .find({ ...timetableScope, isActive: true })
        .select('subjectId gradeId dayOfWeek startTime endTime')
        .populate('subjectId', 'name')
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean()
        .exec(),
      this.assignments
        .find({
          $and: [contentScope],
          dueDate: {
            $gte: new Date(now.getTime() - 7 * DAY),
            $lte: new Date(now.getTime() + 14 * DAY),
          },
        })
        .select('title subjectId dueDate')
        .populate('subjectId', 'name')
        .sort({ dueDate: 1 })
        .limit(24)
        .lean()
        .exec(),
      this.liveClasses
        .find({
          ...liveClassScope,
          isActive: true,
          startTime: {
            $gte: new Date(now.getTime() - DAY),
            $lte: new Date(now.getTime() + 8 * DAY),
          },
        })
        .select('startTime durationMinutes')
        .sort({ startTime: 1 })
        .lean()
        .exec(),
    ]);
    const summary = resultSummary[0] || {};
    const current = summary.current?.[0];
    const previous = summary.previous?.[0];
    const recent = summary.recent || [];
    const averageScore =
      typeof current?.averageScore === 'number'
        ? Math.round(current.averageScore * 10) / 10
        : null;
    const previousAverageScore =
      typeof previous?.averageScore === 'number'
        ? Math.round(previous.averageScore * 10) / 10
        : null;
    const [analysis, submittedRows] = await Promise.all([
      this.topicAnalysis(recent.slice(0, TEST_LIMIT), subjects),
      assignmentRows.length
        ? this.submissions
            .find({
              $and: [owner],
              assignmentId: { $in: assignmentRows.map((row) => row._id) },
            })
            .select('assignmentId')
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);
    const submittedIds = new Set(
      submittedRows.map((row) => idOf(row.assignmentId)),
    );
    let invalidLiveTimes = 0;
    const busyPeriods = liveClassRows.flatMap((row) => {
      const start = dateOf(row.startTime);
      const duration = row.durationMinutes;
      if (
        !start ||
        typeof duration !== 'number' ||
        !Number.isFinite(duration) ||
        duration <= 0 ||
        duration > 720
      ) {
        invalidLiveTimes++;
        return [];
      }
      return [
        {
          start: start.toISOString(),
          end: new Date(start.getTime() + duration * 60000).toISOString(),
        },
      ];
    });
    const notes = [
      'Aylık sayılar takvim ayının tamamındaki kayıtları kapsar; soru analizi son 90 gündeki en yeni 80 testle sınırlıdır.',
      'Aynı testin tekrarları ayrı saklanmadığından test sayısı ve puanlar her testin son teslimine aittir. Önceki ay karşılaştırması da elde kalan son kayıtlardan hesaplanır.',
      'Konu başarı oranı doğru / (doğru + yanlış + boş) olarak hesaplanır; çalışma süresi ve izlenen videolar ölçülmez.',
      ...(teacherAccess
        ? [
            'Bu öğretmen görünümü yalnızca atanmış sınıf ve derslerdeki öğrenci verilerini kapsar.',
          ]
        : []),
      ...analysis.notes,
      ...(invalidLiveTimes
        ? [
            'Bazı canlı derslerin saat veya süre kaydı okunamadı; planı uygularken canlı ders programını kontrol et.',
          ]
        : []),
    ];
    if (recent.length > TEST_LIMIT)
      notes.push(
        '80 test sınırına ulaşıldı; konu analizi bütün test geçmişini temsil etmez.',
      );
    return {
      id: studentId,
      name:
        [label(student.firstName, 60), label(student.lastName, 60)]
          .filter(Boolean)
          .join(' ') || 'Öğrenci',
      classes: classes.map(
        (row) => nameOf(row.gradeId) || `${row.gradeId?.level}. sınıf`,
      ),
      metrics: {
        completedTests: numeric(current?.count),
        submittedAssignments: numeric(submissionSummary[0]?.count),
        averageScore,
        previousAverageScore,
        scoreChange:
          averageScore !== null && previousAverageScore !== null
            ? Math.round((averageScore - previousAverageScore) * 10) / 10
            : null,
        correct: numeric(current?.correct),
        wrong: numeric(current?.wrong),
        empty: numeric(current?.empty),
      },
      topics: analysis.topics,
      schedule: scheduleRows.map((row) => ({
        subject:
          !pairs ||
          pairs.some(
            (pair) =>
              pair.gradeId === idOf(row.gradeId) &&
              pair.subjectId === idOf(row.subjectId),
          )
            ? nameOf(row.subjectId)
            : 'Diğer ders (meşgul)',
        dayOfWeek: row.dayOfWeek,
        startTime: label(row.startTime, 5),
        endTime: label(row.endTime, 5),
      })),
      busyPeriods,
      upcomingAssignments: assignmentRows
        .filter((row) => dateOf(row.dueDate))
        .map((row) => ({
          title: label(row.title),
          subject: nameOf(row.subjectId),
          dueDate: new Date(row.dueDate).toISOString(),
          submitted: submittedIds.has(idOf(row._id)),
        })),
      evidence: {
        analyzedTests: analysis.analyzedTests,
        analyzedQuestions: analysis.analyzedQuestions,
        limited:
          recent.length > TEST_LIMIT ||
          analysis.limited ||
          invalidLiveTimes > 0,
        notes,
      },
    };
  }

  private async topicAnalysis(records: any[], allowedSubjects?: string[]) {
    if (!records.length)
      return {
        topics: [] as AtlasTopicInsight[],
        analyzedTests: 0,
        analyzedQuestions: 0,
        limited: false,
        notes: [
          'Son 90 günde konu analizi için test kaydı bulunamadı; konu eksikliği varsayılmaz.',
        ],
      };
    const testIds = [...new Set(records.map((row) => idOf(row.testId)))].filter(
      (id) => Types.ObjectId.isValid(id),
    );
    const tests = await this.tests
      .find({ _id: { $in: testIds.map((id) => new Types.ObjectId(id)) } })
      .select('subjectId questionIds updatedAt')
      .lean()
      .exec();
    const testsById = new Map(tests.map((row) => [idOf(row._id), row]));
    const allQuestionIds = [
      ...new Set(tests.flatMap((row) => (row.questionIds || []).map(idOf))),
    ].filter((id) => Types.ObjectId.isValid(id));
    const questionIds = allQuestionIds.slice(0, QUESTION_LIMIT);
    const questions = questionIds.length
      ? await this.questions
          .find({
            _id: { $in: questionIds.map((id) => new Types.ObjectId(id)) },
          })
          .select(
            'correctAnswer objective topicId unitId subjectId updatedAt type',
          )
          .populate('subjectId', 'name')
          .populate('topicId', 'name')
          .populate('unitId', 'name')
          .lean()
          .exec()
      : [];
    const questionsById = new Map(questions.map((row) => [idOf(row._id), row]));
    const buckets = new Map<
      string,
      {
        key: string;
        subject: string;
        topic: string;
        correct: number;
        wrong: number;
        empty: number;
      }
    >();
    let skipped = 0;
    let analyzedTests = 0;
    let analyzedQuestions = 0;
    for (const record of records) {
      const test = testsById.get(idOf(record.testId));
      const answers =
        record.answers instanceof Map
          ? Object.fromEntries(record.answers)
          : record.answers;
      const questionIds: string[] = [
        ...new Set<string>((test?.questionIds || []).map(idOf)),
      ];
      if (
        !test ||
        !answers ||
        !questionIds.length ||
        (allowedSubjects && !allowedSubjects.includes(idOf(test.subjectId)))
      ) {
        skipped++;
        continue;
      }
      const scored: {
        question: any;
        outcome: 'correct' | 'wrong' | 'empty';
      }[] = [];
      let invalid = false;
      const activityAt = dateOf(record.activityAt);
      const testChangedAt = dateOf(test.updatedAt);
      if (activityAt && testChangedAt && testChangedAt > activityAt)
        invalid = true;
      // A changed test composition or answer key cannot be reconstructed safely.
      if (Object.keys(answers).some((id) => !questionIds.includes(id)))
        invalid = true;
      for (const questionId of questionIds) {
        const question = questionsById.get(questionId);
        const changedAt = dateOf(question?.updatedAt);
        if (
          !question ||
          !Number.isInteger(question.correctAnswer) ||
          question.correctAnswer < 0 ||
          (question.type && question.type !== 'TEST') ||
          idOf(question.subjectId) !== idOf(test.subjectId) ||
          (allowedSubjects &&
            !allowedSubjects.includes(idOf(question.subjectId))) ||
          (activityAt && changedAt && changedAt > activityAt)
        ) {
          invalid = true;
          break;
        }
        const answer = answers[questionId];
        const empty = answer === undefined || answer === null || answer === -1;
        if (!empty && (!Number.isInteger(answer) || answer < 0)) {
          invalid = true;
          break;
        }
        scored.push({
          question,
          outcome: empty
            ? 'empty'
            : answer === question.correctAnswer
              ? 'correct'
              : 'wrong',
        });
      }
      const total = (outcome: string) =>
        scored.filter((row) => row.outcome === outcome).length;
      if (
        invalid ||
        total('correct') !== record.correctCount ||
        total('wrong') !== record.wrongCount ||
        total('empty') !== record.emptyCount
      ) {
        skipped++;
        continue;
      }
      analyzedTests++;
      analyzedQuestions += scored.length;
      for (const { question, outcome } of scored) {
        const subject = nameOf(question.subjectId) || 'Ders';
        const topic =
          nameOf(question.topicId) ||
          label(question.objective) ||
          nameOf(question.unitId) ||
          'Genel tekrar (konu etiketi yok)';
        const key = `${idOf(question.subjectId)}:${idOf(question.topicId) || label(question.objective) || idOf(question.unitId) || 'general'}`;
        const bucket = buckets.get(key) || {
          key,
          subject,
          topic,
          correct: 0,
          wrong: 0,
          empty: 0,
        };
        bucket[outcome]++;
        buckets.set(key, bucket);
      }
    }
    const topics: AtlasTopicInsight[] = [...buckets.values()].map((bucket) => {
      const attempts = bucket.correct + bucket.wrong + bucket.empty;
      const accuracy = Math.round((bucket.correct / attempts) * 100);
      return {
        ...bucket,
        attempts,
        accuracy,
        priority:
          accuracy < 60 ? 'focus' : accuracy < 85 ? 'practice' : 'strong',
        confidence:
          attempts < 5
            ? 'limited'
            : attempts < 15
              ? 'developing'
              : 'established',
      };
    });
    topics.sort(
      (a, b) =>
        a.accuracy - b.accuracy ||
        b.attempts - a.attempts ||
        a.key.localeCompare(b.key),
    );
    return {
      topics: topics.slice(0, 40),
      analyzedTests,
      analyzedQuestions,
      limited:
        skipped > 0 ||
        allQuestionIds.length > QUESTION_LIMIT ||
        topics.length > 40,
      notes: [
        ...(skipped
          ? [
              `${skipped} test, eksik/değişmiş soru veya kayıtlı sonuçla uyuşmazlık nedeniyle konu analizine alınmadı; aylık toplamlar korunur.`,
            ]
          : []),
        ...(allQuestionIds.length > QUESTION_LIMIT
          ? ['2000 soru sınırına ulaşıldı.']
          : []),
        ...(topics.length > 40 ? ['Öncelikli 40 konu gösterilir.'] : []),
      ],
    };
  }
}
