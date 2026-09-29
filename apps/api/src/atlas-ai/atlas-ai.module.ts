import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamificationModule } from '../gamification/gamification.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  StudentEnrollment,
  StudentEnrollmentSchema,
} from '../education/schemas/student-enrollment.schema';
import {
  TeacherAssignment,
  TeacherAssignmentSchema,
} from '../education/schemas/teacher-assignment.schema';
import {
  Assignment,
  AssignmentSchema,
} from '../education/schemas/assignment.schema';
import {
  Submission,
  SubmissionSchema,
} from '../education/schemas/submission.schema';
import { Schedule, ScheduleSchema } from '../education/schemas/schedule.schema';
import {
  LiveClass,
  LiveClassSchema,
} from '../education/schemas/live-class.schema';
import {
  TestResult,
  TestResultSchema,
} from '../education/schemas/test-result.schema';
import { Grade, GradeSchema } from '../education/schemas/grade.schema';
import { Subject, SubjectSchema } from '../education/schemas/subject.schema';
import { Test, TestSchema } from '../education/schemas/test.schema';
import {
  StudentProgress,
  StudentProgressSchema,
} from '../gamification/schemas/student-progress.schema';
import { AtlasAiController } from './atlas-ai.controller';
import { AtlasAiService } from './atlas-ai.service';
import { AtlasAiRateLimitGuard } from './atlas-ai-rate-limit.guard';
import { AtlasAnalyticsService } from './atlas-ai.analytics';
import { Question, QuestionSchema } from '../education/schemas/question.schema';
import { Topic, TopicSchema } from '../education/schemas/topic.schema';
import { Unit, UnitSchema } from '../education/schemas/unit.schema';
import { AtlasSavedPlan, AtlasSavedPlanSchema } from './atlas-ai.saved-plan.schema';
import { AtlasSavedPlanService } from './atlas-ai.saved-plan.service';

@Module({
  imports: [
    GamificationModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: StudentEnrollment.name, schema: StudentEnrollmentSchema },
      { name: TeacherAssignment.name, schema: TeacherAssignmentSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Schedule.name, schema: ScheduleSchema },
      { name: LiveClass.name, schema: LiveClassSchema },
      { name: TestResult.name, schema: TestResultSchema },
      { name: Grade.name, schema: GradeSchema },
      { name: Subject.name, schema: SubjectSchema },
      { name: Test.name, schema: TestSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Topic.name, schema: TopicSchema },
      { name: Unit.name, schema: UnitSchema },
      { name: StudentProgress.name, schema: StudentProgressSchema },
      { name: AtlasSavedPlan.name, schema: AtlasSavedPlanSchema },
    ]),
  ],
  controllers: [AtlasAiController],
  providers: [AtlasAiService, AtlasAiRateLimitGuard, AtlasAnalyticsService, AtlasSavedPlanService],
})
export class AtlasAiModule {}
