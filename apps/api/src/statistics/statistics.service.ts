import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LiveClass, LiveClassDocument } from '../education/schemas/live-class.schema';
import { Video, VideoDocument } from '../education/schemas/video.schema';
import { Assignment, AssignmentDocument } from '../education/schemas/assignment.schema';
import { TeacherAssignment, TeacherAssignmentDocument } from '../education/schemas/teacher-assignment.schema';
import { StudentEnrollment, StudentEnrollmentDocument } from '../education/schemas/student-enrollment.schema';
import { Question, QuestionDocument } from '../education/schemas/question.schema';
import { UserRole } from '@repo/shared';

@Injectable()
export class StatisticsService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(LiveClass.name) private liveClassModel: Model<LiveClassDocument>,
        @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
        @InjectModel(Assignment.name) private assignmentModel: Model<AssignmentDocument>,
        @InjectModel(TeacherAssignment.name) private teacherAssignmentModel: Model<TeacherAssignmentDocument>,
        @InjectModel(StudentEnrollment.name) private studentEnrollmentModel: Model<StudentEnrollmentDocument>,
        @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    ) { }

    async getAdminStats() {
        const [
            totalStudents,
            totalTeachers,
            totalLiveClasses,
            totalVideos,
            totalAssignments,
            totalEnrollments,
            totalTeacherAssignments,
        ] = await Promise.all([
            this.userModel.countDocuments({ role: UserRole.STUDENT }),
            this.userModel.countDocuments({ role: UserRole.TEACHER }),
            this.liveClassModel.countDocuments(),
            this.videoModel.countDocuments(),
            this.assignmentModel.countDocuments(),
            this.studentEnrollmentModel.countDocuments(),
            this.teacherAssignmentModel.countDocuments(),
        ]);

        return {
            totalStudents,
            totalTeachers,
            totalLiveClasses,
            totalVideos,
            totalAssignments,
            totalEnrollments,
            totalTeacherAssignments,
        };
    }

    async getTeacherStats(teacherId: string) {
        const tid = new Types.ObjectId(teacherId);

        // Get grades this teacher is assigned to
        const assignments = await this.teacherAssignmentModel.find({ teacherId: tid }).exec();
        const assignedGradeIds = [...new Set(assignments.map(a => a.gradeId.toString()))];

        // Count students enrolled in those grades
        let myStudents = 0;
        if (assignedGradeIds.length > 0) {
            myStudents = await this.studentEnrollmentModel.countDocuments({
                gradeId: { $in: assignedGradeIds.map(id => new Types.ObjectId(id)) }
            });
        }

        const [
            myLiveClasses,
            myVideos,
            myAssignments,
            myQuestions,
        ] = await Promise.all([
            this.liveClassModel.countDocuments({ teacherId: tid }),
            this.videoModel.countDocuments({ teacherId: tid }),
            this.assignmentModel.countDocuments({ teacherId: tid }),
            this.questionModel.countDocuments({ teacherId: tid }),
        ]);

        return {
            myStudents,
            myLiveClasses,
            myVideos,
            myAssignments,
            myQuestions,
            myAssignedClasses: assignments.length,
        };
    }

    async getStudentStats(studentId: string) {
        const sid = new Types.ObjectId(studentId);
        const enrollment = await this.studentEnrollmentModel.findOne({ studentId: sid }).populate('gradeId', 'level').exec();

        if (!enrollment) {
            return { enrolled: false, gradeLevel: null, totalCourses: 0, upcomingClasses: 0, pendingAssignments: 0, totalVideos: 0 };
        }

        const gradeLevel = (enrollment.gradeId as any)?.level;

        const [totalCourses, upcomingClasses, pendingAssignments, totalVideos] = await Promise.all([
            // Subjects for this grade (proxy for courses count)
            gradeLevel ? this.assignmentModel.db.collection('subjects').countDocuments({ gradeLevel }) : 0,
            this.liveClassModel.countDocuments({ gradeLevel, startTime: { $gte: new Date() } }),
            this.assignmentModel.countDocuments({ gradeLevel, dueDate: { $gte: new Date() } }),
            this.videoModel.countDocuments({ gradeLevel }),
        ]);

        return {
            enrolled: true,
            gradeLevel,
            totalCourses,
            upcomingClasses,
            pendingAssignments,
            totalVideos,
        };
    }
}
