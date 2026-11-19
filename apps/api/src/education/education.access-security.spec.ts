import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@repo/shared';
import { model as mongooseModel, deleteModel, Types } from 'mongoose';
import { EducationService } from './education.service';
import { SubjectSchema } from './schemas/subject.schema';

const studentId = '507f1f77bcf86cd799439011';
const teacherId = '507f1f77bcf86cd799439012';
const gradeId = '507f1f77bcf86cd799439013';
const subjectId = '507f1f77bcf86cd799439014';
const contentId = '507f1f77bcf86cd799439015';
const otherGradeId = '507f1f77bcf86cd799439016';
const questionId = '507f1f77bcf86cd799439017';
const query = (value: any) => { const q: any = { exec: jest.fn().mockResolvedValue(value) }; for (const method of ['select', 'populate', 'lean', 'sort', 'limit']) q[method] = jest.fn().mockReturnValue(q); return q; };
const model = () => ({
  find: jest.fn((_filter?: any) => query([])), findById: jest.fn((_id?: any) => query(null)),
  findOne: jest.fn((_filter?: any) => query(null)), exists: jest.fn(async (_filter?: any) => false),
  findOneAndUpdate: jest.fn((_filter?: any, _update?: any, _options?: any) => query({})),
  findOneAndDelete: jest.fn((_filter?: any) => query(null)),
  create: jest.fn().mockResolvedValue({}), aggregate: jest.fn(() => query([])),
});
const user = { userId: studentId, role: UserRole.STUDENT };
const testRecord = () => ({ _id: new Types.ObjectId(contentId), title: 'Konu testi', isActive: true, teacherId: new Types.ObjectId(teacherId), subjectId: new Types.ObjectId(subjectId), gradeLevel: 8, questionIds: [{ _id: new Types.ObjectId(questionId), text: 'Soru', options: ['Bir', 'İki'], correctAnswer: 1 }] });
const assignment = () => ({ _id: new Types.ObjectId(contentId), teacherId: new Types.ObjectId(teacherId), gradeId: new Types.ObjectId(gradeId), gradeLevel: 8, subjectId: new Types.ObjectId(subjectId), attachments: ['data:application/pdf;base64,VGVzdA=='] });
const equals = (a: any, b: any) => a instanceof Types.ObjectId || b instanceof Types.ObjectId ? String(a) === String(b) : a === b;
function matches(row: any, filter: any): boolean {
  return Object.entries(filter).every(([key, expected]: [string, any]) => {
    if (key === '$or') return expected.some((part: any) => matches(row, part));
    if (key === '$and') return expected.every((part: any) => matches(row, part));
    const actual = row[key];
    if (expected === null) return actual === null || actual === undefined;
    if (expected && typeof expected === 'object' && !(expected instanceof Types.ObjectId)) return Object.entries(expected).every(([op, value]: [string, any]) => {
      if (op === '$in') return value.some((item: any) => equals(actual, item));
      if (op === '$ne') return !equals(actual, value);
      if (op === '$exists') return (actual !== undefined) === value;
      throw new Error(`Unsupported fixture operator ${op}`);
    });
    return equals(actual, expected);
  });
}

