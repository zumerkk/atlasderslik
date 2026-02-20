import { Injectable } from '@nestjs/common';
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

@Injectable()
export class EducationService {
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
    ) { }

    // ─── GRADES ─────────────────────────────────────────
    async createGrade(level: number) {
        return this.gradeModel.create({ level });
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
                throw new Error('Video URL boş olamaz.');
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
        const enrollment = await this.studentEnrollmentModel.findOne({ studentId: new Types.ObjectId(studentId) })
            .populate('gradeId', 'level')
            .exec();
        if (!enrollment) return [];
        const gradeLevel = (enrollment.gradeId as any)?.level;
        if (!gradeLevel) return [];
        return this.assignmentModel.find({ gradeLevel })
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
        const enrollment = await this.studentEnrollmentModel.findOne({ studentId: sid })
            .populate('gradeId', 'level')
            .exec();

        if (!enrollment) {
            return {
                enrolled: false, gradeLevel: null,
                courses: [], liveClasses: [], videos: [], assignments: [], submissions: [],
            };
        }

        const gradeLevel = (enrollment.gradeId as any)?.level;
        // Extract raw ObjectId from populated gradeId
        const gradeOid = (enrollment.gradeId as any)?._id || enrollment.gradeId;
        if (!gradeLevel) {
            return {
                enrolled: true, gradeLevel: null,
                courses: [], liveClasses: [], videos: [], assignments: [], submissions: [],
            };
        }

        const [courses, liveClasses, videos, rawAssignments, submissions] = await Promise.all([
            // Courses = teacher assignments for this grade (use raw ObjectId)
            this.teacherAssignmentModel.find({ gradeId: gradeOid })
                .populate('gradeId', 'level')
                .populate('subjectId', 'name gradeLevel description')
                .populate('teacherId', 'firstName lastName email')
                .exec(),
            // Live classes for this grade
            this.liveClassModel.find({ gradeLevel })
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ startTime: 1 })
                .exec(),
            // Videos for this grade
            this.videoModel.find({ gradeLevel })
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .exec(),
            // Assignments for this grade
            this.assignmentModel.find({ gradeLevel })
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
            // canSubmit: not yet submitted (allow late submissions too)
            obj.isExpired = isExpired;
            obj.canSubmit = !hasSubmission;
            obj.dueDateISO = obj.dueDate ? new Date(obj.dueDate).toISOString() : null;
            return obj;
        });

        return { enrolled: true, gradeLevel, courses, liveClasses, videos, assignments, submissions };
    }

    async getStudentCourses(studentId: string) {
        const sid = new Types.ObjectId(studentId);
        const enrollment = await this.studentEnrollmentModel.findOne({ studentId: sid })
            .populate('gradeId', 'level')
            .exec();
        if (!enrollment) return [];
        const gradeOid = (enrollment.gradeId as any)?._id || enrollment.gradeId;
        return this.teacherAssignmentModel.find({ gradeId: gradeOid })
            .populate('gradeId', 'level')
            .populate('subjectId', 'name gradeLevel description')
            .populate('teacherId', 'firstName lastName email')
            .exec();
    }

    // ─── TEACHER ASSIGNMENTS ────────────────────────────
    async createTeacherAssignment(data: any) {
        return this.teacherAssignmentModel.create({
            gradeId: new Types.ObjectId(data.gradeId),
            subjectId: new Types.ObjectId(data.subjectId),
            teacherId: new Types.ObjectId(data.teacherId),
            notes: data.notes || '',
        });
    }
    async getTeacherAssignments(query?: any) {
        const filter: any = {};
        if (query?.teacherId) filter.teacherId = new Types.ObjectId(query.teacherId);
        if (query?.gradeId) filter.gradeId = new Types.ObjectId(query.gradeId);
        if (query?.subjectId) filter.subjectId = new Types.ObjectId(query.subjectId);
        return this.teacherAssignmentModel.find(filter)
            .populate('gradeId', 'level')
            .populate('subjectId', 'name gradeLevel')
            .populate('teacherId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .exec();
    }
    async getMyAssignments(teacherId: string) {
        return this.teacherAssignmentModel.find({ teacherId: new Types.ObjectId(teacherId) })
            .populate('gradeId', 'level')
            .populate('subjectId', 'name gradeLevel')
            .exec();
    }
    async deleteTeacherAssignment(id: string) {
        return this.teacherAssignmentModel.findByIdAndDelete(id).exec();
    }

    // ─── STUDENT ENROLLMENTS ────────────────────────────
    async createStudentEnrollment(data: any) {
        return this.studentEnrollmentModel.findOneAndUpdate(
            { studentId: new Types.ObjectId(data.studentId) },
            {
                studentId: new Types.ObjectId(data.studentId),
                gradeId: new Types.ObjectId(data.gradeId),
                parentId: data.parentId ? new Types.ObjectId(data.parentId) : undefined,
                enrollmentDate: new Date(),
            },
            { new: true, upsert: true }
        );
    }
    async getStudentEnrollments(query?: any) {
        const filter: any = {};
        if (query?.gradeId) filter.gradeId = new Types.ObjectId(query.gradeId);
        if (query?.studentId) filter.studentId = new Types.ObjectId(query.studentId);
        return this.studentEnrollmentModel.find(filter)
            .populate('studentId', 'firstName lastName email')
            .populate('gradeId', 'level')
            .populate('parentId', 'firstName lastName email')
            .sort({ enrollmentDate: -1 })
            .exec();
    }
    async getMyEnrollment(studentId: string) {
        return this.studentEnrollmentModel.findOne({ studentId: new Types.ObjectId(studentId) })
            .populate('gradeId', 'level')
            .exec();
    }
    async deleteStudentEnrollment(id: string) {
        return this.studentEnrollmentModel.findByIdAndDelete(id).exec();
    }

    // ─── QUESTIONS ──────────────────────────────────────
    async createQuestion(data: any, teacherId: string) {
        return this.questionModel.create({ ...data, teacherId: new Types.ObjectId(teacherId) });
    }
    async getQuestions(query: any) {
        try {
            const filter: any = {};
            if (query.teacherId) filter.teacherId = new Types.ObjectId(query.teacherId);
            if (query.gradeLevel) filter.gradeLevel = Number(query.gradeLevel);
            if (query.subjectId) filter.subjectId = new Types.ObjectId(query.subjectId);
            if (query.difficulty) filter.difficulty = query.difficulty;
            return await this.questionModel.find(filter)
                .populate('subjectId', 'name')
                .populate('teacherId', 'firstName lastName')
                .sort({ createdAt: -1 })
                .exec();
        } catch (error) {
            console.error('getQuestions error:', error);
            return [];
        }
    }
    async updateQuestion(id: string, data: any) {
        return this.questionModel.findByIdAndUpdate(id, data, { new: true }).exec();
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
            .populate('gradeId', 'level')
            .populate('subjectId', 'name gradeLevel')
            .populate('teacherId', 'firstName lastName email')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .exec();
    }

    async getTeacherSchedule(teacherId: string) {
        return this.scheduleModel.find({ teacherId: new Types.ObjectId(teacherId), isActive: true })
            .populate('gradeId', 'level')
            .populate('subjectId', 'name gradeLevel')
            .sort({ dayOfWeek: 1, startTime: 1 })
            .exec();
    }

    async getStudentSchedule(studentId: string) {
        const enrollment = await this.studentEnrollmentModel.findOne({ studentId: new Types.ObjectId(studentId) })
            .populate('gradeId', 'level')
            .exec();
        if (!enrollment) return [];
        const gradeOid = (enrollment.gradeId as any)?._id || enrollment.gradeId;
        return this.scheduleModel.find({ gradeId: gradeOid, isActive: true })
            .populate('gradeId', 'level')
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
}
