import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { LiveClass, LiveClassSchema } from '../education/schemas/live-class.schema';
import { Video, VideoSchema } from '../education/schemas/video.schema';
import { Assignment, AssignmentSchema } from '../education/schemas/assignment.schema';
import { TeacherAssignment, TeacherAssignmentSchema } from '../education/schemas/teacher-assignment.schema';
import { StudentEnrollment, StudentEnrollmentSchema } from '../education/schemas/student-enrollment.schema';
import { Question, QuestionSchema } from '../education/schemas/question.schema';
import { Order, OrderSchema } from '../packages/schemas/order.schema';
import { Package, PackageSchema } from '../packages/schemas/package.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: LiveClass.name, schema: LiveClassSchema },
            { name: Video.name, schema: VideoSchema },
            { name: Assignment.name, schema: AssignmentSchema },
            { name: TeacherAssignment.name, schema: TeacherAssignmentSchema },
            { name: StudentEnrollment.name, schema: StudentEnrollmentSchema },
            { name: Question.name, schema: QuestionSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Package.name, schema: PackageSchema },
        ])
    ],
    providers: [StatisticsService],
    controllers: [StatisticsController]
})
export class StatisticsModule { }
