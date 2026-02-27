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
import { Order, OrderDocument, OrderStatus } from '../packages/schemas/order.schema';
import { Package, PackageDocument } from '../packages/schemas/package.schema';
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
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
        @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
    ) { }

    async getAdminStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const [
            totalStudents,
            totalTeachers,
            totalLiveClasses,
            totalVideos,
            totalAssignments,
            totalEnrollments,
            totalTeacherAssignments,
            totalPackages,
            activeSubscriptions,
            newUsersThisMonth,
            revenueAgg,
        ] = await Promise.all([
            this.userModel.countDocuments({ role: UserRole.STUDENT }),
            this.userModel.countDocuments({ role: UserRole.TEACHER }),
            this.liveClassModel.countDocuments(),
            this.videoModel.countDocuments(),
            this.assignmentModel.countDocuments(),
            this.studentEnrollmentModel.countDocuments(),
            this.teacherAssignmentModel.countDocuments(),
            this.packageModel.countDocuments(),
            this.orderModel.countDocuments({ status: OrderStatus.COMPLETED }),
            this.userModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
            // Revenue aggregation pipeline
            this.orderModel.aggregate([
                { $match: { status: OrderStatus.COMPLETED } },
                {
                    $facet: {
                        total: [{ $group: { _id: null, sum: { $sum: '$amount' } } }],
                        thisMonth: [
                            { $match: { paidAt: { $gte: startOfMonth } } },
                            { $group: { _id: null, sum: { $sum: '$amount' } } },
                        ],
                        lastMonth: [
                            { $match: { paidAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
                            { $group: { _id: null, sum: { $sum: '$amount' } } },
                        ],
                        thisYear: [
                            { $match: { paidAt: { $gte: startOfYear } } },
                            { $group: { _id: null, sum: { $sum: '$amount' } } },
                        ],
                    },
                },
            ]),
        ]);

        const rev = revenueAgg[0] || {};
        const totalRevenue = rev.total?.[0]?.sum || 0;
        const revenueThisMonth = rev.thisMonth?.[0]?.sum || 0;
        const revenueLastMonth = rev.lastMonth?.[0]?.sum || 0;
        const revenueThisYear = rev.thisYear?.[0]?.sum || 0;

        return {
            totalStudents,
            totalTeachers,
            totalLiveClasses,
            totalVideos,
            totalAssignments,
            totalEnrollments,
            totalTeacherAssignments,
            totalPackages,
            activeSubscriptions,
            newUsersThisMonth,
            totalRevenue,
            revenue: {
                this_month: revenueThisMonth,
                last_month: revenueLastMonth,
                this_year: revenueThisYear,
            },
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

