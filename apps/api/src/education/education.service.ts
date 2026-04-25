import { Injectable, ConflictException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Grade, GradeDocument } from './schemas/grade.schema';
import { Subject, SubjectDocument } from './schemas/subject.schema';
import { Unit, UnitDocument } from './schemas/unit.schema';
import { Topic, TopicDocument } from './schemas/topic.schema';
import { LiveClass, LiveClassDocument } from './schemas/live-class.schema';
import { Video, VideoDocument } from './schemas/video.schema';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';
import { Submission, SubmissionDocument } from './schemas/submission.schema';
import { TeacherAssignment, TeacherAssignmentDocument } from './schemas/teacher-assignment.schema';
import { StudentEnrollment, StudentEnrollmentDocument } from './schemas/student-enrollment.schema';
import { Question, QuestionDocument } from './schemas/question.schema';
import { Schedule, ScheduleDocument } from './schemas/schedule.schema';
import { Test, TestDocument } from './schemas/test.schema';
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
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

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
        return this.gradeModel.findByIdAndDelete(id).exec();
    }

    // ─── SUBJECTS ───────────────────────────────────────
    async createSubject(createSubjectDto: any) {
        return this.subjectModel.create(createSubjectDto);
    }
    async getSubjects(gradeLevel: number) {
        if (gradeLevel) {
            return this.subjectModel.find({ gradeLevel }).exec();
        }
        return this.subjectModel.find().exec();
    }
    async getAllSubjects() {
        return this.subjectModel.find().exec();
    }
    async getSubjectsByIds(ids: string[]) {
        return this.subjectModel.find({ _id: { $in: ids.map(id => new Types.ObjectId(id)) } }).exec();
    }
    async updateSubject(id: string, data: any) {
        return this.subjectModel.findByIdAndUpdate(id, data, { new: true }).exec();
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
    async createLiveClass(data: any, teacherId: string) {
        return this.liveClassModel.create({ ...data, teacherId: new Types.ObjectId(teacherId) });
    }
    async getTeacherLiveClasses(teacherId: string) {
        return this.liveClassModel.find({ teacherId: new Types.ObjectId(teacherId) })
            .populate('subjectId', 'name')
            .sort({ startTime: 1 })
            .exec();
    }
    async getAllLiveClasses() {
        return this.liveClassModel.find({})
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .sort({ startTime: -1 })
            .exec();
    }
    async getStudentLiveClasses(gradeLevel: number) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        return this.liveClassModel.find({
            gradeLevel,
            startTime: { $gte: twoHoursAgo },
        })
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .sort({ startTime: 1 })
            .exec();
    }
    async deleteLiveClass(id: string) {
        return this.liveClassModel.findByIdAndDelete(id).exec();
    }

    // ─── VIDEOS ─────────────────────────────────────────
    async createVideo(data: any, teacherId: string) {
        return this.videoModel.create({ ...data, teacherId: new Types.ObjectId(teacherId) });
    }
    async getVideos(query: any) {
        const filter: any = {};
        if (query.gradeLevel) filter.gradeLevel = Number(query.gradeLevel);
        if (query.subjectId) filter.subjectId = new Types.ObjectId(query.subjectId);
        if (query.teacherId) filter.teacherId = new Types.ObjectId(query.teacherId);
        if (query.topicId) filter.topicId = new Types.ObjectId(query.topicId);
        return this.videoModel.find(filter)
            .populate('subjectId', 'name')
            .populate('topicId', 'name')
            .populate('teacherId', 'firstName lastName')
            .sort({ createdAt: -1 })
            .exec();
    }
    async updateVideo(id: string, data: any) {
        const update: any = {};
        if (data.title !== undefined) update.title = data.title;
        if (data.description !== undefined) update.description = data.description;
        if (data.videoUrl !== undefined) {
            const url = (data.videoUrl || '').trim();
            if (!url) {
                throw new BadRequestException('Video URL boş olamaz.');
            }
            // Normalize: add https:// if no protocol
            update.videoUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        }
        if (data.durationMinutes !== undefined) update.durationMinutes = data.durationMinutes;
        return this.videoModel.findByIdAndUpdate(id, update, { new: true })
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .exec();
    }
    async deleteVideo(id: string) {
        return this.videoModel.findByIdAndDelete(id).exec();
    }

    // ─── ASSIGNMENTS ────────────────────────────────────
    async createAssignment(data: any, teacherId: string) {
        return this.assignmentModel.create({ ...data, teacherId: new Types.ObjectId(teacherId) });
    }
    async getAssignments(query: any) {
        const filter: any = {};
        if (query.gradeLevel) filter.gradeLevel = Number(query.gradeLevel);
        if (query.subjectId) filter.subjectId = new Types.ObjectId(query.subjectId);
        if (query.teacherId) filter.teacherId = new Types.ObjectId(query.teacherId);
        return this.assignmentModel.find(filter)
            .populate('subjectId', 'name')
            .sort({ dueDate: 1 })
            .exec();
    }
    async updateAssignment(id: string, data: any) {
        const update: any = {};
        if (data.title !== undefined) update.title = data.title;
        if (data.description !== undefined) update.description = data.description;
        if (data.dueDate !== undefined) update.dueDate = new Date(data.dueDate);
        if (data.instructions !== undefined) update.instructions = data.instructions;
        if (data.maxScore !== undefined) update.maxScore = data.maxScore;
        return this.assignmentModel.findByIdAndUpdate(id, update, { new: true })
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .exec();
    }
    async deleteAssignment(id: string) {
        return this.assignmentModel.findByIdAndDelete(id).exec();
    }
    async submitAssignment(data: any) {
        // Check deadline and mark late submissions
        const assignment = await this.assignmentModel.findById(data.assignmentId).exec();
        let isLate = false;
        if (assignment?.dueDate) {
            // Set deadline to end of day (23:59:59.999) to avoid timezone issues
            const deadline = new Date(assignment.dueDate);
            deadline.setHours(23, 59, 59, 999);
            isLate = new Date() > deadline;
        }

        return this.submissionModel.findOneAndUpdate(
            { assignmentId: new Types.ObjectId(data.assignmentId), studentId: new Types.ObjectId(data.studentId) },
            { ...data, submittedAt: new Date(), isLate },
            { new: true, upsert: true }
        );
    }
    async getSubmissions(assignmentId: string) {
        return this.submissionModel.find({ assignmentId: new Types.ObjectId(assignmentId) })
            .populate('studentId', 'firstName lastName')
            .exec();
    }
    async gradeSubmission(id: string, grade: number, feedback: string) {
        return this.submissionModel.findByIdAndUpdate(id, { grade, feedback }, { new: true });
    }

    async getStudentAssignments(studentId: string) {
        const enrollments = await this.studentEnrollmentModel.find({ studentId: new Types.ObjectId(studentId) })
            .populate('gradeId', 'level label')
            .exec();
        if (!enrollments.length) return [];
        const gradeLevels = enrollments.map((e: any) => (e.gradeId as any)?.level).filter(Boolean);
        if (!gradeLevels.length) return [];
        return this.assignmentModel.find({ gradeLevel: { $in: gradeLevels } })
            .populate('subjectId', 'name')
            .sort({ dueDate: 1 })
            .exec();
    }

    async getMySubmissions(studentId: string) {
        return this.submissionModel.find({ studentId: new Types.ObjectId(studentId) })
            .populate('assignmentId', 'title gradeLevel maxScore subjectId')
            .sort({ submittedAt: -1 })
            .exec();
    }

    // ─── STUDENT CONSOLIDATED ────────────────────────────
    async getStudentDashboard(studentId: string) {
        const sid = new Types.ObjectId(studentId);
        const enrollments = await this.studentEnrollmentModel.find({ studentId: sid })
            .populate('gradeId', 'level label')
            .exec();

        if (!enrollments.length) {
            return {
                enrolled: false, gradeLevels: [],
                courses: [], liveClasses: [], videos: [], assignments: [], submissions: [],
            };
        }

        const gradeLevels = enrollments.map((e: any) => (e.gradeId as any)?.level).filter(Boolean);
        const gradeLabels = enrollments.map((e: any) => (e.gradeId as any)?.label).filter(Boolean);
        const gradeOids = enrollments.map((e: any) => (e.gradeId as any)?._id || e.gradeId).filter(Boolean);

        if (!gradeLevels.length) {
            return {
                enrolled: true, gradeLevels: [], gradeLabels: [],
                courses: [], liveClasses: [], videos: [], assignments: [], submissions: [],
            };
        }

        const [courses, liveClasses, videos, rawAssignments, submissions] = await Promise.all([
            // Courses = teacher assignments for all enrolled grades
            this.teacherAssignmentModel.find({ gradeId: { $in: gradeOids } })
                .populate('gradeId', 'level label')
                .populate('subjectId', 'name gradeLevel description zoomUrl zoomMeetingId zoomPasscode')
                .populate('teacherId', 'firstName lastName email')
                .exec(),
            // Live classes for all enrolled grades
            this.liveClassModel.find({ gradeLevel: { $in: gradeLevels } })
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ startTime: 1 })
                .exec(),
            // Videos for all enrolled grades
            this.videoModel.find({ gradeLevel: { $in: gradeLevels } })
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .exec(),
            // Assignments for all enrolled grades
            this.assignmentModel.find({ gradeLevel: { $in: gradeLevels } })
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ dueDate: 1 })
                .exec(),
            // This student's submissions
            this.submissionModel.find({ studentId: sid })
                .populate('assignmentId', 'title gradeLevel maxScore')
                .sort({ submittedAt: -1 })
                .exec(),
        ]);

        // Enrich assignments with server-computed isExpired / canSubmit flags
        const now = new Date();
        const submissionMap = new Map<string, any>();
        submissions.forEach((s: any) => {
            const aId = s.assignmentId?._id?.toString() || s.assignmentId?.toString();
            if (aId) submissionMap.set(aId, s);
        });

        const assignments = rawAssignments.map((a: any) => {
            const obj = a.toObject ? a.toObject() : { ...a };
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
            return obj;
        });

        // Fetch parent info if exists
        let parentInfo = null;
        const student = await this.userModel.findById(sid).populate('parentId', 'firstName lastName email').exec();
        if (student && student.parentId) {
            parentInfo = student.parentId;
        }

        return { enrolled: true, gradeLevels, gradeLabels, gradeLevel: gradeLevels[0], courses, liveClasses, videos, assignments, submissions, parent: parentInfo };
    }

    async getStudentCourses(studentId: string) {
        const sid = new Types.ObjectId(studentId);
        const enrollments = await this.studentEnrollmentModel.find({ studentId: sid })
            .populate('gradeId', 'level label')
            .exec();
        if (!enrollments.length) return [];
        const gradeOids = enrollments.map((e: any) => (e.gradeId as any)?._id || e.gradeId).filter(Boolean);
        return this.teacherAssignmentModel.find({ gradeId: { $in: gradeOids } })
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel description zoomUrl zoomMeetingId zoomPasscode')
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
    async getTeacherAssignments(query?: any) {
        const filter: any = {};
        if (query?.teacherId) filter.teacherId = new Types.ObjectId(query.teacherId);
        if (query?.gradeId) filter.gradeId = new Types.ObjectId(query.gradeId);
        if (query?.subjectId) filter.subjectId = new Types.ObjectId(query.subjectId);
        return this.teacherAssignmentModel.find(filter)
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel zoomUrl zoomMeetingId zoomPasscode')
            .populate('teacherId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .exec();
    }
    async getMyAssignments(teacherId: string) {
        return this.teacherAssignmentModel.find({ teacherId: new Types.ObjectId(teacherId) })
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel zoomUrl zoomMeetingId zoomPasscode')
            .exec();
    }
    async deleteTeacherAssignment(id: string) {
        return this.teacherAssignmentModel.findByIdAndDelete(id).exec();
    }

    // ─── STUDENT ENROLLMENTS ────────────────────────────
    async createStudentEnrollment(data: any) {
        try {
            return await this.studentEnrollmentModel.create({
                studentId: new Types.ObjectId(data.studentId),
                gradeId: new Types.ObjectId(data.gradeId),
                parentId: data.parentId ? new Types.ObjectId(data.parentId) : undefined,
                enrollmentDate: new Date(),
            });
        } catch (err: any) {
            if (err?.code === 11000) {
                throw new ConflictException('Bu öğrenci zaten bu sınıfa kayıtlı.');
            }
            throw err;
        }
    }
    async getStudentEnrollments(query?: any) {
        const filter: any = {};
        if (query?.gradeId) filter.gradeId = new Types.ObjectId(query.gradeId);
        if (query?.studentId) filter.studentId = new Types.ObjectId(query.studentId);
        return this.studentEnrollmentModel.find(filter)
            .populate('studentId', 'firstName lastName email')
            .populate('gradeId', 'level label')
            .populate('parentId', 'firstName lastName email')
            .sort({ enrollmentDate: -1 })
            .exec();
    }
    async getMyEnrollments(studentId: string) {
        return this.studentEnrollmentModel.find({ studentId: new Types.ObjectId(studentId) })
            .populate('gradeId', 'level label')
            .exec();
    }
    async deleteStudentEnrollment(id: string) {
        return this.studentEnrollmentModel.findByIdAndDelete(id).exec();
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

    async createQuestion(data: any, teacherId: string) {
        const tid = this.safeObjectId(teacherId);
        if (!tid) throw new BadRequestException('Geçersiz öğretmen ID.');

        const sid = this.safeObjectId(data.subjectId);
        if (!sid) throw new BadRequestException('Geçersiz ders ID.');

        const questionData: any = {
            text: data.text || '',
            options: Array.isArray(data.options) ? data.options : [],
            optionImages: Array.isArray(data.optionImages) ? data.optionImages : [],
            correctAnswer: Number(data.correctAnswer) || 0,
            difficulty: data.difficulty || 'MEDIUM',
            gradeLevel: Number(data.gradeLevel) || 8,
            subjectId: sid,
            teacherId: tid,
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

    async getQuestions(query: any) {
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

    async updateQuestion(id: string, data: any) {
        return this.questionModel.findByIdAndUpdate(id, data, { new: true })
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .exec();
    }
    async deleteQuestion(id: string) {
        return this.questionModel.findByIdAndDelete(id).exec();
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

    async getSchedules(query: any) {
        const filter: any = {};
        if (query.gradeId) filter.gradeId = new Types.ObjectId(query.gradeId);
        if (query.teacherId) filter.teacherId = new Types.ObjectId(query.teacherId);
        if (query.dayOfWeek) filter.dayOfWeek = Number(query.dayOfWeek);
        return this.scheduleModel.find(filter)
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel')
            .populate('teacherId', 'firstName lastName email')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .exec();
    }

    async getTeacherSchedule(teacherId: string) {
        return this.scheduleModel.find({ teacherId: new Types.ObjectId(teacherId), isActive: true })
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .exec();
    }

    async getStudentSchedule(studentId: string) {
        const enrollments = await this.studentEnrollmentModel.find({ studentId: new Types.ObjectId(studentId) })
            .populate('gradeId', 'level label')
            .exec();
        if (!enrollments.length) return [];
        const gradeOids = enrollments.map((e: any) => (e.gradeId as any)?._id || e.gradeId).filter(Boolean);
        return this.scheduleModel.find({ gradeId: { $in: gradeOids }, isActive: true })
            .populate('gradeId', 'level label')
            .populate('subjectId', 'name gradeLevel')
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

    async getCalendarEvents(gradeLevel: number, startDate?: string, endDate?: string) {
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        const dateQuery = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

        const [liveClasses, assignments] = await Promise.all([
            this.liveClassModel.find({
                gradeLevel,
                ...(dateQuery ? { startTime: dateQuery } : {}),
            })
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ startTime: 1 })
                .exec(),
            this.assignmentModel.find({
                gradeLevel,
                ...(dateQuery ? { dueDate: dateQuery } : {}),
            })
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ dueDate: 1 })
                .exec(),
        ]);

        return { liveClasses, assignments };
    }

    // ─── PARENT DASHBOARD ──────────────────────────────
    async getParentDashboard(parentId: string) {
        const pid = new Types.ObjectId(parentId);
        
        // Find students whose parentId matches
        const studentsWithParent = await this.userModel.find({ parentId: pid }).select('firstName lastName email').exec();
        
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
                const courses = await this.teacherAssignmentModel.find({ gradeId: gradeOid })
                    .populate('gradeId', 'level label')
                    .populate('subjectId', 'name gradeLevel zoomUrl zoomMeetingId zoomPasscode')
                    .populate('teacherId', 'firstName lastName email')
                    .exec();

                return {
                    student: studentObj,
                    grade: enrollment.gradeId,
                    courses,
                    enrollmentDate: enrollment.enrollmentDate,
                };
            }),
        );

        return { students };
    }

    // ─── TESTS (Sınav/Test Oluşturma) ───────────────────────
    async createTest(data: any, teacherId: string) {
        const tid = this.safeObjectId(teacherId);
        if (!tid) throw new BadRequestException('Geçersiz öğretmen ID.');

        const sid = this.safeObjectId(data.subjectId);
        if (!sid) throw new BadRequestException('Geçersiz ders ID.');

        const questionIds = (data.questionIds || []).map((qid: string) => {
            const oid = this.safeObjectId(qid);
            if (!oid) this.logger.warn(`createTest: skipping invalid questionId: ${qid}`);
            return oid;
        }).filter(Boolean);

        const testData = {
            title: data.title || '',
            description: data.description || '',
            teacherId: tid,
            subjectId: sid,
            questionIds,
            gradeLevel: Number(data.gradeLevel) || 8,
            duration: Number(data.duration) || 0,
        };

        try {
            this.logger.log(`Creating test "${data.title}" for teacher ${teacherId} with ${questionIds.length} questions`);
            const created = await this.testModel.create(testData);
            this.logger.log(`Test created: ${created._id}`);

            const populated = await this.testModel.findById(created._id)
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .populate('questionIds')
                .lean()
                .exec();

            return populated || created;
        } catch (error: any) {
            this.logger.error(`createTest FAILED: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getTests(query: any) {
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
                .populate('questionIds')
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

    async getTestById(id: string) {
        return this.testModel.findById(id)
            .populate('subjectId', 'name')
            .populate('teacherId', 'firstName lastName')
            .populate('questionIds')
            .exec();
    }

    async updateTest(id: string, data: any) {
        return this.testModel.findByIdAndUpdate(id, data, { new: true })
            .populate('questionIds')
            .exec();
    }

    async deleteTest(id: string) {
        return this.testModel.findByIdAndDelete(id).exec();
    }
}
