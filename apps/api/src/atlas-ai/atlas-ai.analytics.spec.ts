import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserRole } from '@repo/shared';
import {
  AtlasAnalyticsService,
  atlasMonthWindow,
  atlasTeachingExpression,
} from './atlas-ai.analytics';

const oid = (suffix: string) =>
  new Types.ObjectId(`507f1f77bcf86cd799439${suffix.padStart(3, '0')}`);
const studentId = oid('11');
const teacherId = oid('12');
const parentId = oid('13');
const gradeId = oid('14');
const otherGradeId = oid('15');
const subjectId = oid('16');
const otherSubjectId = oid('17');
const testId = oid('18');
const topicId = oid('19');
const q1 = oid('21');
const q2 = oid('22');
const q3 = oid('23');
const now = new Date('2026-09-13T11:00:00Z');
const student = {
  _id: studentId,
  firstName: 'Deniz',
  lastName: 'Atlas',
  role: UserRole.STUDENT,
};
const query = (value: any) => {
  const chain: any = { exec: jest.fn().mockResolvedValue(value) };
  for (const name of ['select', 'populate', 'sort', 'limit', 'lean'])
    chain[name] = jest.fn().mockReturnValue(chain);
  return chain;
};
const model = (name: string) => ({
  collection: { name },
  find: jest.fn((_filter?: any) => query([])),
  aggregate: jest.fn((_pipeline?: any[]) => query([])),
});
const record = (overrides: Record<string, any> = {}) => ({
  testId,
  answers: { [String(q1)]: 0, [String(q2)]: 0, [String(q3)]: -1 },
  correctCount: 1,
  wrongCount: 1,
  emptyCount: 1,
  activityAt: new Date('2026-09-12T10:00:00Z'),
  ...overrides,
});

describe('Istanbul calendar month boundaries', () => {
  it.each([
    [
      '2026-08-31T20:59:59.999Z',
      '2026-07-31T21:00:00.000Z',
      '2026-08-31T21:00:00.000Z',
    ],
    [
      '2026-08-31T21:00:00.000Z',
      '2026-08-31T21:00:00.000Z',
      '2026-09-30T21:00:00.000Z',
    ],
    [
      '2026-12-31T21:00:00.000Z',
      '2026-12-31T21:00:00.000Z',
      '2027-01-31T21:00:00.000Z',
    ],
    [
      '2028-02-28T22:00:00.000Z',
      '2028-01-31T21:00:00.000Z',
      '2028-02-29T21:00:00.000Z',
    ],
  ])('uses local calendar dates for %s', (date, start, end) => {
    const window = atlasMonthWindow(new Date(date));
    expect(window.start.toISOString()).toBe(start);
    expect(window.end.toISOString()).toBe(end);
  });
});