describe('Education paid-access boundaries', () => {
  let service: EducationService;
  let models: ReturnType<typeof model>[];
  const setRole = (role: string, active = true) => models[14].findById.mockReturnValue(query({ _id: new Types.ObjectId(studentId), role, isActive: active }));
  const expired = () => models[9].find.mockReturnValue(query([]));
  beforeEach(() => {
    models = Array.from({ length: 15 }, model); service = new (EducationService as any)(...models);
    setRole(UserRole.STUDENT);
    models[9].find.mockReturnValue(query([{ gradeId: { _id: new Types.ObjectId(gradeId), level: 8, isActive: true } }]));
    models[1].findById.mockReturnValue(query({ _id: new Types.ObjectId(subjectId), gradeId: new Types.ObjectId(gradeId), gradeLevel: 8, isActive: true }));
    models[1].find.mockReturnValue(query([{ _id: new Types.ObjectId(subjectId) }]));
    models[12].findById.mockReturnValue(query(testRecord()));
    models[6].findById.mockReturnValue(query(assignment()));
  });

  it('refuses assignment attachment and submission when all package access has expired', async () => {
    expired();
    await expect(service.getAssignmentAttachment(contentId, 0, user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.submitAssignment({ assignmentId: contentId, studentId, studentAnswers: ['A'] })).rejects.toBeInstanceOf(ForbiddenException);
    expect(models[7].findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('allows an active exact-class assignment but rejects a same-level parallel branch', async () => {
    expect(await service.getAssignmentAttachment(contentId, 0, user)).toEqual({ dataUri: assignment().attachments[0] });
    models[6].findById.mockReturnValue(query({ ...assignment(), gradeId: new Types.ObjectId(otherGradeId) }));
    await expect(service.getAssignmentAttachment(contentId, 0, user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.submitAssignment({ assignmentId: contentId, studentId })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('uses legacy level fallback only from active access and honors a class-bound subject', async () => {
    models[6].findById.mockReturnValue(query({ ...assignment(), gradeId: undefined }));
    expect(await service.getAssignmentAttachment(contentId, 0, user)).toHaveProperty('dataUri');
    models[1].findById.mockReturnValue(query({ _id: subjectId, gradeId: otherGradeId, gradeLevel: 8, isActive: true }));
    await expect(service.getAssignmentAttachment(contentId, 0, user)).rejects.toBeInstanceOf(ForbiddenException);
    expired();
    await expect(service.getAssignmentAttachment(contentId, 0, user)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('refuses a legacy assignment above the currently accessible level', async () => {
    models[6].findById.mockReturnValue(query({ ...assignment(), gradeId: undefined, gradeLevel: 9 }));
    await expect(service.getAssignmentAttachment(contentId, 0, user)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('never returns test content, result review, or accepts a submission after access expires', async () => {
    expired();
    await expect(service.getTestById(contentId, user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.submitTest(contentId, studentId, {}, 0)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getTestResultForStudent(contentId, studentId, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(models[13].findOne).not.toHaveBeenCalled(); expect(models[13].create).not.toHaveBeenCalled();
  });
  it('prevents same-level foreign-subject test IDs bypassing exact class membership', async () => {
    models[1].findById.mockReturnValue(query({ _id: subjectId, gradeId: otherGradeId, gradeLevel: 8, isActive: true }));
    await expect(service.getTestById(contentId, user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.submitTest(contentId, studentId, {}, 0)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it.each(['package', 'manual', undefined])('allows global subjects only with manual fallback or an exact active teacher binding (%s)', async accessSource => {
    models[9].find.mockReturnValue(query([{ accessSource, gradeId: { _id: new Types.ObjectId(gradeId), level: 8, isActive: true } }]));
    models[1].findById.mockReturnValue(query({ _id: subjectId, gradeId: null, gradeLevel: 8, isActive: true }));
    models[6].findById.mockReturnValue(query({ ...assignment(), gradeId: undefined }));
    if (accessSource === 'package') {
      await expect(service.getTestById(contentId, user)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.getAssignmentAttachment(contentId, 0, user)).rejects.toBeInstanceOf(ForbiddenException);
    } else expect(await service.getAssignmentAttachment(contentId, 0, user)).toHaveProperty('dataUri');
    models[8].find.mockReturnValue(query([{ gradeId: { _id: new Types.ObjectId(gradeId), level: 8, isActive: true }, subjectId: new Types.ObjectId(subjectId) }]));
    expect(await service.getTestById(contentId, user)).toHaveProperty('title');
    expect(await service.getAssignmentAttachment(contentId, 0, user)).toHaveProperty('dataUri');
    models[1].findById.mockReturnValue(query({ _id: subjectId, gradeId: otherGradeId, gradeLevel: 8, isActive: true }));
    await expect(service.getTestById(contentId, user)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('paid package access refuses subjectless legacy content while preserving an independent manual level', async () => {
    models[9].find.mockReturnValue(query([{ accessSource: 'package', gradeId: { _id: gradeId, level: 8, isActive: true } }]));
    models[6].findById.mockReturnValue(query({ ...assignment(), gradeId: undefined, subjectId: undefined }));
    await expect(service.getAssignmentAttachment(contentId, 0, user)).rejects.toBeInstanceOf(ForbiddenException);
    models[9].find.mockReturnValue(query([{ accessSource: 'package', gradeId: { _id: gradeId, level: 8, isActive: true } },
      { accessSource: 'manual', gradeId: { _id: otherGradeId, level: 6, isActive: true } }]));
    await expect(service.getAssignmentAttachment(contentId, 0, user)).rejects.toBeInstanceOf(ForbiddenException);
    models[6].findById.mockReturnValue(query({ ...assignment(), gradeId: undefined, subjectId: undefined, gradeLevel: 6 }));
    expect(await service.getAssignmentAttachment(contentId, 0, user)).toHaveProperty('dataUri');
  });
  it.each(['package', 'manual', undefined])('filters content before lists, dashboard, calendar and attachment counts for %s access', async accessSource => {
    models[9].find.mockReturnValue(query([{ accessSource, gradeId: { _id: new Types.ObjectId(gradeId), level: 8, isActive: true } }]));
    const bound = { _id: new Types.ObjectId(subjectId), gradeId: new Types.ObjectId(gradeId), gradeLevel: 8, isActive: true };
    const global = { _id: new Types.ObjectId(), gradeId: null, gradeLevel: 8, isActive: true };
    const foreign = { _id: new Types.ObjectId(), gradeId: new Types.ObjectId(otherGradeId), gradeLevel: 8, isActive: true };
    models[1].find.mockImplementation(filter => query([bound, global, foreign].filter(row => matches(row, filter))));
    const entries = [
      { ...assignment(), tag: 'class' },
      { ...assignment(), _id: new Types.ObjectId(), gradeId: undefined, tag: 'bound-subject' },
      { ...assignment(), _id: new Types.ObjectId(), gradeId: undefined, subjectId: global._id, tag: 'global' },
      { ...assignment(), _id: new Types.ObjectId(), gradeId: undefined, subjectId: foreign._id, tag: 'foreign-subject' },
      { ...assignment(), _id: new Types.ObjectId(), gradeId: new Types.ObjectId(otherGradeId), tag: 'foreign-class' },
      { ...assignment(), _id: new Types.ObjectId(), gradeId: undefined, subjectId: undefined, tag: 'subjectless' },
    ];
    for (const index of [4, 5, 6]) models[index].find.mockImplementation(filter => query(entries.filter(row => matches(row, filter))));
    const expected = accessSource === 'package' ? ['bound-subject', 'class'] : ['bound-subject', 'class', 'global', 'subjectless'];
    const tags = (rows: any[]) => rows.map(row => row.tag).sort();
    expect(tags(await service.getVideosForStudent(studentId))).toEqual(expected);
    expect(tags(await service.getStudentAssignments(studentId))).toEqual(expected);
    const dashboard = await service.getStudentDashboard(studentId);
    for (const key of ['assignments', 'videos', 'liveClasses']) expect(tags(dashboard[key])).toEqual(expected);
    const calendar = await service.getCalendarEvents(8, undefined, undefined, user);
    expect(tags(calendar.assignments)).toEqual(expected); expect(tags(calendar.liveClasses)).toEqual(expected);
    const aggregation = (models[6].aggregate.mock.calls as any)[0][0];
    expect(tags(entries.filter(row => matches(row, aggregation[0].$match)))).toEqual(expected);
    models[12].find.mockImplementation(filter => query(entries.filter(row => matches({ ...row, isActive: true }, filter))));
    const tests = await service.getStudentAvailableTests(studentId);
    expect(tests.some((row: any) => row.tag === 'global')).toBe(accessSource !== 'package');
    expect(tests.some((row: any) => row.tag === 'foreign-subject')).toBe(false);
  });
  it('preserves student question text and options while withholding the correct answers', async () => {
    const record = testRecord(); models[12].findById.mockReturnValue(query(record));
    const result = await service.getTestById(contentId, user);
    expect(result.questionIds[0]).toMatchObject({ text: 'Soru', options: ['Bir', 'İki'] });
    expect(result.questionIds[0]).not.toHaveProperty('correctAnswer'); expect(record.questionIds[0].correctAnswer).toBe(1);
  });
  it('allows correct-answer review only for a currently authorized student with their own saved submission', async () => {
    await expect(service.getTestResultForStudent(contentId, studentId, user)).rejects.toBeInstanceOf(BadRequestException);
    models[13].findOne.mockReturnValue(query({ _id: questionId, studentId, testId: contentId, score: 100 }));
    const own = await service.getTestResultForStudent(contentId, studentId, user);
    expect(own.test.questionIds[0].correctAnswer).toBe(1);
    await expect(service.getTestResultForStudent(contentId, teacherId, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(models[13].findOne).toHaveBeenLastCalledWith({ testId: new Types.ObjectId(contentId), studentId: new Types.ObjectId(studentId) });
  });
  it('routes the general test listing through active subject entitlements and never reads all staff tests', async () => {
    const list = [{ ...testRecord(), questionIds: [new Types.ObjectId(questionId)] }]; models[12].find.mockReturnValue(query(list));
    const result = await service.getTests({ gradeLevel: 12, teacherId }, user);
    expect(result).toHaveLength(1); expect(JSON.stringify(result)).not.toContain('correctAnswer');
    expect(models[12].find).toHaveBeenCalledWith({ gradeLevel: { $in: [8] }, subjectId: { $in: [new Types.ObjectId(subjectId)] }, isActive: true });
    expired(); models[12].find.mockClear();
    expect(await service.getTests({ gradeLevel: 8 }, user)).toEqual([]); expect(models[12].find).not.toHaveBeenCalled();
  });
  it('keeps all ordinary student course entry points empty after the grant query removes expired rows', async () => {
    expired();
    expect(await service.getStudentCourses(studentId)).toEqual([]);
    expect(await service.getStudentSchedule(studentId)).toEqual([]);
    expect(await service.getStudentLiveClasses(studentId)).toEqual([]);
    expect(await service.getVideosForStudent(studentId)).toEqual([]);
    expect(await service.getStudentAssignments(studentId)).toEqual([]);
    expect(await service.getStudentDashboard(studentId)).toMatchObject({ enrolled: false, courses: [], assignments: [], videos: [], liveClasses: [] });
    expect(models[8].find).not.toHaveBeenCalled(); expect(models[5].find).not.toHaveBeenCalled(); expect(models[6].find).not.toHaveBeenCalled();
  });
  it('does not let a calendar grade parameter restore a student with no active access', async () => {
    expired();
    expect(await service.getCalendarEvents(8, undefined, undefined, user)).toEqual({ liveClasses: [], assignments: [] });
    expect(models[4].find).not.toHaveBeenCalled(); expect(models[6].find).not.toHaveBeenCalled();
  });
  it('intersects calendar requests with exact active classes and excludes teacher answer keys and attachments', async () => {
    const assignmentsQuery = query([]); models[6].find.mockReturnValue(assignmentsQuery);
    await service.getCalendarEvents(9, undefined, undefined, user);
    expect(models[4].find).toHaveBeenCalledWith(expect.objectContaining({ gradeLevel: 9, $or: expect.arrayContaining([{ gradeId: { $in: [new Types.ObjectId(gradeId), gradeId] } }]) }));
    expect(assignmentsQuery.select).toHaveBeenCalledWith('-attachments -answerKey');
  });
  it('denies stale staff role claims and disabled accounts before privileged Zoom or answer-bank reads', async () => {
    for (const operation of [() => service.getManagedSubjects(studentId), () => service.getSchedules({}, studentId), () => service.getTeacherAssignments({}, studentId), () => service.getAllLiveClasses(studentId), () => service.getQuestions({}, studentId)]) await expect(operation()).rejects.toBeInstanceOf(ForbiddenException);
    expired(); await expect(service.getTestById(contentId, { ...user, role: UserRole.ADMIN })).rejects.toBeInstanceOf(ForbiddenException);
    setRole(UserRole.ADMIN, false);
    await expect(service.getManagedSubjects(studentId)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(models[10].find).not.toHaveBeenCalled(); expect(models[11].find).not.toHaveBeenCalled();
  });
  it('preserves explicitly selected Zoom fields for an entitled student and a current admin manager', async () => {
    const coursesQuery = query([]); models[8].find.mockReturnValue(coursesQuery);
    await service.getStudentCourses(studentId);
    expect(coursesQuery.populate).toHaveBeenCalledWith('subjectId', 'name gradeLevel description +zoomUrl +zoomMeetingId +zoomPasscode');
    setRole(UserRole.ADMIN); const managed = query([]); models[1].find.mockReturnValue(managed);
    await service.getManagedSubjects(studentId);
    expect(managed.select).toHaveBeenCalledWith('+zoomUrl +zoomMeetingId +zoomPasscode');
  });
  it('denies another teacher test and raw result collection while retaining an owner teacher view', async () => {
    setRole(UserRole.TEACHER);
    await expect(service.getTestById(contentId, user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getTestResultsForTeacher(contentId, user)).rejects.toBeInstanceOf(ForbiddenException);
    models[12].findById.mockReturnValue(query({ ...testRecord(), teacherId: studentId }));
    expect((await service.getTestById(contentId, user)).questionIds[0].correctAnswer).toBe(1);
    expect(models[13].find).not.toHaveBeenCalled();
  });

  describe('Teacher ownership and publication', () => {
    const ownerId = new Types.ObjectId(studentId);
    const recordId = new Types.ObjectId(contentId);
    const classId = new Types.ObjectId(gradeId);
    const courseId = new Types.ObjectId(subjectId);
    const ownedFilter = { _id: recordId, teacherId: ownerId };
    const teachingScope = { teacherId: ownerId, gradeId: classId, subjectId: courseId };

    beforeEach(() => {
      setRole(UserRole.TEACHER);
      models[0].findById.mockReturnValue(query({ level: 8, isActive: true }));
      models[8].exists.mockResolvedValue(true);
    });

    it('rejects foreign record mutations and uses ownership in the write itself', async () => {
      const foreign = assignment();
      for (const index of [4, 6, 10, 12]) {
        models[index].findOne.mockImplementation(filter => query(matches(foreign, filter) ? foreign : null));
        models[index].findOneAndDelete.mockImplementation(filter => query(matches(foreign, filter) ? foreign : null));
      }
      const patch = { title: 'Güncellenen içerik' };
      for (const action of [
        () => service.updateAssignment(contentId, patch, studentId),
        () => service.updateQuestion(contentId, { text: 'Güncellenen soru' }, studentId),
        () => service.updateTest(contentId, patch, studentId),
        () => service.deleteAssignment(contentId, studentId),
        () => service.deleteQuestion(contentId, studentId),
        () => service.deleteTest(contentId, studentId),
        () => service.deleteLiveClass(contentId, studentId),
      ]) await expect(action()).rejects.toBeInstanceOf(NotFoundException);
      for (const index of [6, 10, 12]) {
        expect(models[index].findOne).toHaveBeenCalledWith(ownedFilter);
        expect(models[index].findOneAndUpdate).not.toHaveBeenCalled();
      }
      for (const index of [4, 6, 10, 12]) expect(models[index].findOneAndDelete).toHaveBeenCalledWith(ownedFilter);

      const owned = { ...foreign, teacherId: ownerId };
      models[6].findOne.mockImplementation(filter => query(matches(owned, filter) ? owned : null));
      await service.updateAssignment(contentId, patch, studentId);
      expect(models[6].findOneAndUpdate).toHaveBeenCalledWith(ownedFilter,
        { $set: { ...patch, subjectId: courseId, gradeId: classId, gradeLevel: 8 } }, expect.anything());
      expect(models[8].exists).toHaveBeenCalledWith(teachingScope);
    });

    it('checks assignment ownership and current teacher binding before reading or grading a delivery', async () => {
      const foreign = assignment();
      models[6].findOne.mockImplementation(filter => query(matches(foreign, filter) ? foreign : null));
      models[7].findById.mockReturnValue(query({ assignmentId: recordId }));
      await expect(service.getSubmissions(contentId, studentId)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.gradeSubmission(questionId, 85, 'Geri bildirim', studentId)).rejects.toBeInstanceOf(NotFoundException);
      expect(models[7].find).not.toHaveBeenCalled();
      expect(models[7].findOneAndUpdate).not.toHaveBeenCalled();

      models[6].findOne.mockReturnValue(query({ ...foreign, teacherId: ownerId }));
      models[8].exists.mockResolvedValue(false);
      await expect(service.getSubmissions(contentId, studentId)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.gradeSubmission(questionId, 85, 'Geri bildirim', studentId)).rejects.toBeInstanceOf(ForbiddenException);
      expect(models[7].find).not.toHaveBeenCalled();
      expect(models[7].findOneAndUpdate).not.toHaveBeenCalled();

      models[8].exists.mockResolvedValue(true);
      expect(await service.getSubmissions(contentId, studentId)).toEqual([]);
      await service.gradeSubmission(questionId, 85, 'Geri bildirim', studentId);
      expect(models[7].findOneAndUpdate).toHaveBeenCalledWith({ _id: new Types.ObjectId(questionId), assignmentId: recordId },
        { $set: { grade: 85, feedback: 'Geri bildirim' } }, expect.anything());
    });

    it('keeps administrator moderation and denies a demoted or disabled account', async () => {
      setRole(UserRole.ADMIN);
      models[6].findOne.mockReturnValue(query(assignment()));
      models[4].findOneAndDelete.mockReturnValue(query({ _id: recordId }));
      models[7].findById.mockReturnValue(query({ assignmentId: recordId }));
      await service.getSubmissions(contentId, studentId);
      await service.gradeSubmission(questionId, 100, 'Tam puan', studentId);
      await service.deleteLiveClass(contentId, studentId);
      expect(models[6].findOne).toHaveBeenCalledWith({ _id: recordId });
      expect(models[4].findOneAndDelete).toHaveBeenCalledWith({ _id: recordId });
      expect(models[8].exists).not.toHaveBeenCalled();
      setRole(UserRole.STUDENT);
      await expect(service.deleteLiveClass(contentId, studentId)).rejects.toBeInstanceOf(ForbiddenException);
      setRole(UserRole.TEACHER, false);
      await expect(service.getSubmissions(contentId, studentId)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('requires the exact active class and subject binding for teacher publication', async () => {
      const scope = { gradeId, subjectId, gradeLevel: 8 };
      const live = { ...scope, title: 'Canlı ders', url: 'https://zoom.us/j/12345' };
      const homework = { ...scope, title: 'Ev ödevi' };
      models[8].exists.mockResolvedValue(false);
      await expect(service.createLiveClass(live, studentId)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.createAssignment(homework, studentId)).rejects.toBeInstanceOf(ForbiddenException);
      expect(models[4].create).not.toHaveBeenCalled();
      expect(models[6].create).not.toHaveBeenCalled();
      expect(models[8].exists).toHaveBeenCalledWith(teachingScope);

      models[8].exists.mockResolvedValue(true);
      await expect(service.createLiveClass({ ...live, gradeId: otherGradeId }, studentId)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.createAssignment({ ...homework, gradeLevel: 7 }, studentId)).rejects.toBeInstanceOf(BadRequestException);
      await service.createLiveClass(live, studentId);
      await service.createAssignment(homework, studentId);
      expect(models[4].create).toHaveBeenCalledWith(expect.objectContaining(teachingScope));
      expect(models[6].create).toHaveBeenCalledWith(expect.objectContaining(teachingScope));
    });

    it('derives a class from a global subject only when the teacher has a single matching class', async () => {
      models[1].findById.mockReturnValue(query({ gradeLevel: 8, isActive: true }));
      const live = { title: 'Canlı ders', subjectId, url: 'https://zoom.us/j/12345' };
      const binding = { gradeId: { _id: classId, level: 8, isActive: true } };
      models[8].find.mockReturnValue(query([binding, { gradeId: { ...binding.gradeId, _id: new Types.ObjectId(otherGradeId) } }]));
      await expect(service.createLiveClass(live, studentId)).rejects.toBeInstanceOf(BadRequestException);
      models[8].find.mockReturnValue(query([binding]));
      await service.createLiveClass(live, studentId);
      expect(models[4].create).toHaveBeenCalledWith(expect.objectContaining(teachingScope));
    });

    it('rejects ownership injection and foreign question IDs in an otherwise authorized test', async () => {
      const ownTest = { ...testRecord(), teacherId: ownerId, questionIds: [] };
      models[12].findOne.mockReturnValue(query(ownTest));
      await expect(service.updateTest(contentId, { teacherId }, studentId)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.updateQuestion(contentId, { $set: { teacherId } }, studentId)).rejects.toBeInstanceOf(BadRequestException);
      const inputs = { title: 'Konu testi', gradeLevel: 8, subjectId, questionIds: [questionId] };
      await expect(service.createTest(inputs, studentId)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.updateTest(contentId, inputs, studentId)).rejects.toBeInstanceOf(ForbiddenException);
      expect(models[12].create).not.toHaveBeenCalled();
      expect(models[12].findOneAndUpdate).not.toHaveBeenCalled();
      expect(models[10].find).toHaveBeenCalledWith({ _id: { $in: [new Types.ObjectId(questionId)] }, teacherId: ownerId, subjectId: courseId, gradeLevel: 8 });
      models[10].find.mockReturnValue(query([{ _id: new Types.ObjectId(questionId) }]));
      await service.updateTest(contentId, inputs, studentId);
      expect(models[12].findOneAndUpdate).toHaveBeenCalledWith(ownedFilter,
        { $set: { ...inputs, subjectId: courseId, questionIds: [new Types.ObjectId(questionId)] } }, expect.anything());
    });
  });

  it('grades optic answers on the server and rejects a replacement after answer review is available', async () => {
    models[6].findById.mockReturnValue(query({ ...assignment(), isOpticTest: true, answerKey: ['A', 'B'] }));
    const input = { assignmentId: contentId, studentId, grade: 100, opticResult: { score: 100 } };
    models[7].findOneAndUpdate.mockReturnValue(query({ lastErrorObject: { updatedExisting: false }, value: { grade: 50 } }));
    await expect(service.submitAssignment({ ...input, studentAnswers: ['A', {}] })).rejects.toBeInstanceOf(BadRequestException);
    expect(models[7].findOneAndUpdate).not.toHaveBeenCalled();
    await service.submitAssignment(input);
    expect(models[7].findOneAndUpdate.mock.calls[0][1].$setOnInsert).not.toHaveProperty('opticResult');
    expect(models[7].findOneAndUpdate.mock.calls[0][1].$setOnInsert).not.toHaveProperty('grade');
    await expect(service.submitAssignment({ ...input, studentAnswers: ['a', 'C'] })).resolves.toEqual({ grade: 50 });
    expect(models[7].findOneAndUpdate.mock.calls[1][1]).toEqual({ $setOnInsert: expect.objectContaining({
      studentAnswers: ['A', 'C'], grade: 50, opticResult: { correct: 1, incorrect: 1, empty: 0, score: 50 },
    }) });
    models[7].findOneAndUpdate.mockReturnValue(query({ lastErrorObject: { updatedExisting: true }, value: { grade: 50 } }));
    await expect(service.submitAssignment({ ...input, studentAnswers: ['A', 'B'] })).rejects.toBeInstanceOf(ConflictException);
    expect(models[7].findOneAndUpdate.mock.calls[2][1]).not.toHaveProperty('$set');
  });

  it('keeps the first exam attempt after the student can review correct answers', async () => {
    models[13].findOneAndUpdate.mockReturnValueOnce(query({ lastErrorObject: { updatedExisting: false }, value: { score: 0 } }))
      .mockReturnValueOnce(query({ lastErrorObject: { updatedExisting: true }, value: { score: 0 } }));
    await expect(service.submitTest(contentId, studentId, { [questionId]: 0 }, 10)).resolves.toEqual({ score: 0 });
    expect(models[13].findOneAndUpdate.mock.calls[0][1]).toEqual({ $setOnInsert: expect.objectContaining({ score: 0, wrongCount: 1 }) });
    await expect(service.submitTest(contentId, studentId, { [questionId]: 1 }, 15)).rejects.toBeInstanceOf(ConflictException);
    expect(models[13].findOneAndUpdate.mock.calls[1][1]).not.toHaveProperty('$set');
  });
});

describe('Subject public and authorized projection behavior', () => {
  const Subject = mongooseModel('SubjectAccessSecurityProjection', SubjectSchema);
  afterAll(() => deleteModel('SubjectAccessSecurityProjection'));
  it('excludes Zoom secrets by default in real Mongoose query projection', () => {
    const publicQuery: any = Subject.find(); publicQuery._applyPaths();
    expect(publicQuery.projection()).toMatchObject({ zoomUrl: 0, zoomMeetingId: 0, zoomPasscode: 0 });
  });
  it('allows the explicitly selected join projection used only by authorized course queries', () => {
    const authorized: any = Subject.find().select('name gradeLevel +zoomUrl +zoomMeetingId +zoomPasscode'); authorized._applyPaths();
    expect(authorized.projection()).toMatchObject({ name: 1, gradeLevel: 1, zoomUrl: 1, zoomMeetingId: 1, zoomPasscode: 1 });
  });
});
