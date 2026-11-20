import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AtlasAiModule } from '../atlas-ai/atlas-ai.module';
import { GamificationModule } from '../gamification/gamification.module';
import { Video, VideoSchema } from '../education/schemas/video.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Grade, GradeSchema } from '../education/schemas/grade.schema';
import { Subject, SubjectSchema } from '../education/schemas/subject.schema';
import { StudentEnrollment, StudentEnrollmentSchema } from '../education/schemas/student-enrollment.schema';
import { TeacherAssignment, TeacherAssignmentSchema } from '../education/schemas/teacher-assignment.schema';
import { LessonVideoJob, LessonVideoJobSchema, LessonVideoQuota, LessonVideoQuotaSchema } from './lesson-video-job.schema';
import { LessonVideoService } from './lesson-video.service';
import { LessonVideoController } from './lesson-video.controller';

@Module({
  imports: [AtlasAiModule, GamificationModule, MongooseModule.forFeature([
    { name: Video.name, schema: VideoSchema },
    { name: User.name, schema: UserSchema },
    { name: Grade.name, schema: GradeSchema },
    { name: Subject.name, schema: SubjectSchema },
    { name: StudentEnrollment.name, schema: StudentEnrollmentSchema },
    { name: TeacherAssignment.name, schema: TeacherAssignmentSchema },
    { name: LessonVideoJob.name, schema: LessonVideoJobSchema },
    { name: LessonVideoQuota.name, schema: LessonVideoQuotaSchema },
  ])],
  controllers: [LessonVideoController],
  providers: [LessonVideoService],
  exports: [LessonVideoService],
})
export class LessonVideoModule {}