describe('Atlas learning facts and student access', () => {
  let service: AtlasAnalyticsService;
  let users: ReturnType<typeof model>;
  let enrollments: ReturnType<typeof model>;
  let teaching: ReturnType<typeof model>;
  let assignments: ReturnType<typeof model>;
  let submissions: ReturnType<typeof model>;
  let results: ReturnType<typeof model>;
  let tests: ReturnType<typeof model>;
  let questions: ReturnType<typeof model>;
  let schedules: ReturnType<typeof model>;
  let liveClasses: ReturnType<typeof model>;
  let subjects: ReturnType<typeof model>;
  const seedQuestions = (changes: Record<string, any> = {}) => {
    tests.find.mockReturnValue(
      query([{ _id: testId, subjectId, questionIds: [q1, q2, q3] }]),
    );
    questions.find.mockReturnValue(
      query(
        [q1, q2, q3].map((_id, index) => ({
          _id,
          correctAnswer: index === 1 ? 1 : 0,
          subjectId: {
            _id: subjectId,
            name: 'Matematik',
            privateKey: 'NEVER_SEND',
          },
          topicId: { _id: topicId, name: 'Kesirler' },
          updatedAt: new Date('2026-09-01T00:00:00Z'),
          ...changes,
        })),
      ),
    );
  };
  beforeEach(() => {
    [
      users,
      enrollments,
      teaching,
      assignments,
      submissions,
      results,
      tests,
      questions,
      schedules,
      liveClasses,
      subjects,
    ] = [
      'users',
      'studentenrollments',
      'teacherassignments',
      'assignments',
      'submissions',
      'testresults',
      'tests',
      'questions',
      'schedules',
      'liveclasses',
      'subjects',
    ].map(model);
    service = new AtlasAnalyticsService(
      users as any,
      enrollments as any,
      teaching as any,
      assignments as any,
      submissions as any,
      results as any,
      tests as any,
      questions as any,
      schedules as any,
      liveClasses as any,
      subjects as any,
    );
    subjects.find.mockReturnValue(query([
      { _id: subjectId, gradeLevel: 8, isActive: true },
      { _id: otherSubjectId, gradeLevel: 7, isActive: true },
    ]));
    enrollments.find.mockReturnValue(
      query([{ gradeId: { _id: gradeId, level: 8, isActive: true, label: '8 A' } }]),
    );
    results.aggregate.mockReturnValue(
      query([
        {
          current: [
            {
              count: 34,
              averageScore: 72.234,
              correct: 87,
              wrong: 21,
              empty: 8,
            },
          ],
          previous: [{ count: 21, averageScore: 61.13 }],
          recent: [record()],
        },
      ]),
    );
    submissions.aggregate.mockReturnValue(query([{ count: 12 }]));
    seedQuestions();
  });

  it.each([UserRole.STUDENT, UserRole.PARENT])('uses exact subject bindings for %s paid-cohort assignment and live metadata', async role => {
    const bound = oid('31'), global = oid('32'), foreign = oid('33'), inactive = oid('34');
    const actor = role === UserRole.STUDENT ? student : { _id: parentId, role };
    if (role === UserRole.PARENT) users.find.mockReturnValue(query([student]));
    enrollments.find.mockReturnValue(query([{ gradeId: { _id: gradeId, level: 8, isActive: true }, accessSource: 'package', packageGrants: [{ environment: 'live', startsAt: new Date('2026-01-01'), expiresAt: new Date('2030-01-01') }] }]));
    teaching.find.mockReturnValue(query([{ gradeId, subjectId: global }, { gradeId, subjectId: foreign }]));
    subjects.find.mockReturnValue(query([
      { _id: bound, gradeId, gradeLevel: 8, isActive: true },
      { _id: global, gradeLevel: 8, isActive: true },
      { _id: otherSubjectId, gradeLevel: 8, isActive: true },
      { _id: foreign, gradeId: otherGradeId, gradeLevel: 8, isActive: true },
      { _id: inactive, gradeId, gradeLevel: 8, isActive: false },
    ]));
    await service.build(actor, role === UserRole.PARENT ? String(studentId) : undefined, now);
    const assignmentScope = assignments.find.mock.calls[0][0].$and[0];
    const liveScope = liveClasses.find.mock.calls[0][0];
    for (const scope of [assignmentScope, liveScope]) {
      expect(scope.$or[0].gradeId.$in).toEqual([gradeId]);
      const legacy = scope.$or[2].$and[1].$or;
      expect(legacy[0].$or.map(branch => branch.$and[0].$expr.$eq[1])).toEqual([String(bound), String(global)]);
      expect(legacy[1].$and[0].$expr.$in[1]).toEqual([]);
      for (const rejected of [otherSubjectId, foreign, inactive]) expect(JSON.stringify(legacy)).not.toContain(String(rejected));
    }
    expect(enrollments.find.mock.results[0].value.select).toHaveBeenCalledWith('gradeId accessSource packageGrants');
  });

  it.each(['manual', undefined])('keeps %s legacy level access without granting foreign-subject content', async source => {
    enrollments.find.mockReturnValue(query([{ gradeId: { _id: gradeId, level: 8, isActive: true }, accessSource: source }]));
    subjects.find.mockReturnValue(query([
      { _id: subjectId, gradeLevel: 8, isActive: true },
      { _id: otherSubjectId, gradeId: otherGradeId, gradeLevel: 8, isActive: true },
    ]));
    await service.build(student, undefined, now);
    for (const scope of [assignments.find.mock.calls[0][0].$and[0], liveClasses.find.mock.calls[0][0]]) {
      const legacy = scope.$or[2].$and[1].$or[0].$and;
      expect(legacy[0].$expr.$in[1]).toEqual([8]);
      expect(JSON.stringify(legacy[1])).toContain(String(subjectId));
      expect(JSON.stringify(legacy[1])).not.toContain(String(otherSubjectId));
    }
  });

  it.each([UserRole.STUDENT, UserRole.PARENT])('does not let an inactive or deleted Grade authorize %s analysis context', async role => {
    const actor = role === UserRole.STUDENT ? student : { _id: parentId, role };
    if (role === UserRole.PARENT) users.find.mockReturnValue(query([student]));
    const rows = query([
      { gradeId: { _id: gradeId, level: 8, label: 'CLOSED_CLASS', isActive: false }, accessSource: 'manual' },
      { gradeId: null, accessSource: 'package' },
      { gradeId, accessSource: 'manual' },
      { gradeId: { _id: gradeId, level: 13, isActive: true }, accessSource: 'manual' },
    ]);
    enrollments.find.mockReturnValue(rows);
    const result = await service.build(actor, role === UserRole.PARENT ? String(studentId) : undefined, now);
    expect(rows.populate).toHaveBeenCalledWith({ path: 'gradeId', select: 'level label isActive', match: { isActive: true } });
    expect(result.students[0].classes).toEqual([]);
    for (const filter of [assignments.find.mock.calls[0][0].$and[0], liveClasses.find.mock.calls[0][0], schedules.find.mock.calls[0][0]]) {
      expect(filter.$or[0].gradeId.$in).toEqual([]);
      expect(filter.$or[1].$expr.$in[1]).toEqual([]);
      expect(filter.$or[2].$and[1].$or[0].$and[0].$expr.$in[1]).toEqual([]);
    }
    expect(subjects.find).not.toHaveBeenCalled();
  });

  it.each([UserRole.STUDENT, UserRole.PARENT])('retains manual access without granting expired/future paid class context for %s', async role => {
    const actor = role === UserRole.STUDENT ? student : { _id: parentId, role };
    if (role === UserRole.PARENT) users.find.mockReturnValue(query([student]));
    const futureGrade = oid('35');
    enrollments.find.mockReturnValue(query([
      { gradeId: { _id: gradeId, level: 8, label: 'Current manual', isActive: true }, accessSource: 'manual' },
      { gradeId: { _id: otherGradeId, level: 8, label: 'Expired paid', isActive: true }, accessSource: 'package', packageGrants: [{ environment: 'live', startsAt: new Date('2000-01-01'), expiresAt: new Date('2001-01-01') }] },
      { gradeId: { _id: futureGrade, level: 8, label: 'Future paid', isActive: true }, accessSource: 'package', packageGrants: [{ environment: 'live', startsAt: new Date('2099-01-01'), unlimited: true }] },
    ]));
    const result = await service.build(actor, role === UserRole.PARENT ? String(studentId) : undefined, now);
    expect(result.students[0].classes).toEqual(['Current manual']);
    for (const filter of [assignments.find.mock.calls[0][0].$and[0], liveClasses.find.mock.calls[0][0], schedules.find.mock.calls[0][0]])
      expect(filter.$or[0].gradeId.$in).toEqual([gradeId]);
    expect(enrollments.find.mock.calls[0][0].$and[1].$or[2].packageGrants.$elemMatch.startsAt.$lte).toEqual(now);
  });

  it('uses full monthly aggregates while calculating topics from answered questions', async () => {
    const insight = await service.build(student, undefined, now);
    const result = insight.students[0];
    expect(insight.period).toEqual({
      label: 'Eylül 2026',
      start: '2026-08-31T21:00:00.000Z',
      end: '2026-09-30T21:00:00.000Z',
    });
    expect(result.metrics).toEqual({
      completedTests: 34,
      submittedAssignments: 12,
      averageScore: 72.2,
      previousAverageScore: 61.1,
      scoreChange: 11.1,
      correct: 87,
      wrong: 21,
      empty: 8,
    });
    expect(result.topics).toEqual([
      expect.objectContaining({
        subject: 'Matematik',
        topic: 'Kesirler',
        attempts: 3,
        correct: 1,
        wrong: 1,
        empty: 1,
        accuracy: 33,
        priority: 'focus',
        confidence: 'limited',
      }),
    ]);
    expect(result.evidence).toEqual(
      expect.objectContaining({
        analyzedTests: 1,
        analyzedQuestions: 3,
        limited: false,
      }),
    );
    expect(JSON.stringify(insight)).not.toMatch(
      /correctAnswer|answers|NEVER_SEND/,
    );
    const pipeline = results.aggregate.mock.calls[0][0]!;
    expect(pipeline.find((row) => row.$set)).toEqual({
      $set: { activityAt: { $ifNull: ['$updatedAt', '$createdAt'] } },
    });
    expect(pipeline.find((row) => row.$facet).$facet.current[0]).toEqual({
      $match: {
        activityAt: {
          $gte: new Date('2026-08-31T21:00:00Z'),
          $lt: new Date('2026-09-30T21:00:00Z'),
        },
      },
    });
    expect(pipeline.find((row) => row.$facet).$facet.previous[0]).toEqual({
      $match: {
        activityAt: {
          $gte: new Date('2026-07-31T21:00:00Z'),
          $lt: new Date('2026-08-31T21:00:00Z'),
        },
      },
    });
    expect(
      pipeline
        .find((row) => row.$facet)
        .$facet.current.some((row) => row.$limit),
    ).toBe(false);
  });

  it('does not mistake no measurement for a zero score or a diagnosed weakness', async () => {
    results.aggregate.mockReturnValue(query([]));
    submissions.aggregate.mockReturnValue(query([]));
    const result = (await service.build(student, undefined, now)).students[0];
    expect(result.metrics.averageScore).toBeNull();
    expect(result.metrics.previousAverageScore).toBeNull();
    expect(result.metrics.scoreChange).toBeNull();
    expect(result.metrics.completedTests).toBe(0);
    expect(result.topics).toEqual([]);
    expect(questions.find).not.toHaveBeenCalled();
  });

  it.each([
    ['changed answer key', { updatedAt: new Date('2026-09-13T00:00:00Z') }, {}],
    ['score no longer matches', { correctAnswer: 2 }, {}],
    [
      'foreign question subject',
      { subjectId: { _id: otherSubjectId, name: 'Fen' } },
      {},
    ],
    ['unscorable open response', { type: 'OPEN_ENDED' }, {}],
    [
      'malformed recorded answer',
      {},
      { answers: { [String(q1)]: '0', [String(q2)]: 0, [String(q3)]: -1 } },
    ],
  ])(
    'skips %s while preserving recorded monthly totals',
    async (_name, changed, recordChanges) => {
      seedQuestions(changed);
      results.aggregate.mockReturnValue(
        query([
          {
            current: [{ count: 1, averageScore: 33 }],
            recent: [record(recordChanges)],
          },
        ]),
      );
      const result = (await service.build(student, undefined, now)).students[0];
      expect(result.metrics.completedTests).toBe(1);
      expect(result.topics).toEqual([]);
      expect(result.evidence.analyzedTests).toBe(0);
      expect(result.evidence.limited).toBe(true);
      expect(result.evidence.notes.join(' ')).toContain('1 test');
    },
  );

  it('skips deleted questions and tests rather than inventing topic facts', async () => {
    questions.find.mockReturnValue(query([]));
    const result = (await service.build(student, undefined, now)).students[0];
    expect(result.evidence.analyzedQuestions).toBe(0);
    expect(result.topics).toEqual([]);
    tests.find.mockReturnValue(query([]));
    expect(
      (await service.build(student, undefined, now)).students[0].topics,
    ).toEqual([]);
  });

  it('skips changed test composition even when legacy omitted answers leave identical totals', async () => {
    tests.find.mockReturnValue(
      query([
        {
          _id: testId,
          subjectId,
          questionIds: [q1, q2, q3],
          updatedAt: new Date('2026-09-13T00:00:00Z'),
        },
      ]),
    );
    const result = (await service.build(student, undefined, now)).students[0];
    expect(result.topics).toEqual([]);
    expect(result.metrics.completedTests).toBe(34);
    expect(result.evidence.limited).toBe(true);
  });

  it('bounds analysis without truncating monthly metrics', async () => {
    results.aggregate.mockReturnValue(
      query([
        {
          current: [{ count: 143, averageScore: 75 }],
          recent: Array.from({ length: 81 }, () => record()),
        },
      ]),
    );
    const result = (await service.build(student, undefined, now)).students[0];
    expect(result.metrics.completedTests).toBe(143);
    expect(result.evidence.analyzedTests).toBe(80);
    expect(result.evidence.limited).toBe(true);
  });

  it('does not allow a student to select another identity', async () => {
    await expect(
      service.build(student, String(parentId), now),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.build(student, 'bad-id', now)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(results.aggregate).not.toHaveBeenCalled();
    expect(users.find).not.toHaveBeenCalled();
  });

  it('uses canonical parent ownership and never queries unlinked student performance', async () => {
    const parent = { _id: parentId, role: UserRole.PARENT };
    await expect(
      service.build(parent, String(studentId), now),
    ).rejects.toBeInstanceOf(ForbiddenException);
    const filter = users.find.mock.calls[0][0];
    expect(filter).toEqual(
      expect.objectContaining({
        _id: studentId,
        role: UserRole.STUDENT,
        isActive: true,
      }),
    );
    expect(filter.$and[0].$or[0]).toEqual({ parentId });
    expect(results.aggregate).not.toHaveBeenCalled();
    users.find.mockReturnValue(query([student]));
    expect(
      (await service.build(parent, String(studentId), now)).selectedStudentId,
    ).toBe(String(studentId));
  });

  it('requires a real teaching-to-enrollment link before reading a selected student', async () => {
    const teacher = { _id: teacherId, role: UserRole.TEACHER };
    teaching.find.mockReturnValue(query([{ gradeId, subjectId }]));
    await expect(
      service.build(teacher, String(studentId), now),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(teaching.find.mock.calls[0][0].$or[0]).toEqual({ teacherId });
    expect(
      enrollments.aggregate.mock.calls[0][0]![0].$match.$expr.$in[1],
    ).toEqual([String(gradeId)]);
    expect(enrollments.aggregate.mock.calls[0][0]![0].$match.$or[0]).toEqual({
      studentId,
    });
    expect(users.find).not.toHaveBeenCalled();
    expect(results.aggregate).not.toHaveBeenCalled();
  });

  it('limits teacher metrics, topics and schedules to assigned subjects in this pupil’s classes', async () => {
    const teacher = { _id: teacherId, role: UserRole.TEACHER };
    teaching.find.mockReturnValue(
      query([
        { gradeId, subjectId },
        { gradeId: otherGradeId, subjectId: otherSubjectId },
      ]),
    );
    enrollments.aggregate.mockReturnValue(query([{ _id: String(studentId) }]));
    users.find.mockReturnValue(query([student]));
    const result = (await service.build(teacher, String(studentId), now))
      .students[0];
    expect(result.classes).toEqual(['8 A']);
    const testAccess = results.aggregate.mock.calls[0][0]!.find(
      (row) => row.$match?.$expr,
    );
    expect(testAccess.$match.$expr).toEqual(
      atlasTeachingExpression(
        [{ gradeId: String(gradeId), subjectId: String(subjectId), level: 8 }],
        'test.',
      ),
    );
    const assignmentAccess = submissions.aggregate.mock.calls[0][0]!.find(
      (row) => row.$match?.$expr,
    );
    expect(assignmentAccess.$match.$expr).toEqual(
      atlasTeachingExpression(
        [{ gradeId: String(gradeId), subjectId: String(subjectId), level: 8 }],
        'assignment.',
      ),
    );
    const scheduleScope = schedules.find.mock.calls[0][0];
    expect(scheduleScope.$or[0].gradeId.$in).toEqual([gradeId]);
    expect(result.evidence.notes.join(' ')).toContain('öğretmen');
  });

  it('does not grant a teacher foreign-bound subject data through an inconsistent class assignment', async () => {
    teaching.find.mockReturnValue(query([{ gradeId, subjectId }]));
    subjects.find.mockReturnValue(query([{ _id: subjectId, gradeId: otherGradeId, gradeLevel: 8, isActive: true }]));
    enrollments.aggregate.mockReturnValue(query([{ _id: String(studentId) }]));
    users.find.mockReturnValue(query([student]));
    await service.build({ _id: teacherId, role: UserRole.TEACHER }, String(studentId), now);
    expect(assignments.find.mock.calls[0][0].$and[0].$expr).toEqual({ $or: [] });
    expect(results.aggregate.mock.calls[0][0]!.find(stage => stage.$match?.$expr).$match.$expr).toEqual({ $or: [] });
    expect(submissions.aggregate.mock.calls[0][0]!.find(stage => stage.$match?.$expr).$match.$expr).toEqual({ $or: [] });
  });

  it('keeps class/subject permissions paired and masks other courses while retaining every busy slot', async () => {
    teaching.find.mockReturnValue(
      query([
        { gradeId, subjectId },
        { gradeId: otherGradeId, subjectId: otherSubjectId },
      ]),
    );
    enrollments.aggregate.mockReturnValue(query([{ _id: String(studentId) }]));
    enrollments.find.mockReturnValue(
      query([
        { gradeId: { _id: gradeId, level: 8, isActive: true, label: '8 A' } },
        { gradeId: { _id: otherGradeId, level: 7, isActive: true, label: '7 B' } },
      ]),
    );
    users.find.mockReturnValue(query([student]));
    const timetable = query([
      {
        gradeId,
        subjectId: { _id: subjectId, name: 'Matematik' },
        dayOfWeek: 1,
        startTime: '17:00',
        endTime: '17:40',
      },
      {
        gradeId,
        subjectId: { _id: otherSubjectId, name: 'PRIVATE_CROSS_SUBJECT' },
        dayOfWeek: 2,
        startTime: '17:00',
        endTime: '18:00',
      },
      {
        gradeId: otherGradeId,
        subjectId: { _id: subjectId, name: 'PRIVATE_CROSS_CLASS' },
        dayOfWeek: 3,
        startTime: '18:00',
        endTime: '19:00',
      },
    ]);
    schedules.find.mockReturnValue(timetable);
    const result = (
      await service.build(
        { _id: teacherId, role: UserRole.TEACHER },
        String(studentId),
        now,
      )
    ).students[0];
    const clauses = assignments.find.mock.calls[0][0].$and[0].$expr.$or;
    expect(
      clauses.map((clause) => [
        clause.$and[0].$eq[1],
        clause.$and[1].$or[0].$eq[1],
      ]),
    ).toEqual([
      [String(subjectId), String(gradeId)],
      [String(otherSubjectId), String(otherGradeId)],
    ]);
    expect(result.schedule).toEqual([
      {
        subject: 'Matematik',
        dayOfWeek: 1,
        startTime: '17:00',
        endTime: '17:40',
      },
      {
        subject: 'Diğer ders (meşgul)',
        dayOfWeek: 2,
        startTime: '17:00',
        endTime: '18:00',
      },
      {
        subject: 'Diğer ders (meşgul)',
        dayOfWeek: 3,
        startTime: '18:00',
        endTime: '19:00',
      },
    ]);
    expect(timetable.limit).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  });

  it('keeps one-off live class busy periods anonymous and includes every enrolled class for teachers', async () => {
    teaching.find.mockReturnValue(query([{ gradeId, subjectId }]));
    enrollments.aggregate.mockReturnValue(query([{ _id: String(studentId) }]));
    enrollments.find.mockReturnValue(
      query([
        { gradeId: { _id: gradeId, level: 8, isActive: true, label: '8 A' } },
        { gradeId: { _id: otherGradeId, level: 7, isActive: true, label: 'PRIVATE_CLASS' } },
      ]),
    );
    users.find.mockReturnValue(query([student]));
    const liveQuery = query([
      {
        startTime: new Date('2026-09-13T15:00:00Z'),
        durationMinutes: 45,
        title: 'PRIVATE_LIVE',
        subjectId: { name: 'PRIVATE_SUBJECT' },
        url: 'PRIVATE_URL',
      },
      { startTime: new Date('2026-09-13T20:45:00Z'), durationMinutes: 90 },
    ]);
    liveClasses.find.mockReturnValue(liveQuery);
    const result = (
      await service.build(
        { _id: teacherId, role: UserRole.TEACHER },
        String(studentId),
        now,
      )
    ).students[0];
    expect(liveClasses.find.mock.calls[0][0].$or[0].gradeId.$in).toEqual([
      gradeId,
      otherGradeId,
    ]);
    expect(liveClasses.find.mock.calls[0][0].startTime).toEqual({
      $gte: new Date('2026-09-12T11:00:00Z'),
      $lte: new Date('2026-09-21T11:00:00Z'),
    });
    expect(liveQuery.select).toHaveBeenCalledWith('startTime durationMinutes');
    expect(liveQuery.limit).not.toHaveBeenCalled();
    expect(result.busyPeriods).toEqual([
      { start: '2026-09-13T15:00:00.000Z', end: '2026-09-13T15:45:00.000Z' },
      { start: '2026-09-13T20:45:00.000Z', end: '2026-09-13T22:15:00.000Z' },
    ]);
    expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  });

  it('excludes invalid live class dates or durations with an explicit plan evidence note', async () => {
    liveClasses.find.mockReturnValue(
      query([
        ...[NaN, Infinity, 0, -10, 721].map((durationMinutes) => ({
          startTime: now,
          durationMinutes,
        })),
        { startTime: 'not-a-date', durationMinutes: 40 },
      ]),
    );
    const result = (await service.build(student, undefined, now)).students[0];
    expect(result.busyPeriods).toEqual([]);
    expect(result.evidence.limited).toBe(true);
    expect(result.evidence.notes.join(' ')).toContain('canlı ders');
  });

  it('returns a bounded list of active students to administrators', async () => {
    const userQuery = query([student]);
    users.find.mockReturnValue(userQuery);
    await service.build(
      { _id: parentId, role: UserRole.ADMIN },
      undefined,
      now,
    );
    expect(users.find).toHaveBeenCalledWith({
      role: UserRole.STUDENT,
      isActive: true,
    });
    expect(userQuery.limit).toHaveBeenCalledWith(8);
  });
});
