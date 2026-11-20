import { Injectable, ConflictException, BadRequestException, NotFoundException, ForbiddenException, UnauthorizedException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '@repo/shared';
import { Grade, GradeDocument } from './schemas/grade.schema';
import { Subject, SubjectDocument } from './schemas/subject.schema';
import { Unit, UnitDocument } from './schemas/unit.schema';
import { Topic, TopicDocument } from './schemas/topic.schema';
import { LiveClass, LiveClassDocument } from './schemas/live-class.schema';
import { Video, VideoDocument } from './schemas/video.schema';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import { TeacherAssignment, TeacherAssignmentDocument } from './schemas/teacher-assignment.schema';
import { StudentEnrollment, StudentEnrollmentDocument, activePackageGrant, enrollmentAccessState } from './schemas/student-enrollment.schema';
import { Question, QuestionDocument } from './schemas/question.schema';
import { Schedule, ScheduleDocument } from './schemas/schedule.schema';
import { Test, TestDocument } from './schemas/test.schema';
import { TestResult, TestResultDocument } from './schemas/test-result.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class EducationService implements OnModuleInit {
    private readonly logger = new Logger(EducationService.name);

    constructor(
        @InjectModel(Grade.name) private gradeModel: Model<GradeDocument>,
        @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
        @InjectModel(Unit.name) private unitModel: Model<UnitDocument>,
        @InjectModel(Topic.name) private topicModel: Model<TopicDocument>,
        @InjectModel(LiveClass.name) private liveClassModel: Model<LiveClassDocument>,
        @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
        @InjectModel(Assignment.name) private assignmentModel: Model<AssignmentDocument>,
        @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
        @InjectModel(TeacherAssignment.name) private teacherAssignmentModel: Model<TeacherAssignmentDocument>,
        @InjectModel(StudentEnrollment.name) private studentEnrollmentModel: Model<StudentEnrollmentDocument>,
        @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
        @InjectModel(Schedule.name) private scheduleModel: Model<ScheduleDocument>,
        @InjectModel(Test.name) private testModel: Model<TestDocument>,
        @InjectModel(TestResult.name) private testResultModel: Model<TestResultDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    private async contentActor(user?: { userId: string; role?: string }) {
        if (!user?.userId || !Types.ObjectId.isValid(user.userId)) throw new UnauthorizedException('Aktif hesabınızla giriş yapın.');
        const actor: any = await this.userModel.findById(user.userId).select('_id role isActive').lean().exec();
        if (!actor || actor.isActive !== true) throw new UnauthorizedException('Aktif hesabınızla giriş yapın.');
        return actor;
    }

    private async contentRole(userId: string, allowed: string[]) {
        const actor = await this.contentActor({ userId });
        if (!allowed.includes(actor.role)) throw new ForbiddenException('Bu içeriğe erişim yetkiniz yok.');
        return actor;
    }

    private educationStaff(userId: string) {
        return this.contentRole(userId, [UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN]);
    }

    private contentId(value: unknown): Types.ObjectId {
        if (value instanceof Types.ObjectId) return value;
        if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) throw new BadRequestException('Geçerli içerik kimliği girin.');
        return new Types.ObjectId(value);
    }

    private staffOwnership(actor: { _id: Types.ObjectId; role: string }, id: string) {
        return { _id: this.contentId(id), ...(actor.role === UserRole.TEACHER ? { teacherId: actor._id } : {}) };
    }

    private staffFields(value: unknown, fields: readonly string[]): Record<string, any> {
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !fields.includes(key))) {
            throw new BadRequestException('İzin verilmeyen içerik alanı var.');
        }
        return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined));
    }

    private async staffSubjectScope(actor: { _id: Types.ObjectId; role: string }, subjectValue: unknown, gradeLevelValue?: unknown,
        gradeValue?: unknown, requireClass = false) {
        const subjectId = this.contentId(subjectValue);
        const subject = await this.subjectModel.findById(subjectId).select('gradeId gradeLevel isActive').lean().exec();
        if (!subject || subject.isActive === false || !Number.isInteger(subject.gradeLevel) || subject.gradeLevel < 1 || subject.gradeLevel > 12
            || (gradeLevelValue !== undefined && Number(gradeLevelValue) !== subject.gradeLevel)) {
            throw new BadRequestException('Ders ve sınıf seviyesi eşleşmiyor.');
        }
        const gradeLevel = subject.gradeLevel;
        const explicitGrade = gradeValue !== undefined && gradeValue !== null && gradeValue !== '' ? this.contentId(gradeValue) : undefined;
        if (explicitGrade && subject.gradeId && !explicitGrade.equals(subject.gradeId)) throw new BadRequestException('Ders seçilen sınıfa ait değil.');
        const gradeId = explicitGrade || subject.gradeId;
        if (gradeId) {
            const grade = await this.gradeModel.findById(gradeId).select('level isActive').lean().exec();
            if (!grade || grade.isActive !== true || grade.level !== gradeLevel) throw new BadRequestException('Ders seçilen aktif sınıfa ait değil.');
            if (actor.role === UserRole.TEACHER && !await this.teacherAssignmentModel.exists({ teacherId: actor._id, gradeId, subjectId })) {
                throw new ForbiddenException('Bu sınıf ve ders için öğretmen atamanız yok.');
            }
            return { subjectId, gradeLevel, gradeId };
        }
        if (actor.role !== UserRole.TEACHER) return { subjectId, gradeLevel, gradeId: undefined };
        const bindings: any[] = await this.teacherAssignmentModel.find({ teacherId: actor._id, subjectId }).select('gradeId')
            .populate({ path: 'gradeId', select: 'level isActive', match: { isActive: true, level: gradeLevel } }).lean().exec();
        const grades = [...new Set(bindings.filter(row => row.gradeId?.isActive === true && row.gradeId.level === gradeLevel)
            .map(row => String(row.gradeId._id)).filter(id => Types.ObjectId.isValid(id)))];
        if (!grades.length) throw new ForbiddenException('Bu ders ve seviyede aktif öğretmen atamanız yok.');
        if (requireClass && grades.length !== 1) throw new BadRequestException('Dersin yayınlanacağı sınıfı seçin.');
        return { subjectId, gradeLevel, gradeId: requireClass ? this.contentId(grades[0]) : undefined };
    }

    private async activeStudentScope(studentId: string) {
        if (!Types.ObjectId.isValid(studentId)) throw new ForbiddenException('Ders erişiminiz bulunamadı.');
        // Package grants are filtered by StudentEnrollmentSchema query middleware.
        const rows: any[] = await this.studentEnrollmentModel.find({ studentId: new Types.ObjectId(studentId) })
            .select('gradeId accessSource').populate({ path: 'gradeId', select: 'level isActive', match: { isActive: true } }).lean().exec();
        const grades = rows.map(row => row.gradeId).filter(grade => grade?._id && grade.isActive !== false && Number.isInteger(Number(grade.level)) && Number(grade.level) >= 1 && Number(grade.level) <= 12);
        const ids = grades.map(grade => String(grade._id));
        const fallbackLevels = [...new Set(rows.filter(row => (row.accessSource === undefined || row.accessSource === 'manual')
            && ids.includes(String(row.gradeId?._id))).map(row => Number(row.gradeId.level)))];
        return { ids, levels: [...new Set(grades.map(grade => Number(grade.level)))], fallbackLevels };
    }

    private async assertStudentContent(studentId: string, content: any) {
        const scope = await this.activeStudentScope(studentId);
        if (!scope.ids.length) throw new ForbiddenException('Bu ders için aktif erişiminiz bulunmuyor.');
        const classId = content.gradeId?._id || content.gradeId;
        if (classId) {
            if (!scope.ids.includes(String(classId))) throw new ForbiddenException('Bu içerik erişiminiz olan sınıfa ait değil.');
            return;
        }
        // Tests and older assignments may be level-only. A class-bound subject
        // still takes precedence so a parallel branch cannot be reached by ID.
        const subjectId = content.subjectId?._id || content.subjectId;
        if (subjectId) {
            const subject: any = await this.subjectModel.findById(subjectId).select('gradeId gradeLevel isActive').lean().exec();
            if (!subject || subject.isActive === false || (subject.gradeId && !scope.ids.includes(String(subject.gradeId)))
                || !scope.levels.includes(Number(subject.gradeLevel)) || Number(subject.gradeLevel) !== Number(content.gradeLevel)) throw new ForbiddenException('Bu ders için aktif erişiminiz bulunmuyor.');
            if (subject.gradeId) return;
            const bindings = await this.globalSubjectBindings(scope.ids.map(id => new Types.ObjectId(id)));
            if (bindings.some(binding => String(binding._id) === String(subjectId) && binding.gradeLevel === Number(subject.gradeLevel))) return;
        }
        if (!scope.fallbackLevels.includes(Number(content.gradeLevel))) throw new ForbiddenException('Bu içerik paketinizin açık sınıf veya ders kapsamına ait değil.');
    }

    private async authorizedTest(testId: string, user?: { userId: string; role?: string }) {
        const actor = await this.contentActor(user);
        if (!Types.ObjectId.isValid(testId)) throw new NotFoundException('Test bulunamadı.');
        const test: any = await this.testModel.findById(testId).populate('subjectId', 'name').populate('teacherId', 'firstName lastName')
            .populate({ path: 'questionIds', ...(actor.role === UserRole.TEACHER ? { match: { teacherId: actor._id } } : {}) }).exec();
        if (!test) throw new NotFoundException('Test bulunamadı.');
        if (actor.role === UserRole.STUDENT) {
            if (test.isActive === false) throw new ForbiddenException('Bu test kullanıma açık değil.');
            await this.assertStudentContent(String(actor._id), test);
        } else if (actor.role === UserRole.TEACHER) {
            if (String(test.teacherId?._id || test.teacherId) !== String(actor._id)) throw new ForbiddenException('Bu test için öğretmen yetkiniz yok.');
        } else if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role)) throw new ForbiddenException('Bu teste erişim yetkiniz yok.');
        return { actor, test };
    }

    async onModuleInit() {
        // Drop stale unique index on Grade.level (was unique: true in old schema)
        try {
            const collection = this.gradeModel.collection;
            const indexes = await collection.indexes();
            const levelIndex = indexes.find(
                (idx: any) => idx.key?.level !== undefined && idx.unique === true,
            );
            if (levelIndex && levelIndex.name) {
                await collection.dropIndex(levelIndex.name);
                this.logger.log('Dropped stale unique index on Grade.level');
            }
            await this.gradeModel.syncIndexes();
            this.logger.log('Grade indexes synced');
        } catch (err) {
            this.logger.warn('Grade index cleanup issue: ' + (err as any)?.message);
        }

        // Drop stale unique index on StudentEnrollment.studentId (was unique: true)
        try {
            const enrollCollection = this.studentEnrollmentModel.collection;
            const enrollIndexes = await enrollCollection.indexes();
            const studentIdIndex = enrollIndexes.find(
                (idx: any) => idx.key?.studentId !== undefined && idx.unique === true && !idx.key?.gradeId,
            );
            if (studentIdIndex && studentIdIndex.name) {
                await enrollCollection.dropIndex(studentIdIndex.name);
                this.logger.log('Dropped stale unique index on StudentEnrollment.studentId');
            }
            await this.studentEnrollmentModel.syncIndexes();
            this.logger.log('StudentEnrollment indexes synced');
        } catch (err) {
            this.logger.warn('StudentEnrollment index cleanup issue: ' + (err as any)?.message);
        }

        // Ensure performance indexes exist
        try {
            await this.assignmentModel.collection.createIndex({ gradeLevel: 1 });
            await this.assignmentModel.collection.createIndex({ gradeId: 1 });
            await this.assignmentModel.collection.createIndex({ teacherId: 1 });
            await this.submissionModel.collection.createIndex({ studentId: 1 });
            await this.submissionModel.collection.createIndex({ assignmentId: 1, studentId: 1 });
            await this.liveClassModel.collection.createIndex({ gradeLevel: 1 });
            await this.videoModel.collection.createIndex({ gradeLevel: 1 });
            this.logger.log('Performance indexes ensured');
        } catch (err) {
            this.logger.warn('Index creation issue: ' + (err as any)?.message);
        }
    }

    // ─── GRADES ─────────────────────────────────────────
    async createGrade(level: number, label?: string) {
        try {
            return await this.gradeModel.create({ level, label: label || `${level}. Sınıf` });
        } catch (err: any) {
            if (err?.code === 11000) {
                // Stale unique index — try to drop it and retry once
                this.logger.warn('Duplicate key on Grade.level — attempting index cleanup and retry');
                try {
                    await this.gradeModel.collection.dropIndex('level_1');
                    await this.gradeModel.syncIndexes();
                } catch { /* index already gone */ }
                // Retry the create
                return this.gradeModel.create({ level, label: label || `${level}. Sınıf` });
            }
            throw err;
        }
    }
    async getGrades() {
        return this.gradeModel.find().sort({ level: 1 }).exec();
    }
    async updateGrade(id: string, data: any) {
        return this.gradeModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }
    async deleteGrade(id: string) {
        const gradeOid = new Types.ObjectId(id);
        // Cascade: deactivate schedules referencing this grade
        try {
            await this.scheduleModel.updateMany(
                { gradeId: gradeOid },
                { isActive: false }
            );
            this.logger.log(`Deactivated schedules for deleted grade ${id}`);
        } catch (err) {
            this.logger.warn('Schedule cascade deactivation issue: ' + (err as any)?.message);
        }
        // Cascade: remove orphan enrollments and teacher assignments
        try {
            const enrollResult = await this.studentEnrollmentModel.deleteMany({ gradeId: gradeOid });
            const taResult = await this.teacherAssignmentModel.deleteMany({ gradeId: gradeOid });
            this.logger.log(`Cascade cleanup for grade ${id}: ${enrollResult.deletedCount} enrollments, ${taResult.deletedCount} teacher assignments removed`);
        } catch (err) {
            this.logger.warn('Cascade enrollment/TA cleanup issue: ' + (err as any)?.message);
        }
        return this.gradeModel.findByIdAndDelete(id).exec();
    }

    // ─── SUBJECTS ───────────────────────────────────────
    private async requireSubjectGrade(gradeId: string) {
        if (!Types.ObjectId.isValid(gradeId)) {
            throw new BadRequestException('Geçersiz sınıf kimliği.');
        }
        const grade = await this.gradeModel.findById(gradeId).exec();
        if (!grade) throw new NotFoundException('Sınıf bulunamadı.');
        return grade;
    }

    async createSubject(createSubjectDto: any) {
        if (createSubjectDto.gradeId) {
            const grade = await this.requireSubjectGrade(createSubjectDto.gradeId);
            createSubjectDto = { ...createSubjectDto, gradeLevel: grade.level };
        }
        try {
            return await this.subjectModel.create(createSubjectDto);
        } catch (err: any) {
            if (err?.code === 11000) {
                this.logger.warn('Duplicate key on Subject — attempting index cleanup and retry');
                try {
                    await this.subjectModel.collection.dropIndex('name_1_gradeLevel_1');
                    await this.subjectModel.syncIndexes();
                } catch { /* index already gone */ }
                return this.subjectModel.create(createSubjectDto);
            }
            throw err;
        }
    }
    async getSubjects(gradeLevel?: number, gradeId?: string, includeMeetings = false) {
        const filter: any = {};
        if (gradeId) {
            const grade = await this.requireSubjectGrade(gradeId);
            const gradeOid = new Types.ObjectId(gradeId);
            const [scheduledIds, assignedIds] = await Promise.all([
                this.scheduleModel.distinct('subjectId', { gradeId: gradeOid, isActive: { $ne: false } }).exec(),
                this.teacherAssignmentModel.distinct('subjectId', { gradeId: gradeOid }).exec(),
            ]);
            // Legacy curriculum subjects are shared by level. Also retain the exact
            // subjects already used by this class, even after a class reassignment.
            filter.$or = [
                { gradeId: gradeOid },
                { gradeId: null, gradeLevel: grade.level },
                { _id: { $in: [...scheduledIds, ...assignedIds] } },
            ];
        } else if (gradeLevel) {
            filter.gradeLevel = Number(gradeLevel);
        }
        const query = this.subjectModel.find(filter).populate('gradeId');
        if (includeMeetings) query.select('+zoomUrl +zoomMeetingId +zoomPasscode');
        return query.exec();
    }
    async getAllSubjects(includeMeetings = false) {
        const query = this.subjectModel.find().populate('gradeId');
        if (includeMeetings) query.select('+zoomUrl +zoomMeetingId +zoomPasscode');
        return query.exec();
    }
    async getManagedSubjects(userId: string, gradeId?: string) {
        const actor = await this.contentActor({ userId });
        if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role)) throw new ForbiddenException('Ders bağlantılarını yönetme yetkiniz yok.');
        return gradeId ? this.getSubjects(undefined, gradeId, true) : this.getAllSubjects(true);
    }
    async getSubjectsByIds(ids: string[]) {
        if (!Array.isArray(ids) || ids.length > 200 || ids.some(id => typeof id !== 'string' || !Types.ObjectId.isValid(id))) throw new BadRequestException('Geçerli ders kimliklerini girin.');
        return this.subjectModel.find({ _id: { $in: ids.map(id => new Types.ObjectId(id)) } }).populate('gradeId').exec();
    }
    async updateSubject(id: string, data: any) {
        if (data.gradeId) {
            const grade = await this.requireSubjectGrade(data.gradeId);
            data = { ...data, gradeLevel: grade.level };
        }
        return this.subjectModel.findByIdAndUpdate(id, data, { new: true }).populate('gradeId').exec();
    }
    async deleteSubject(id: string) {
        return this.subjectModel.findByIdAndDelete(id).exec();
    }

    // ─── UNITS ──────────────────────────────────────────
    async createUnit(createUnitDto: any) {
        return this.unitModel.create(createUnitDto);
    }
    async getUnits(subjectId?: string) {
        if (subjectId) {
            return this.unitModel.find({ subjectId: new Types.ObjectId(subjectId) }).sort({ order: 1 }).exec();
        }
        return this.unitModel.find().sort({ order: 1 }).exec();
    }
    async updateUnit(id: string, data: any) {
        return this.unitModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }
    async deleteUnit(id: string) {
        return this.unitModel.findByIdAndDelete(id).exec();
    }

    // ─── TOPICS ─────────────────────────────────────────
    async createTopic(createTopicDto: any) {
        return this.topicModel.create(createTopicDto);
    }
    async getTopics(unitId?: string) {
        if (unitId) {
            return this.topicModel.find({ unitId: new Types.ObjectId(unitId) }).sort({ order: 1 }).exec();
        }
        return this.topicModel.find().sort({ order: 1 }).exec();
    }
    async updateTopic(id: string, data: any) {
        return this.topicModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }
    async deleteTopic(id: string) {
        return this.topicModel.findByIdAndDelete(id).exec();
    }

    // ─── LIVE CLASSES ───────────────────────────────────
    async createLiveClass(data: unknown, userId: string) {
        const actor = await this.educationStaff(userId);
        const fields = this.staffFields(data, ['title', 'description', 'url', 'platform', 'meetingId', 'passcode', 'startTime', 'durationMinutes',
            'gradeLevel', 'gradeId', 'subjectId', 'isActive', ...(actor.role === UserRole.TEACHER ? [] : ['teacherId'])]);
        const scope = await this.staffSubjectScope(actor, fields.subjectId, fields.gradeLevel, fields.gradeId, true);
        const teacherId = fields.teacherId ? this.contentId(fields.teacherId) : actor._id;
        if (fields.teacherId) await this.contentRole(String(teacherId), [UserRole.TEACHER]);
        return this.liveClassModel.create({ ...fields, ...scope, teacherId, url: this.videoLink(fields.url) });
    }
    async getTeacherLiveClasses(teacherId: string) {
        await this.contentRole(teacherId, [UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN]);
        return this.liveClassModel.find({ teacherId: new Types.ObjectId(teacherId) })
            .populate('subjectId', 'name')
            .populate('gradeId', 'level label')
            .sort({ startTime: 1 })
            .exec();
    }
    async getAllLiveClasses(userId: string) {
        await this.contentRole(userId, [UserRole.ADMIN, UserRole.SUPERADMIN]);
        return this.liveClassModel.find({})
            .populate('subjectId', 'name')
            .populate('gradeId', 'level label')
            .populate('teacherId', 'firstName lastName')
            .sort({ startTime: -1 })
            .exec();
    }
    async getStudentLiveClasses(studentId: string) {
        await this.contentRole(studentId, [UserRole.STUDENT]);
        const scope = await this.activeStudentScope(studentId);
        if (!scope.ids.length) return [];
        const filter = await this.buildAssignmentScope(scope.ids.map(id => new Types.ObjectId(id)), scope.levels, scope.fallbackLevels);
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        return this.liveClassModel.find({
            ...filter,
            startTime: { $gte: twoHoursAgo },
        })
            .populate('subjectId', 'name')
            .populate('gradeId', 'level label')
            .populate('teacherId', 'firstName lastName')
            .sort({ startTime: 1 })
            .exec();
    }
    async deleteLiveClass(id: string, userId: string) {
        const actor = await this.educationStaff(userId);
        const filter = this.staffOwnership(actor, id);
        const removed = await this.liveClassModel.findOneAndDelete(filter).exec();
        if (!removed) throw new NotFoundException('Canlı ders bulunamadı.');
        return removed;
    }

    // ─── VIDEOS ─────────────────────────────────────────
    async createVideo(data: any, teacherId: string) {
        if (!data || typeof data !== 'object' || Array.isArray(data) || ['source', 'storageKey', 'sourceHash', 'mimeType', 'sizeBytes', 'durationSeconds'].some(key => data[key] !== undefined)) throw new BadRequestException('Video dosyaları güvenli yükleme ekranından eklenmelidir.');
        const actor = await this.videoEditor(teacherId);
        const grade = await this.validateVideoClass(actor, data.gradeId, data.subjectId);
        if (typeof data.title !== 'string' || data.title.trim().length < 2 || data.title.length > 180 || (data.description !== undefined && (typeof data.description !== 'string' || data.description.length > 2000))) throw new BadRequestException('Video başlığı ve açıklamasını kontrol edin.');
        return this.videoModel.create({ title: data.title.trim(), description: data.description?.trim() || '', videoUrl: this.videoLink(data.videoUrl), source: 'link', teacherId: actor._id, gradeId: grade._id, gradeLevel: grade.level, subjectId: new Types.ObjectId(data.subjectId) });
    }
    async getVideos(query: any, userId: string) {
        const actor = await this.contentActor({ userId });
        if (actor.role === UserRole.STUDENT) return this.getVideosForStudent(userId, query);
        if (actor.role === UserRole.TEACHER) query = { ...query, teacherId: userId };
        else if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role)) throw new ForbiddenException('Videolara erişim yetkiniz yok.');
        const filter: any = {};
        if (query.gradeLevel) filter.gradeLevel = Number(query.gradeLevel);
        if (query.subjectId) filter.subjectId = new Types.ObjectId(query.subjectId);
        if (query.teacherId) filter.teacherId = new Types.ObjectId(query.teacherId);
        if (query.topicId) filter.topicId = new Types.ObjectId(query.topicId);
        return this.videoModel.find(filter)
            .populate('subjectId', 'name')
            .populate('gradeId', 'level label')
            .populate('topicId', 'name')
            .populate('teacherId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }
    /** Videos limited to the classes the student is actually enrolled in. */
    async getVideosForStudent(studentId: string, query: any = {}) {
        await this.contentRole(studentId, [UserRole.STUDENT]);
        const scope = await this.activeStudentScope(studentId);
        if (!scope.ids.length) return [];
        const filter: any = await this.buildAssignmentScope(scope.ids.map(id => new Types.ObjectId(id)), scope.levels, scope.fallbackLevels);
        if (query.subjectId && Types.ObjectId.isValid(query.subjectId)) {
            filter.subjectId = new Types.ObjectId(query.subjectId);
        }
        if (query.topicId && Types.ObjectId.isValid(query.topicId)) {
            filter.topicId = new Types.ObjectId(query.topicId);
        }

        return this.videoModel.find(filter)
            .populate('subjectId', 'name')
            .populate('gradeId', 'level label')
            .populate('topicId', 'name')
            .populate('teacherId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .lean().exec();
    }

    private async videoEditor(userId: string) {
        if (!Types.ObjectId.isValid(userId)) throw new ForbiddenException('Video düzenleme yetkiniz yok.');
        const actor = await this.userModel.findById(userId).select('_id role isActive').lean().exec();
        if (!actor || actor.isActive === false || ![UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.TEACHER].includes(actor.role as UserRole)) throw new ForbiddenException('Video düzenleme yetkiniz yok.');
        return actor;
    }

    private async validateVideoClass(actor: any, gradeId: string, subjectId: string) {
        if (!Types.ObjectId.isValid(gradeId) || !Types.ObjectId.isValid(subjectId)) throw new BadRequestException('Geçerli sınıf ve ders seçilmelidir.');
        const [grade, subject] = await Promise.all([this.gradeModel.findById(gradeId).lean().exec(), this.subjectModel.findById(subjectId).lean().exec()]);
        if (!grade || !subject || grade.isActive === false || subject.isActive === false || Number(grade.level) !== Number(subject.gradeLevel) || (subject.gradeId && String(subject.gradeId) !== String(grade._id))) throw new BadRequestException('Ders seçilen sınıfa ait değil.');
        if (actor.role === UserRole.TEACHER && !await this.teacherAssignmentModel.exists({ teacherId: actor._id, gradeId: grade._id, subjectId: subject._id })) throw new ForbiddenException('Bu sınıf ve ders için yetkiniz yok.');
        return grade;
    }

    private videoLink(value: unknown) {
        if (typeof value !== 'string' || !value.trim() || value.length > 2048) throw new BadRequestException('Geçerli bir video bağlantısı girin.');
        try {
            const url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
            return url.toString();
        } catch { throw new BadRequestException('Geçerli bir video bağlantısı girin.'); }
    }

    private async editableLinkedVideo(userId: string, id: string) {
        const actor = await this.videoEditor(userId);
        if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Geçersiz video kimliği.');
        const video = await this.videoModel.findById(id).lean().exec();
        if (!video) throw new NotFoundException('Video bulunamadı.');
        if (actor.role === UserRole.TEACHER && String(video.teacherId) !== userId) throw new ForbiddenException('Bu videoyu düzenleme yetkiniz yok.');
        if (video.source === 'upload') throw new BadRequestException('Yüklenen ders videosunu güvenli video yönetimi ekranından düzenleyin.');
        return { actor, video };
    }

    async updateVideo(id: string, data: any, userId: string) {
        const { actor, video } = await this.editableLinkedVideo(userId, id);
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BadRequestException('Video bilgileri geçersiz.');
        const update: any = {};
        if (data.title !== undefined) {
            if (typeof data.title !== 'string' || data.title.trim().length < 2 || data.title.length > 180) throw new BadRequestException('Geçerli video başlığı girin.');
            update.title = data.title.trim();
        }
        if (data.description !== undefined) {
            if (typeof data.description !== 'string' || data.description.length > 2000) throw new BadRequestException('Video açıklaması çok uzun.');
            update.description = data.description;
        }
        if (data.videoUrl !== undefined) {
            update.videoUrl = this.videoLink(data.videoUrl);
        }
        if (data.durationMinutes !== undefined) {
            if (!Number.isFinite(data.durationMinutes) || data.durationMinutes < 0 || data.durationMinutes > 1440) throw new BadRequestException('Geçerli video süresi girin.');
            update.durationMinutes = data.durationMinutes;
        }
        // Without these a teacher could not move a video to the right class,
        // which is the only way to fix the ones uploaded before classes existed.
        if (data.gradeId !== undefined || data.subjectId !== undefined || data.gradeLevel !== undefined) {
            const grade = await this.validateVideoClass(actor, String(data.gradeId || video.gradeId || ''), String(data.subjectId || video.subjectId));
            update.gradeId = grade._id; update.gradeLevel = grade.level; update.subjectId = new Types.ObjectId(String(data.subjectId || video.subjectId));
        }
        return this.videoModel.findByIdAndUpdate(id, update, { new: true })
            .populate('subjectId', 'name')
            .populate('gradeId', 'level label')
            .populate('teacherId', 'firstName lastName')
            .exec();
    }
    async deleteVideo(id: string, userId: string) {
        await this.editableLinkedVideo(userId, id);
        return this.videoModel.findByIdAndDelete(id).exec();
    }
    async incrementVideoViews(id: string, userId: string) {
        if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) throw new BadRequestException('Geçersiz video veya kullanıcı kimliği.');
        const [actor, video] = await Promise.all([this.userModel.findById(userId).select('_id role isActive').lean().exec(), this.videoModel.findById(id).select('gradeId gradeLevel subjectId teacherId').lean().exec()]);
        if (!actor || actor.isActive === false || !video) throw new ForbiddenException('Videoya erişiminiz yok.');
        if (actor.role === UserRole.TEACHER) {
            if (String(video.teacherId) !== userId) throw new ForbiddenException('Videoya erişiminiz yok.');
            await this.validateVideoClass(actor, String(video.gradeId || ''), String(video.subjectId));
        } else if (actor.role === UserRole.STUDENT) {
            await this.assertStudentContent(userId, video);
        } else if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role as UserRole)) throw new ForbiddenException('Videoya erişiminiz yok.');
        return this.videoModel.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true }).exec();
    }

    // ─── ASSIGNMENTS ────────────────────────────────────
    // Active assignments (deadline not passed) first — nearest deadline on top;
    // expired assignments last, most recently expired first.
    private sortAssignmentsActiveFirst<T>(list: T[]): T[] {
        const now = new Date();
        const isExpired = (a: any) => {
            if (!a.dueDate) return false;
            const deadline = new Date(a.dueDate);
            deadline.setHours(23, 59, 59, 999);
            return deadline < now;
        };
        return [...list].sort((a: any, b: any) => {
            const ea = isExpired(a);
            const eb = isExpired(b);
            if (ea !== eb) return ea ? 1 : -1;
            const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return cb - ca; // Newest first
        });
    }

    /**
     * Which assignments a student may see.
     *
     * An assignment belongs to a specific class via `gradeId`. Matching on
     * `gradeLevel` alone leaks every parallel class at the same level — level 8
     * holds NOVA, VENÜS, SATÜRN and ORİON, so a NOVA student was shown all four
     * classes' work. Matching on the teacher additionally leaked every grade
     * that teacher taught, which is how 6th/7th grade assignments reached 8th
     * graders.
     *
     * Match an explicit class or a class-bound subject (including a genuine
     * TeacherAssignment for a global subject). A bare level fallback belongs
     * only to active manual/legacy institution enrollments, never package grants.
     *
     * Both id fields appear as ObjectId and as string in this database (legacy
     * records), so each side is matched in both forms.
     */
    // Return type is `any` because Mongoose 9 cannot infer a union of shapes
    // like this one against each model's own filter type.
    private async globalSubjectBindings(gradeOids: any[]) {
        const ids = gradeOids.map(String);
        const bindings: any[] = await this.teacherAssignmentModel.find({ gradeId: { $in: gradeOids } })
            .select('gradeId subjectId').populate('gradeId', 'level isActive').lean().exec();
        return bindings.filter(binding => binding.gradeId?._id && ids.includes(String(binding.gradeId._id))
            && binding.gradeId.isActive !== false && Number.isInteger(Number(binding.gradeId.level))
            && Types.ObjectId.isValid(String(binding.subjectId?._id || binding.subjectId)))
            .map(binding => ({ gradeId: null, _id: new Types.ObjectId(String(binding.subjectId?._id || binding.subjectId)), gradeLevel: Number(binding.gradeId.level) }));
    }

    private async permittedSubjects(gradeOids: any[], gradeLevels: any[], fallbackLevels: number[]) {
        const bindings = await this.globalSubjectBindings(gradeOids);
        return this.subjectModel.find({ isActive: { $ne: false }, gradeLevel: { $in: gradeLevels }, $or: [
            { gradeId: { $in: gradeOids } },
            ...bindings,
            ...(fallbackLevels.length ? [{ gradeId: null, gradeLevel: { $in: fallbackLevels } }] : []),
        ] }).select('_id gradeLevel').lean().exec();
    }

    private async buildAssignmentScope(gradeOids: any[], gradeLevels: any[], fallbackLevels: number[]): Promise<any> {
        const idVariants = [
            ...gradeOids,
            ...gradeOids.map((o: any) => o?.toString?.()).filter(Boolean),
        ];
        const levelVariants = [
            ...new Set(gradeLevels.flatMap((l: any) => [Number(l), String(l)])),
        ];

        const subjects = await this.permittedSubjects(gradeOids, gradeLevels, fallbackLevels);
        const subjectVariants = subjects.flatMap(subject => [subject._id, String(subject._id)]);
        const legacyLevels = [...new Set(fallbackLevels.flatMap(level => [level, String(level)]))];
        return {
            $or: [
                { gradeId: { $in: idVariants } },
                { $and: [
                    { $or: [{ gradeId: { $exists: false } }, { gradeId: null }] },
                    { gradeLevel: { $in: levelVariants } },
                    { $or: [
                        { subjectId: { $in: subjectVariants } },
                        ...(legacyLevels.length ? [{ subjectId: null, gradeLevel: { $in: legacyLevels } }] : []),
                    ] },
                ] },
            ],
        };
    }

    /**
     * Attachments are base64 data URIs and can be several MB each, so list
     * endpoints exclude them (`.select('-attachments')`) and use this to report
     * how many each assignment has. The file itself is fetched on demand via
     * GET assignments/:id/attachment/:index.
     */
    private async getAttachmentCounts(filter: any): Promise<Map<string, number>> {
        const rows = await this.assignmentModel.aggregate([
            { $match: filter },
            { $project: { n: { $size: { $ifNull: ['$attachments', []] } } } },
        ]).exec();
        return new Map(rows.map((r: any) => [r._id.toString(), r.n]));
    }

    private assignmentFields(data: unknown) {
        return this.staffFields(data, ['title', 'description', 'dueDate', 'instructions', 'maxScore', 'attachments',
            'isOpticTest', 'opticOptionsCount', 'durationMinutes', 'answerKey', 'gradeLevel', 'gradeId', 'subjectId']);
    }

    async createAssignment(data: unknown, userId: string) {
        const actor = await this.educationStaff(userId);
        const fields = this.assignmentFields(data);
        const scope = await this.staffSubjectScope(actor, fields.subjectId, fields.gradeLevel, fields.gradeId, true);
        return this.assignmentModel.create({ ...fields, ...scope, teacherId: actor._id });
    }
    async getAssignments(query: any, userId: string) {
        const actor = await this.contentActor({ userId });
        if (actor.role === UserRole.STUDENT) return this.getStudentAssignments(userId);
        if (actor.role === UserRole.TEACHER) query = { ...query, teacherId: userId };
        else if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role)) throw new ForbiddenException('Ödevlere erişim yetkiniz yok.');
        const filter: any = {};
        if (query.gradeLevel) filter.gradeLevel = Number(query.gradeLevel);
        if (query.subjectId && Types.ObjectId.isValid(query.subjectId.toString())) {
            filter.subjectId = new Types.ObjectId(query.subjectId.toString());
        }
        if (query.teacherId && query.teacherId !== "undefined" && query.teacherId !== "null") {
            const tidStr = query.teacherId.toString();
            if (Types.ObjectId.isValid(tidStr)) {
                filter.$or = [
                    { teacherId: new Types.ObjectId(tidStr) },
                    { teacherId: tidStr }
                ];
            }
        }
        const [assignments, attCounts] = await Promise.all([
            this.assignmentModel.find(filter)
                .select('-attachments') // exclude multi-MB base64 payloads
                .populate('subjectId', 'name')
                .populate('gradeId', 'level label')
                .populate('teacherId', 'firstName lastName')
                .lean().exec(),
            this.getAttachmentCounts(filter),
        ]);
        assignments.forEach((a: any) => { a.attachmentCount = attCounts.get(a._id.toString()) || 0; });
        return this.sortAssignmentsActiveFirst(assignments);
    }
    async updateAssignment(id: string, data: unknown, userId: string) {
        const actor = await this.educationStaff(userId);
        const filter = this.staffOwnership(actor, id);
        const fields = this.assignmentFields(data);
        const current = await this.assignmentModel.findOne(filter).select('gradeId gradeLevel subjectId').lean().exec();
        if (!current) throw new NotFoundException('Ödev bulunamadı.');
        const scope = await this.staffSubjectScope(actor, fields.subjectId ?? current.subjectId,
            fields.gradeLevel ?? (fields.subjectId === undefined ? current.gradeLevel : undefined),
            fields.gradeId === undefined ? current.gradeId : fields.gradeId, true);
        const updated = await this.assignmentModel.findOneAndUpdate(filter, { $set: { ...fields, ...scope, gradeId: scope.gradeId ?? null } }, { returnDocument: 'after', runValidators: true })
            .populate('subjectId', 'name')
            .populate('gradeId', 'level label')
            .populate('teacherId', 'firstName lastName')
            .exec();
        if (!updated) throw new NotFoundException('Ödev bulunamadı.');
        return updated;
    }
    async deleteAssignment(id: string, userId: string) {
        const actor = await this.educationStaff(userId);
        const removed = await this.assignmentModel.findOneAndDelete(this.staffOwnership(actor, id)).exec();
        if (!removed) throw new NotFoundException('Ödev bulunamadı.');
        return removed;
    }
    /** Ids of the classes a student is enrolled in. */
    private async getStudentGradeIds(studentId: string): Promise<string[]> {
        const sid = Types.ObjectId.isValid(studentId) ? new Types.ObjectId(studentId) : studentId;
        const enrollments = await this.studentEnrollmentModel
            .find({ $or: [{ studentId: sid }, { studentId: studentId.toString() }] })
            .select('gradeId').lean().exec();
        return enrollments
            .map((e: any) => (e.gradeId?._id || e.gradeId)?.toString())
            .filter(Boolean);
    }

    async submitAssignment(data: any) {
        const assignment = await this.assignmentModel
            .findById(new Types.ObjectId(data.assignmentId))
            .select('answerKey opticOptionsCount isOpticTest gradeId gradeLevel subjectId')
            .lean().exec();
        if (!assignment) {
            throw new NotFoundException('Ödev bulunamadı.');
        }

        // The listing endpoints scope assignments to the student's own class,
        // but nothing stopped a direct POST to someone else's assignment — and
        // while the listing was leaking, students really did submit across
        // classes. Enforce it here so the data cannot be polluted again.
        const actor = await this.contentActor({ userId: data.studentId });
        if (actor.role !== UserRole.STUDENT) throw new ForbiddenException('Ödev teslimi için öğrenci hesabı gerekir.');
        await this.assertStudentContent(data.studentId, assignment);

        const updateData: any = {
            submittedAt: new Date(),
        };
        if (data.fileUrl) updateData.fileUrl = data.fileUrl;
        if (data.note) updateData.note = data.note;
        // Grades and optic results are server-owned, including on malformed or
        // missing answers. Never persist a client-supplied result as a fallback.
        if (data.studentAnswers !== undefined) {
            const answerKey = assignment.answerKey;
            if (!assignment.isOpticTest || !Array.isArray(answerKey) || !answerKey.length || !Array.isArray(data.studentAnswers)
                || data.studentAnswers.length > answerKey.length || data.studentAnswers.some((value: unknown) => typeof value !== 'string' || !/^[A-Z]?$/i.test(value.trim()))) {
                throw new BadRequestException('Geçerli optik form cevapları girin.');
            }
            const studentAnswers = data.studentAnswers.map((value: string) => value.trim().toUpperCase());
            let correct = 0, incorrect = 0, empty = 0;
            answerKey.forEach((correctAnswer, index) => {
                const answer = studentAnswers[index];
                if (!answer) empty++;
                else if (answer === String(correctAnswer || '').trim().toUpperCase()) correct++;
                else incorrect++;
            });
            const score = Math.round((correct / answerKey.length) * 100);
            updateData.studentAnswers = studentAnswers;
            updateData.opticResult = { correct, incorrect, empty, score };
            updateData.grade = score;
        }

        const now = new Date();
        const result = await this.submissionModel.findOneAndUpdate(
            { assignmentId: this.contentId(data.assignmentId), studentId: this.contentId(data.studentId) },
            { $setOnInsert: { ...updateData, createdAt: now, updatedAt: now } },
            { upsert: true, returnDocument: 'after', includeResultMetadata: true, timestamps: false, runValidators: true },
        ).exec();
        if (result.lastErrorObject?.updatedExisting || !result.value) throw new ConflictException('Bu ödev daha önce teslim edilmiş.');
        return result.value;
    }
    async getSubmissions(assignmentId: string, userId: string) {
        const actor = await this.educationStaff(userId);
        const filter = this.staffOwnership(actor, assignmentId);
        const assignment = await this.assignmentModel
            .findOne(filter)
            .select('answerKey opticOptionsCount isOpticTest title gradeId gradeLevel subjectId')
            .lean().exec();
        if (!assignment) throw new NotFoundException('Ödev bulunamadı.');
        if (actor.role === UserRole.TEACHER) await this.staffSubjectScope(actor, assignment.subjectId, assignment.gradeLevel, assignment.gradeId, true);

        let subs = await this.submissionModel
            .find({ assignmentId: new Types.ObjectId(assignmentId) })
            .populate('studentId', 'firstName lastName')
            .lean().exec();

        // While the listing endpoints were leaking, students submitted to other
        // classes' assignments — so a Year 6 pupil's answers can sit inside a
        // Year 8 assignment. Those rows are kept (they are real student work)
        // but hidden from the teacher's list for the class they don't belong to.
        const assignmentGradeId = (assignment as any)?.gradeId?.toString();
        if (assignmentGradeId && subs.length) {
            const studentIds = subs
                .map((s: any) => (s.studentId?._id || s.studentId)?.toString())
                .filter(Boolean);
            const enrollments = await this.studentEnrollmentModel
                .find({ studentId: { $in: studentIds.flatMap((id: string) => Types.ObjectId.isValid(id) ? [new Types.ObjectId(id), id] : [id]) } as any })
                .select('studentId gradeId').lean().exec();

            const classOf = new Map<string, string[]>();
            enrollments.forEach((e: any) => {
                const sid = (e.studentId?._id || e.studentId)?.toString();
                const gid = (e.gradeId?._id || e.gradeId)?.toString();
                if (!sid || !gid) return;
                classOf.set(sid, [...(classOf.get(sid) || []), gid]);
            });

            subs = subs.filter((s: any) => {
                const sid = (s.studentId?._id || s.studentId)?.toString();
                const classes = classOf.get(sid);
                // Students with no enrollment record are left visible rather
                // than silently dropped.
                return !classes?.length || classes.includes(assignmentGradeId);
            });
        }

        // opticResult eksikse ve studentAnswers varsa hesapla
        const answerKey: string[] = (assignment as any)?.isOpticTest && Array.isArray((assignment as any)?.answerKey)
            ? (assignment as any).answerKey
            : [];

        return subs.map((sub: any) => {
            if (!sub.opticResult && sub.studentAnswers && Array.isArray(sub.studentAnswers) && answerKey.length > 0) {
                let correct = 0, incorrect = 0, empty = 0;
                const count = Math.max(answerKey.length, sub.studentAnswers.length);
                for (let i = 0; i < count; i++) {
                    const studentAns = (sub.studentAnswers[i] || '').trim().toUpperCase();
                    const correctAns = (answerKey[i] || '').trim().toUpperCase();
                    if (!studentAns) empty++;
                    else if (studentAns === correctAns) correct++;
                    else incorrect++;
                }
                const total = answerKey.length;
                const score = total > 0 ? Math.round((correct / total) * 100) : 0;
                sub.opticResult = { correct, incorrect, empty, score };
                // Show the auto-grade for submissions saved before grading moved
                // server-side; a grade the teacher set by hand is left alone.
                if (sub.grade === undefined || sub.grade === null) sub.grade = score;
            }
            return sub;
        });
    }
    async gradeSubmission(id: string, grade: number, feedback: string, userId: string) {
        const actor = await this.educationStaff(userId);
        if (typeof grade !== 'number' || !Number.isFinite(grade) || grade < 0 || grade > 100
            || (feedback !== undefined && (typeof feedback !== 'string' || feedback.length > 4000))) {
            throw new BadRequestException('Geçerli not ve geri bildirim girin.');
        }
        const submissionId = this.contentId(id);
        const submission = await this.submissionModel.findById(submissionId).select('assignmentId').lean().exec();
        if (!submission) throw new NotFoundException('Teslim bulunamadı.');
        const assignment = await this.assignmentModel.findOne(this.staffOwnership(actor, String(submission.assignmentId)))
            .select('subjectId gradeId gradeLevel').lean().exec();
        if (!assignment) throw new NotFoundException('Teslim bulunamadı.');
        if (actor.role === UserRole.TEACHER) await this.staffSubjectScope(actor, assignment.subjectId, assignment.gradeLevel, assignment.gradeId, true);
        const updated = await this.submissionModel.findOneAndUpdate({ _id: submissionId, assignmentId: submission.assignmentId },
            { $set: { grade, ...(feedback === undefined ? {} : { feedback }) } }, { returnDocument: 'after', runValidators: true }).exec();
        if (!updated) throw new NotFoundException('Teslim bulunamadı.');
        return updated;
    }

    async getStudentAssignments(studentId: string) {
        await this.contentRole(studentId, [UserRole.STUDENT]);
        const sid = Types.ObjectId.isValid(studentId) ? new Types.ObjectId(studentId) : studentId;
        const scope = await this.activeStudentScope(studentId);
        if (!scope.ids.length) return [];
        const gradeLevels = scope.levels, gradeOids = scope.ids.map(id => new Types.ObjectId(id));
        const filterCond = await this.buildAssignmentScope(gradeOids, gradeLevels, scope.fallbackLevels);

        // NOTE: `attachments` holds base64 data URIs (often several MB each).
        // Excluding them here keeps the list response tiny — the actual file is
        // fetched lazily via GET assignments/:id/attachment/:index on click.
        const rawAssignments = await this.assignmentModel.find(filterCond)
            .select('-attachments')
            .populate('subjectId', 'name')
            .populate('gradeId', 'level label')
            .populate('teacherId', 'firstName lastName')
            .lean().exec();

        // Lightweight attachment counts so the UI can still render download buttons.
        const attCountMap = await this.getAttachmentCounts(filterCond);

        // Only need existence per assignment — exclude the heavy fileUrl base64.
        const submissions = await this.submissionModel.find({
            $or: [
                { studentId: sid },
                { studentId: studentId.toString() }
            ]
        }).select('assignmentId').lean().exec();
        const submissionMap = new Set(submissions.map((s: any) => s.assignmentId?._id?.toString() || s.assignmentId?.toString()));

        const now = new Date();
        const assignments = rawAssignments.map((a: any) => {
            const obj = { ...a };
            const hasSubmission = submissionMap.has(obj._id.toString());
            let isExpired = false;
            if (obj.dueDate) {
                const deadline = new Date(obj.dueDate);
                deadline.setHours(23, 59, 59, 999);
                isExpired = now > deadline;
            }
            obj.isExpired = isExpired;
            obj.canSubmit = !hasSubmission;
            obj.dueDateISO = obj.dueDate ? new Date(obj.dueDate).toISOString() : null;
            obj.attachmentCount = attCountMap.get(obj._id.toString()) || 0;

            // The UI only needs the number of questions to render the optic
            // sheet. Sending answerKey as well let a student read every correct
            // answer out of the network response before submitting — so it is
            // withheld until they have submitted and are reviewing their paper.
            obj.questionCount = Array.isArray(obj.answerKey) ? obj.answerKey.length : 0;
            if (!hasSubmission && Array.isArray(obj.answerKey)) {
                // Blanked rather than removed: a browser running an older build
                // sizes the optic sheet from answerKey.length, and dropping the
                // field made every paper render as 10 questions. Keeping the
                // length while clearing the letters satisfies both builds and
                // still tells the student nothing.
                obj.answerKey = obj.answerKey.map(() => '');
            }
            return obj;
        });

        this.logger.log(`getStudentAssignments: studentId=${studentId}, gradeOids=${gradeOids.length}, gradeLevels=[${gradeLevels}], assignments=${assignments.length}`);
        return this.sortAssignmentsActiveFirst(assignments);
    }

    async getMySubmissions(studentId: string) {
        const sid = Types.ObjectId.isValid(studentId) ? new Types.ObjectId(studentId) : studentId;
        const subs = await this.submissionModel.find({
            $or: [
                { studentId: sid },
                { studentId: studentId.toString() }
            ]
        })
            .populate('assignmentId', 'title gradeLevel maxScore subjectId')
            .sort({ submittedAt: -1 })
            .lean().exec();

        // Strip base64 file payloads (data: URIs can be MBs). Keep plain http links
        // inline; base64 files are fetched lazily via GET submissions/:id/file.
        return subs.map((s: any) => {
            const isData = typeof s.fileUrl === 'string' && s.fileUrl.startsWith('data:');
            const hasDataUrls = Array.isArray(s.fileUrls) && s.fileUrls.some((u: string) => typeof u === 'string' && u.startsWith('data:'));
            s.hasFile = !!s.fileUrl || (Array.isArray(s.fileUrls) && s.fileUrls.length > 0);
            if (isData) s.fileUrl = undefined;
            if (hasDataUrls) s.fileUrls = s.fileUrls.map((u: string) => (typeof u === 'string' && u.startsWith('data:')) ? undefined : u);
            return s;
        });
    }

    // Lazily fetch a single submission's file payload (owner only).
    async getSubmissionFile(studentId: string, submissionId: string) {
        if (!Types.ObjectId.isValid(submissionId)) throw new NotFoundException('Teslim bulunamadı');
        const sub = await this.submissionModel.findById(submissionId).select('studentId fileUrl fileUrls').lean().exec();
        if (!sub) throw new NotFoundException('Teslim bulunamadı');
        const owner = (sub as any).studentId?.toString();
        if (owner !== studentId.toString()) throw new ForbiddenException('Bu dosyaya erişim yetkiniz yok');
        return { fileUrl: (sub as any).fileUrl || null, fileUrls: (sub as any).fileUrls || [] };
    }

    /**
     * Lazily fetch a single assignment attachment by index. Students may only
     * reach attachments belonging to their own class — the id is guessable, so
     * without this check any student could pull another class's material.
     */
    async getAssignmentAttachment(assignmentId: string, index: number, user?: { userId: string; role?: string }) {
        if (!Types.ObjectId.isValid(assignmentId)) throw new NotFoundException('Ödev bulunamadı');
        const asg = await this.assignmentModel.findById(assignmentId).select('attachments gradeId gradeLevel subjectId teacherId').lean().exec();
        if (!asg) throw new NotFoundException('Ödev bulunamadı');

        const actor = await this.contentActor(user);
        if (actor.role === UserRole.STUDENT) await this.assertStudentContent(String(actor._id), asg);
        else if (actor.role === UserRole.TEACHER) {
            if (String((asg as any).teacherId) !== String(actor._id)) throw new ForbiddenException('Bu ödev için öğretmen yetkiniz yok.');
        } else if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role)) throw new ForbiddenException('Bu ödeve erişim yetkiniz yok.');

        const list = (asg as any).attachments || [];
        if (index < 0 || index >= list.length) throw new NotFoundException('Ek dosya bulunamadı');
        return { dataUri: list[index] };
    }

    // ─── STUDENT CONSOLIDATED ────────────────────────────
    async getStudentDashboard(studentId: string) {
        await this.contentRole(studentId, [UserRole.STUDENT]);
        const sid = Types.ObjectId.isValid(studentId) ? new Types.ObjectId(studentId) : studentId;
        const enrollments = await this.studentEnrollmentModel.find({
            $or: [
                { studentId: sid },
                { studentId: studentId.toString() }
            ]
        })
            .populate('gradeId', 'level label')
            .lean().exec();

        if (!enrollments.length) {
            return {
                enrolled: false, gradeLevels: [],
                courses: [], liveClasses: [], videos: [], assignments: [], submissions: [],
            };
        }

        const scope = await this.activeStudentScope(studentId);
        const gradeLevels = scope.levels;
        const gradeLabels = enrollments.filter((e: any) => scope.ids.includes(String(e.gradeId?._id || e.gradeId))).map((e: any) => e.gradeId?.label).filter(Boolean);
        const gradeOids = scope.ids.map(id => new Types.ObjectId(id));

        if (!gradeLevels.length && !gradeOids.length) {
            return {
                enrolled: true, gradeLevels: [], gradeLabels: [],
                courses: [], liveClasses: [], videos: [], assignments: [], submissions: [],
            };
        }

        const filterCond = await this.buildAssignmentScope(gradeOids, gradeLevels, scope.fallbackLevels);

        const assignmentFilter = filterCond;
        const courseSubjects = await this.permittedSubjects(gradeOids, gradeLevels, scope.fallbackLevels);

        const [courses, liveClasses, videos, rawAssignments, submissions] = await Promise.all([
            this.teacherAssignmentModel.find({ gradeId: { $in: gradeOids }, subjectId: { $in: courseSubjects.map(subject => subject._id) } })
                .populate('gradeId', 'level label')
                .populate('subjectId', 'name gradeLevel description +zoomUrl +zoomMeetingId +zoomPasscode')
                .populate('teacherId', 'firstName lastName email')
                .lean().exec(),
            this.liveClassModel.find(filterCond)
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ startTime: 1 })
                .lean().exec(),
            this.videoModel.find(filterCond)
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .lean().exec(),
            this.assignmentModel.find(assignmentFilter)
                .select('-attachments') // exclude multi-MB base64 from the dashboard payload
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ dueDate: 1 })
                .lean().exec(),
            this.submissionModel.find({
                $or: [
                    { studentId: sid },
                    { studentId: studentId.toString() }
                ]
            })
                .select('-fileUrl -fileUrls') // exclude base64 payloads from the dashboard
                .populate('assignmentId', 'title gradeLevel maxScore')
                .sort({ submittedAt: -1 })
                .lean().exec(),
        ]);

        const submissionMap = new Set(submissions.map((s: any) => s.assignmentId?._id?.toString() || s.assignmentId?.toString()));
        const now = new Date();
        const assignments = this.sortAssignmentsActiveFirst(rawAssignments.map((a: any) => {
            const obj = { ...a };
            const hasSubmission = submissionMap.has(obj._id.toString());
            let isExpired = false;
            if (obj.dueDate) {
                const deadline = new Date(obj.dueDate);
                deadline.setHours(23, 59, 59, 999);
                isExpired = now > deadline;
            }
            obj.isExpired = isExpired;
            obj.canSubmit = !hasSubmission;
            obj.dueDateISO = obj.dueDate ? new Date(obj.dueDate).toISOString() : null;
            // Same rule as getStudentAssignments: no answer key before submitting.
            obj.questionCount = Array.isArray(obj.answerKey) ? obj.answerKey.length : 0;
            if (!hasSubmission && Array.isArray(obj.answerKey)) {
                // Blanked rather than removed: a browser running an older build
                // sizes the optic sheet from answerKey.length, and dropping the
                // field made every paper render as 10 questions. Keeping the
                // length while clearing the letters satisfies both builds and
                // still tells the student nothing.
                obj.answerKey = obj.answerKey.map(() => '');
            }
            return obj;
        }));

        let parentInfo: any = null;
        const student = await this.userModel.findById(sid).populate('parentId', 'firstName lastName email').lean().exec();
        if (student && student.parentId) {
            parentInfo = student.parentId;
        }

        this.logger.log(`Dashboard for student ${studentId}: ${gradeLevels.length} gradeLevels=[${gradeLevels}], ${gradeOids.length} gradeOids, ${assignments.length} assignments, ${submissions.length} submissions`);

        return { enrolled: true, gradeLevels, gradeLabels, gradeLevel: gradeLevels[0], courses, liveClasses, videos, assignments, submissions, parent: parentInfo };
    }

    async getStudentCourses(studentId: string) {
        await this.contentRole(studentId, [UserRole.STUDENT]);
        const scope = await this.activeStudentScope(studentId);
        if (!scope.ids.length) return [];
        const gradeOids = scope.ids.map(id => new Types.ObjectId(id));
        const subjects = await this.permittedSubjects(gradeOids, scope.levels, scope.fallbackLevels);
        return this.teacherAssignmentModel.find({ gradeId: { $in: gradeOids }, subjectId: { $in: subjects.map(subject => subject._id) } })
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel description +zoomUrl +zoomMeetingId +zoomPasscode')
            .populate('teacherId', 'firstName lastName email')
            .exec();
    }

    // ─── TEACHER ASSIGNMENTS ────────────────────────────
    async createTeacherAssignment(data: any) {
        try {
            return await this.teacherAssignmentModel.create({
                gradeId: new Types.ObjectId(data.gradeId),
                subjectId: new Types.ObjectId(data.subjectId),
                teacherId: new Types.ObjectId(data.teacherId),
                notes: data.notes || '',
            });
        } catch (err: any) {
            if (err?.code === 11000) {
                throw new ConflictException('Bu öğretmen zaten bu sınıf ve derse atanmış.');
            }
            throw err;
        }
    }
    async getTeacherAssignments(query: any, userId: string) {
        await this.contentRole(userId, [UserRole.ADMIN, UserRole.SUPERADMIN]);
        const filter: any = {};
        if (query?.teacherId) filter.teacherId = new Types.ObjectId(query.teacherId);
        if (query?.gradeId) filter.gradeId = new Types.ObjectId(query.gradeId);
        if (query?.subjectId) filter.subjectId = new Types.ObjectId(query.subjectId);
        return this.teacherAssignmentModel.find(filter)
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel +zoomUrl +zoomMeetingId +zoomPasscode')
            .populate('teacherId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .exec();
    }
    async getMyAssignments(teacherId: string) {
        await this.contentRole(teacherId, [UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN]);
        return this.teacherAssignmentModel.find({ teacherId: new Types.ObjectId(teacherId) })
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel +zoomUrl +zoomMeetingId +zoomPasscode')
            .exec();
    }
    async deleteTeacherAssignment(id: string) {
        return this.teacherAssignmentModel.findByIdAndDelete(id).exec();
    }

    // ─── STUDENT ENROLLMENTS ────────────────────────────
    async createStudentEnrollment(data: any) {
        if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !['studentId', 'gradeId', 'parentId'].includes(key))) throw new BadRequestException('Geçersiz sınıf kayıt bilgileri.');
        if (typeof data.studentId !== 'string' || typeof data.gradeId !== 'string' || (data.parentId != null && typeof data.parentId !== 'string')) throw new BadRequestException('Geçerli öğrenci ve sınıf seçin.');
        const studentId = this.safeObjectId(data.studentId), gradeId = this.safeObjectId(data.gradeId);
        if (!studentId || !gradeId) throw new BadRequestException('Geçerli öğrenci ve sınıf seçin.');
        const [student, grade, current] = await Promise.all([
            this.userModel.findById(studentId).select('role isActive grade parentId').lean().exec(),
            this.gradeModel.findById(gradeId).lean().exec(),
            this.studentEnrollmentModel.find({ studentId }).populate('gradeId', 'level isActive').lean().exec(),
        ]);
        if (!student?.isActive || student.role !== UserRole.STUDENT || !grade?.isActive) throw new BadRequestException('Aktif öğrenci ve sınıf seçin.');
        if (!Number.isInteger(grade.level) || grade.level < 1 || grade.level > 12 || (student.grade != null && Number(student.grade) !== grade.level)
            || current.some(row => (row.gradeId as any)?.isActive && Number((row.gradeId as any).level) !== grade.level)) throw new BadRequestException('Öğrencinin profil sınıfı ve aktif sınıf kayıtları aynı seviyede olmalı.');
        if (data.parentId && (!Types.ObjectId.isValid(data.parentId) || String(student.parentId || '') !== data.parentId)) throw new BadRequestException('Veli bağlantısını önce Kullanıcılar ekranında doğrulayın.');
        try {
            // An explicit institution assignment may replace an expired purchase
            // restriction; its paid grant history remains intact for inspection.
            return await this.studentEnrollmentModel.findOneAndUpdate({ studentId, gradeId, accessSource: 'package' }, {
                $set: { accessSource: 'manual', enrollmentDate: new Date(), ...(student.parentId ? { parentId: student.parentId } : {}) },
            }, { upsert: true, new: true, runValidators: true }).exec();
        } catch (err: any) {
            if (err?.code === 11000) {
                throw new ConflictException('Bu öğrenci zaten bu sınıfa kayıtlı.');
            }
            throw err;
        }
    }
    async getStudentEnrollments(query?: any) {
        const filter: any = {};
        if (query?.gradeId) { const value = this.safeObjectId(query.gradeId); if (!value) throw new BadRequestException('Geçersiz sınıf.'); filter.gradeId = value; }
        if (query?.studentId) { const value = this.safeObjectId(query.studentId); if (!value) throw new BadRequestException('Geçersiz öğrenci.'); filter.studentId = value; }
        const rows = await this.studentEnrollmentModel.find(filter).setOptions({ includeExpiredEnrollments: true })
            .populate('studentId', 'firstName lastName email')
            .populate('gradeId', 'level label')
            .populate('parentId', 'firstName lastName email')
            .sort({ enrollmentDate: -1 })
            .lean()
            .exec();
        return rows.map(row => ({ ...row, ...enrollmentAccessState(row) }));
    }
    async getMyEnrollments(studentId: string) {
        return this.studentEnrollmentModel.find({ studentId: new Types.ObjectId(studentId) })
            .populate('gradeId', 'level label')
            .exec();
    }
    async deleteStudentEnrollment(id: string) {
        const recordId = this.safeObjectId(id);
        if (!recordId) throw new BadRequestException('Geçersiz sınıf kaydı.');
        // Compare and delete atomically: a concurrent payment must not lose a
        // newly assigned, paid class while an administrator removes old access.
        const removed = await this.studentEnrollmentModel.findOneAndDelete({ _id: recordId,
            packageGrants: { $not: { $elemMatch: activePackageGrant() } },
        }).exec();
        if (removed) return removed;
        const exists = await this.studentEnrollmentModel.exists({ _id: recordId }).setOptions({ includeExpiredEnrollments: true });
        if (exists) throw new ConflictException('Aktif satın alınmış ders hakkı silinemez. Sipariş yönetiminden inceleyin.');
        throw new NotFoundException('Sınıf kaydı bulunamadı.');
    }

    // ─── QUESTIONS ──────────────────────────────────────
    private safeObjectId(value: string): Types.ObjectId | null {
        try {
            if (!value || typeof value !== 'string' || value.length < 12) return null;
            return new Types.ObjectId(value);
        } catch {
            this.logger.warn(`Invalid ObjectId: ${value}`);
            return null;
        }
    }

    private questionFields(data: unknown) {
        return this.staffFields(data, ['text', 'options', 'optionImages', 'correctAnswer', 'difficulty', 'gradeLevel', 'subjectId', 'type', 'imageUrl', 'objective']);
    }

    async createQuestion(input: unknown, teacherId: string) {
        const actor = await this.educationStaff(teacherId);
        const data = this.questionFields(input);
        const { subjectId, gradeLevel } = await this.staffSubjectScope(actor, data.subjectId, data.gradeLevel);

        const questionData: any = {
            text: data.text || '',
            options: Array.isArray(data.options) ? data.options : [],
            optionImages: Array.isArray(data.optionImages) ? data.optionImages : [],
            correctAnswer: Number(data.correctAnswer) || 0,
            difficulty: data.difficulty || 'MEDIUM',
            gradeLevel,
            subjectId,
            teacherId: actor._id,
            type: data.type || 'TEST',
            imageUrl: data.imageUrl || '',
            objective: data.objective || '',
        };

        this.logger.log(`Creating question for teacher ${teacherId}, subject ${data.subjectId}`);

        try {
            const created = await this.questionModel.create(questionData);
            this.logger.log(`Question created: ${created._id}`);

            // Return populated version
            const populated = await this.questionModel.findById(created._id)
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .lean()
                .exec();

            return populated || created;
        } catch (error: any) {
            this.logger.error(`createQuestion FAILED: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getQuestions(query: any, userId: string) {
        const actor = await this.contentRole(userId, [UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN]);
        if (actor.role === UserRole.TEACHER) query = { ...query, teacherId: String(actor._id) };
        try {
            const filter: any = {
                // Sadece geçerli ObjectId'ye sahip dökümanları getir, 
                // aksi halde boş string ("") içeren bozuk kayıtlar populate() sırasında CastError verip 500'e sebep oluyor
                subjectId: { $type: "objectId" },
                teacherId: { $type: "objectId" }
            };

            if (query.teacherId) {
                const tid = this.safeObjectId(query.teacherId);
                if (tid) {
                    filter.teacherId = tid;
                } else {
                    this.logger.warn(`getQuestions: invalid teacherId: ${query.teacherId}`);
                    return [];
                }
            }
            if (query.gradeLevel) filter.gradeLevel = Number(query.gradeLevel);
            if (query.subjectId) {
                const sid = this.safeObjectId(query.subjectId);
                if (sid) filter.subjectId = sid;
            }
            if (query.difficulty) filter.difficulty = query.difficulty;

            this.logger.log(`getQuestions filter: ${JSON.stringify(filter)}`);

            const results = await this.questionModel.find(filter)
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .lean()
                .exec();

            this.logger.log(`getQuestions returned ${results.length} questions`);
            return results;
        } catch (error: any) {
            this.logger.error(`getQuestions ERROR: ${error.message}`, error.stack);
            return [];
        }
    }

    async updateQuestion(id: string, data: unknown, userId: string) {
        const actor = await this.educationStaff(userId);
        const filter = this.staffOwnership(actor, id);
        const fields = this.questionFields(data);
        const current = await this.questionModel.findOne(filter).select('subjectId gradeLevel').lean().exec();
        if (!current) throw new NotFoundException('Soru bulunamadı.');
        const { subjectId, gradeLevel } = await this.staffSubjectScope(actor, fields.subjectId ?? current.subjectId,
            fields.gradeLevel ?? (fields.subjectId === undefined ? current.gradeLevel : undefined));
        const updated = await this.questionModel.findOneAndUpdate(filter, { $set: { ...fields, subjectId, gradeLevel } }, { returnDocument: 'after', runValidators: true })
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .exec();
        if (!updated) throw new NotFoundException('Soru bulunamadı.');
        return updated;
    }
    async deleteQuestion(id: string, userId: string) {
        const actor = await this.educationStaff(userId);
        const removed = await this.questionModel.findOneAndDelete(this.staffOwnership(actor, id)).exec();
        if (!removed) throw new NotFoundException('Soru bulunamadı.');
        return removed;
    }

    // ─── SCHEDULES ──────────────────────────────────────
    async createSchedule(data: any) {
        return this.scheduleModel.create({
            gradeId: new Types.ObjectId(data.gradeId),
            subjectId: new Types.ObjectId(data.subjectId),
            teacherId: new Types.ObjectId(data.teacherId),
            dayOfWeek: data.dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            room: data.room || '',
            isActive: true,
        });
    }

    async getSchedules(query: any, userId: string) {
        await this.contentRole(userId, [UserRole.ADMIN, UserRole.SUPERADMIN]);
        const filter: any = {};
        if (query.gradeId) filter.gradeId = new Types.ObjectId(query.gradeId);
        if (query.teacherId) filter.teacherId = new Types.ObjectId(query.teacherId);
        if (query.dayOfWeek) filter.dayOfWeek = Number(query.dayOfWeek);
        // Default to active-only unless explicitly requested
        if (query.isActive !== undefined) {
            filter.isActive = query.isActive === 'true' || query.isActive === true;
        } else {
            filter.isActive = true;
        }
        return this.scheduleModel.find(filter)
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel +zoomUrl +zoomMeetingId +zoomPasscode')
            .populate('teacherId', 'firstName lastName email')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .exec();
    }

    async getTeacherSchedule(teacherId: string) {
        await this.contentRole(teacherId, [UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN]);
        return this.scheduleModel.find({ teacherId: new Types.ObjectId(teacherId), isActive: true })
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel +zoomUrl +zoomMeetingId +zoomPasscode')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .exec();
    }

    async getStudentSchedule(studentId: string) {
        await this.contentRole(studentId, [UserRole.STUDENT]);
        const scope = await this.activeStudentScope(studentId);
        if (!scope.ids.length) return [];
        const gradeOids = scope.ids.map(id => new Types.ObjectId(id));
        const subjects = await this.permittedSubjects(gradeOids, scope.levels, scope.fallbackLevels);
        return this.scheduleModel.find({ gradeId: { $in: gradeOids }, subjectId: { $in: subjects.map(subject => subject._id) }, isActive: true })
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel +zoomUrl +zoomMeetingId +zoomPasscode')
            .populate('teacherId', 'firstName lastName')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .exec();
    }

    async updateSchedule(id: string, data: any) {
        const update: any = {};
        if (data.subjectId) update.subjectId = new Types.ObjectId(data.subjectId);
        if (data.teacherId) update.teacherId = new Types.ObjectId(data.teacherId);
        if (data.dayOfWeek) update.dayOfWeek = data.dayOfWeek;
        if (data.startTime) update.startTime = data.startTime;
        if (data.endTime) update.endTime = data.endTime;
        if (data.room !== undefined) update.room = data.room;
        if (data.isActive !== undefined) update.isActive = data.isActive;
        return this.scheduleModel.findByIdAndUpdate(id, update, { new: true }).exec();
    }

    async deleteSchedule(id: string) {
        return this.scheduleModel.findByIdAndDelete(id).exec();
    }

    async getCalendarEvents(gradeLevel: number, startDate?: string, endDate?: string, user?: { userId: string; role?: string }) {
        const actor = await this.contentActor(user);
        let access: any = {};
        if (actor.role === UserRole.STUDENT || actor.role === UserRole.PARENT) {
            const studentIds = actor.role === UserRole.STUDENT ? [String(actor._id)] : (await this.userModel.find({ parentId: actor._id, role: UserRole.STUDENT, isActive: true }).select('_id').lean().exec()).map(student => String(student._id));
            const scopes = await Promise.all(studentIds.map(studentId => this.activeStudentScope(studentId)));
            const ids = scopes.flatMap(scope => scope.ids), levels = scopes.flatMap(scope => scope.levels);
            if (!ids.length) return { liveClasses: [], assignments: [] };
            access = await this.buildAssignmentScope(ids.map(id => new Types.ObjectId(id)), levels, scopes.flatMap(scope => scope.fallbackLevels));
        } else if (actor.role === UserRole.TEACHER) access = { teacherId: actor._id };
        else if (![UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role)) throw new ForbiddenException('Takvim içeriklerine erişim yetkiniz yok.');
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        if (Object.values(dateFilter).some((date: any) => !Number.isFinite(date.getTime()))) throw new BadRequestException('Geçerli takvim tarihleri girin.');
        const dateQuery = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

        const [liveClasses, assignments] = await Promise.all([
            this.liveClassModel.find({
                ...access,
                ...(Number.isInteger(gradeLevel) && gradeLevel >= 1 && gradeLevel <= 12 ? { gradeLevel } : {}),
                ...(dateQuery ? { startTime: dateQuery } : {}),
            })
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ startTime: 1 })
                .exec(),
            this.assignmentModel.find({
                ...access,
                ...(Number.isInteger(gradeLevel) && gradeLevel >= 1 && gradeLevel <= 12 ? { gradeLevel } : {}),
                ...(dateQuery ? { dueDate: dateQuery } : {}),
            })
                .select('-attachments -answerKey')
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ dueDate: 1 })
                .exec(),
        ]);

        return { liveClasses, assignments };
    }

    // ─── PARENT DASHBOARD ──────────────────────────────
    async getParentDashboard(parentId: string) {
        await this.contentRole(parentId, [UserRole.PARENT]);
        const pid = new Types.ObjectId(parentId);
        
        // Find students whose parentId matches
        const studentsWithParent = await this.userModel.find({ parentId: pid, role: UserRole.STUDENT, isActive: true }).select('firstName lastName email').exec();
        
        if (!studentsWithParent.length) {
            return { students: [] };
        }

        // For each student, find their enrollments and courses
        const students = await Promise.all(
            studentsWithParent.map(async (studentObj: any) => {
                const sid = studentObj._id;
                const enrollments = await this.studentEnrollmentModel.find({ studentId: sid })
                    .populate('gradeId', 'level label')
                    .exec();

                // If a student is not enrolled, we still return them but without courses
                if (!enrollments.length) {
                    return {
                        student: studentObj,
                        grade: null,
                        courses: [],
                        enrollmentDate: null,
                    };
                }

                // Assuming a student is usually enrolled in one grade for the dashboard view
                const enrollment = enrollments[0];
                const gradeOid = enrollment.gradeId?._id || enrollment.gradeId;

                // Scope assignments the same way the student's own views do, so a
                // parent never sees a parallel branch's work (gradeId, not gradeLevel).
                const scope = await this.activeStudentScope(String(sid));
                const gradeOids = scope.ids.map(id => new Types.ObjectId(id));
                const gradeLevels = scope.levels;
                const assignmentScope = await this.buildAssignmentScope(gradeOids, gradeLevels, scope.fallbackLevels);
                const courseSubjects = await this.permittedSubjects(gradeOids, gradeLevels, scope.fallbackLevels);

                const [courses, assignments, submissions] = await Promise.all([
                    this.teacherAssignmentModel.find({ gradeId: { $in: gradeOids }, subjectId: { $in: courseSubjects.map(subject => subject._id) } })
                        .populate('gradeId', 'level label')
                        .populate('subjectId', 'name gradeLevel +zoomUrl +zoomMeetingId +zoomPasscode')
                        .populate('teacherId', 'firstName lastName email')
                        .exec(),
                    // Attachments are multi-MB base64 blobs — never pull them into a list.
                    // No .sort() here on purpose: Mongo sorts before applying the
                    // projection, so a server-side sort would load the full
                    // documents and blow the 32MB in-memory sort limit. Ordering
                    // happens in JS below, the same way getStudentAssignments does it.
                    this.assignmentModel.find(assignmentScope)
                        .select('-attachments')
                        .populate('subjectId', 'name')
                        .lean().exec(),
                    this.submissionModel.find({ $or: [{ studentId: sid }, { studentId: sid.toString() }] })
                        .select('assignmentId grade feedback isLate submittedAt opticResult')
                        .lean().exec(),
                ]);

                const subByAssignment = new Map(
                    submissions.map((s: any) => [s.assignmentId?.toString(), s]),
                );

                const now = Date.now();
                const items = assignments.sort((a: any, b: any) => {
                    const av = new Date(a.dueDate || a.createdAt || 0).getTime();
                    const bv = new Date(b.dueDate || b.createdAt || 0).getTime();
                    return bv - av;
                }).map((a: any) => {
                    const sub = subByAssignment.get(a._id.toString()) || null;
                    const deadline = a.dueDate ? new Date(a.dueDate).setHours(23, 59, 59, 999) : null;
                    return {
                        _id: a._id,
                        title: a.title,
                        subject: a.subjectId?.name || null,
                        dueDate: a.dueDate || null,
                        maxScore: a.maxScore ?? null,
                        isExpired: deadline ? now > deadline : false,
                        submitted: !!sub,
                        submittedAt: sub?.submittedAt || null,
                        isLate: sub?.isLate ?? false,
                        grade: sub?.grade ?? null,
                        feedback: sub?.feedback || null,
                        opticResult: sub?.opticResult || null,
                    };
                });

                const graded = items.filter((i) => typeof i.grade === 'number');
                const optics = items.filter((i) => i.opticResult);
                const opticTotals = optics.reduce(
                    (acc, i: any) => ({
                        correct: acc.correct + (i.opticResult.correct || 0),
                        incorrect: acc.incorrect + (i.opticResult.incorrect || 0),
                        empty: acc.empty + (i.opticResult.empty || 0),
                    }),
                    { correct: 0, incorrect: 0, empty: 0 },
                );

                return {
                    student: studentObj,
                    grade: enrollment.gradeId,
                    courses,
                    enrollmentDate: enrollment.enrollmentDate,
                    assignments: items,
                    summary: {
                        totalAssignments: items.length,
                        submitted: items.filter((i) => i.submitted).length,
                        pending: items.filter((i) => !i.submitted && !i.isExpired).length,
                        missed: items.filter((i) => !i.submitted && i.isExpired).length,
                        late: items.filter((i) => i.isLate).length,
                        averageGrade: graded.length
                            ? Math.round(graded.reduce((s, i: any) => s + i.grade, 0) / graded.length)
                            : null,
                        examCount: optics.length,
                        opticTotals,
                        netAverage: optics.length
                            ? Number(((opticTotals.correct - opticTotals.incorrect / 4) / optics.length).toFixed(2))
                            : null,
                    },
                };
            }),
        );

        return { students };
    }

    // ─── TESTS (Sınav/Test Oluşturma) ───────────────────────
    private testFields(data: unknown) {
        return this.staffFields(data, ['title', 'description', 'gradeLevel', 'subjectId', 'duration', 'questionIds', 'isActive']);
    }

    private async testQuestions(actor: { _id: Types.ObjectId; role: string }, value: unknown, subjectId: Types.ObjectId, gradeLevel: number) {
        if (!Array.isArray(value) || value.length > 200) throw new BadRequestException('Geçerli test soruları seçin.');
        const ids = value.map(id => this.contentId(id));
        if (new Set(ids.map(String)).size !== ids.length) throw new BadRequestException('Aynı soruyu birden fazla seçmeyin.');
        if (!ids.length) return ids;
        const questions = await this.questionModel.find({ _id: { $in: ids }, ...(actor.role === UserRole.TEACHER ? { teacherId: actor._id, subjectId, gradeLevel } : {}) })
            .select('_id').lean().exec();
        if (questions.length !== ids.length) throw new ForbiddenException('Testte yalnızca yetkiniz olan soruları kullanabilirsiniz.');
        return ids;
    }

    async createTest(input: unknown, teacherId: string) {
        const actor = await this.educationStaff(teacherId);
        const data = this.testFields(input);
        const { subjectId, gradeLevel } = await this.staffSubjectScope(actor, data.subjectId, data.gradeLevel);
        const questionIds = await this.testQuestions(actor, data.questionIds ?? [], subjectId, gradeLevel);

        const testData = {
            title: data.title || '',
            description: data.description || '',
            teacherId: actor._id,
            subjectId,
            questionIds,
            gradeLevel,
            duration: Number(data.duration) || 0,
            ...(data.isActive === undefined ? {} : { isActive: data.isActive }),
        };

        try {
            this.logger.log(`Creating test "${data.title}" for teacher ${teacherId} with ${questionIds.length} questions`);
            const created = await this.testModel.create(testData);
            this.logger.log(`Test created: ${created._id}`);

            const populated = await this.testModel.findById(created._id)
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .populate({ path: 'questionIds', ...(actor.role === UserRole.TEACHER ? { match: { teacherId: actor._id } } : {}) })
                .lean()
                .exec();

            return populated || created;
        } catch (error: any) {
            this.logger.error(`createTest FAILED: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getTests(query: any, user?: { userId: string; role?: string }) {
        const actor = await this.contentActor(user);
        if (actor.role === UserRole.STUDENT) return this.getStudentAvailableTests(String(actor._id));
        if (![UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role)) throw new ForbiddenException('Testlere erişim yetkiniz yok.');
        if (actor.role === UserRole.TEACHER) query = { ...query, teacherId: String(actor._id) };
        try {
            const filter: any = {
                // Sadece geçerli ObjectId'ye sahip dökümanları getir
                subjectId: { $type: "objectId" },
                teacherId: { $type: "objectId" }
            };
            if (query.teacherId) {
                const tid = this.safeObjectId(query.teacherId);
                if (tid) filter.teacherId = tid;
                else {
                    this.logger.warn(`getTests: invalid teacherId: ${query.teacherId}`);
                    return [];
                }
            }
            if (query.gradeLevel) filter.gradeLevel = Number(query.gradeLevel);
            if (query.subjectId) {
                const sid = this.safeObjectId(query.subjectId);
                if (sid) filter.subjectId = sid;
            }

            this.logger.log(`getTests filter: ${JSON.stringify(filter)}`);

            const results = await this.testModel.find(filter)
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .populate({ path: 'questionIds', ...(actor.role === UserRole.TEACHER ? { match: { teacherId: actor._id } } : {}) })
                .sort({ createdAt: -1 })
                .lean()
                .exec();

            this.logger.log(`getTests returned ${results.length} tests`);
            return results;
        } catch (error: any) {
            this.logger.error(`getTests ERROR: ${error.message}`, error.stack);
            return [];
        }
    }

    async getTestById(id: string, user?: { userId: string; role?: string }) {
        const { actor, test } = await this.authorizedTest(id, user);
        if (actor.role !== UserRole.STUDENT) return test;
        const visible = typeof test.toObject === 'function' ? test.toObject() : { ...test };
        visible.questionIds = (visible.questionIds || []).map((question: any) => {
            const value = typeof question?.toObject === 'function' ? question.toObject() : { ...question };
            delete value.correctAnswer; delete value.answerKey;
            return value;
        });
        return visible;
    }

    async updateTest(id: string, data: unknown, userId: string) {
        const actor = await this.educationStaff(userId);
        const filter = this.staffOwnership(actor, id);
        const fields = this.testFields(data);
        const current = await this.testModel.findOne(filter).select('subjectId gradeLevel questionIds').lean().exec();
        if (!current) throw new NotFoundException('Test bulunamadı.');
        const { subjectId, gradeLevel } = await this.staffSubjectScope(actor, fields.subjectId ?? current.subjectId,
            fields.gradeLevel ?? (fields.subjectId === undefined ? current.gradeLevel : undefined));
        const questionIds = await this.testQuestions(actor, fields.questionIds === undefined ? current.questionIds : fields.questionIds, subjectId, gradeLevel);
        const updated = await this.testModel.findOneAndUpdate(filter, { $set: { ...fields, subjectId, gradeLevel, questionIds } }, { returnDocument: 'after', runValidators: true })
            .populate({ path: 'questionIds', ...(actor.role === UserRole.TEACHER ? { match: { teacherId: actor._id } } : {}) })
            .exec();
        if (!updated) throw new NotFoundException('Test bulunamadı.');
        return updated;
    }

    async deleteTest(id: string, userId: string) {
        const actor = await this.educationStaff(userId);
        const removed = await this.testModel.findOneAndDelete(this.staffOwnership(actor, id)).exec();
        if (!removed) throw new NotFoundException('Test bulunamadı.');
        return removed;
    }

    async submitTest(testId: string, studentId: string, answers: Record<string, number>, durationSeconds: number) {
        const { actor, test } = await this.authorizedTest(testId, { userId: studentId });
        if (actor.role !== UserRole.STUDENT) throw new ForbiddenException('Test teslimi için öğrenci hesabı gerekir.');
        if (!answers || typeof answers !== 'object' || Array.isArray(answers) || !Number.isFinite(durationSeconds) || durationSeconds < 0) throw new BadRequestException('Geçerli test cevapları ve süre bilgisi girin.');

        const sid = new Types.ObjectId(studentId);
        const questions = test.questionIds || [];
        let correctCount = 0;
        let wrongCount = 0;
        let emptyCount = 0;

        const answersMap = new Map<string, number>();

        questions.forEach((q: any) => {
            const questionIdStr = q._id.toString();
            const studentAnswer = answers[questionIdStr];

            if (studentAnswer === undefined || studentAnswer === null || studentAnswer === -1) {
                emptyCount++;
                answersMap.set(questionIdStr, -1);
            } else {
                answersMap.set(questionIdStr, Number(studentAnswer));
                if (Number(studentAnswer) === q.correctAnswer) {
                    correctCount++;
                } else {
                    wrongCount++;
                }
            }
        });

        const totalQuestions = questions.length;
        const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

        // Once a result is submitted the review endpoint reveals answer keys.
        // Never replace the saved attempt after those keys become available.
        const now = new Date();
        const saved = await this.testResultModel.findOneAndUpdate({ testId: test._id, studentId: sid }, {
            $setOnInsert: {
                answers: answersMap,
                score,
                correctCount,
                wrongCount,
                emptyCount,
                durationSeconds,
                createdAt: now,
                updatedAt: now,
            },
        }, { upsert: true, returnDocument: 'after', includeResultMetadata: true, timestamps: false, runValidators: true }).exec();
        if (saved.lastErrorObject?.updatedExisting || !saved.value) throw new ConflictException('Bu test daha önce teslim edilmiş.');
        const result = saved.value;

        return result;
    }

    async getStudentAvailableTests(studentId: string) {
        const actor = await this.contentActor({ userId: studentId });
        if (actor.role !== UserRole.STUDENT) throw new ForbiddenException('Öğrenci hesabıyla giriş yapın.');
        const sid = new Types.ObjectId(studentId);
        const scope = await this.activeStudentScope(studentId);
        if (!scope.ids.length) return [];
        const subjects: any[] = await this.permittedSubjects(scope.ids.map(id => new Types.ObjectId(id)), scope.levels, scope.fallbackLevels);
        if (!subjects.length) return [];
        const tests = await this.testModel.find({ gradeLevel: { $in: scope.levels }, subjectId: { $in: subjects.map(subject => subject._id) }, isActive: true })
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        const results = await this.testResultModel.find({ studentId: sid }).exec();

        return tests.map(test => {
            const testResult = results.find(r => r.testId.toString() === test._id.toString());
            return {
                ...test,
                solved: !!testResult,
                score: testResult ? testResult.score : null,
                correctCount: testResult ? testResult.correctCount : null,
                wrongCount: testResult ? testResult.wrongCount : null,
                emptyCount: testResult ? testResult.emptyCount : null,
                durationSeconds: testResult ? testResult.durationSeconds : null,
                resultId: testResult ? testResult._id : null,
            };
        });
    }

    async getTestResultForStudent(testId: string, studentId: string, user?: { userId: string; role?: string }) {
        const { actor, test } = await this.authorizedTest(testId, user);
        if (actor.role === UserRole.STUDENT) {
            if (studentId && studentId !== String(actor._id)) throw new ForbiddenException('Yalnızca kendi test sonucunuzu görebilirsiniz.');
            studentId = String(actor._id);
        }
        if (!Types.ObjectId.isValid(studentId)) throw new BadRequestException('Geçerli bir öğrenci seçin.');
        const sid = new Types.ObjectId(studentId);
        const result = await this.testResultModel.findOne({ testId: new Types.ObjectId(testId), studentId: sid }).exec();
        if (!result) {
            throw new BadRequestException('Sınav sonucu bulunamadı.');
        }

        return {
            result,
            test,
        };
    }

    async getTestResultsForTeacher(testId: string, user?: { userId: string; role?: string }) {
        const actor = await this.contentActor(user);
        if (![UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN].includes(actor.role)) throw new ForbiddenException('Test sonuçlarına erişim yetkiniz yok.');
        await this.authorizedTest(testId, user);
        return this.testResultModel.find({ testId: new Types.ObjectId(testId) })
            .populate('studentId', 'firstName lastName email')
            .sort({ score: -1, createdAt: -1 })
            .exec();
    }
}
