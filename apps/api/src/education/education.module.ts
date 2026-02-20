import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';
import { Grade, GradeSchema } from './schemas/grade.schema';
import { Subject, SubjectSchema } from './schemas/subject.schema';
import { Unit, UnitSchema } from './schemas/unit.schema';
import { Topic, TopicSchema } from './schemas/topic.schema';
import { Video, VideoSchema } from './schemas/video.schema';
import { LiveClass, LiveClassSchema } from './schemas/live-class.schema';
import { Assignment, AssignmentSchema } from './schemas/assignment.schema';
import { Submission, SubmissionSchema } from './schemas/submission.schema';
import { TeacherAssignment, TeacherAssignmentSchema } from './schemas/teacher-assignment.schema';
import { StudentEnrollment, StudentEnrollmentSchema } from './schemas/student-enrollment.schema';
import { Question, QuestionSchema } from './schemas/question.schema';
import { Schedule, ScheduleSchema } from './schemas/schedule.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Grade.name, schema: GradeSchema },
            { name: Subject.name, schema: SubjectSchema },
            { name: Unit.name, schema: UnitSchema },
            { name: Topic.name, schema: TopicSchema },
            { name: LiveClass.name, schema: LiveClassSchema },
            { name: Video.name, schema: VideoSchema },
            { name: Assignment.name, schema: AssignmentSchema },
            { name: Submission.name, schema: SubmissionSchema },
            { name: TeacherAssignment.name, schema: TeacherAssignmentSchema },
            { name: StudentEnrollment.name, schema: StudentEnrollmentSchema },
            { name: Question.name, schema: QuestionSchema },
            { name: Schedule.name, schema: ScheduleSchema },
        ]),
    ],
    controllers: [EducationController],
    providers: [EducationService],
    exports: [EducationService],
})
export class EducationModule { }
