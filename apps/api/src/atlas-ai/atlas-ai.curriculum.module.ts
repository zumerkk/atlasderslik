import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiProviderModule } from '../gamification/ai-provider.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Grade, GradeSchema } from '../education/schemas/grade.schema';
import { Subject, SubjectSchema } from '../education/schemas/subject.schema';
import { Unit, UnitSchema } from '../education/schemas/unit.schema';
import { Topic, TopicSchema } from '../education/schemas/topic.schema';
import { StudentEnrollment, StudentEnrollmentSchema } from '../education/schemas/student-enrollment.schema';
import { TeacherAssignment, TeacherAssignmentSchema } from '../education/schemas/teacher-assignment.schema';
import { AtlasCurriculumEntry, AtlasCurriculumEntrySchema } from './atlas-ai.curriculum.schema';
import { AtlasCurriculumService } from './atlas-ai.curriculum.service';
import { AtlasCurriculumController } from './atlas-ai.curriculum.controller';
import { AtlasAiRateLimitGuard } from './atlas-ai-rate-limit.guard';

@Module({ imports: [AiProviderModule, MongooseModule.forFeature([
  { name: User.name, schema: UserSchema }, { name: Grade.name, schema: GradeSchema },
  { name: Subject.name, schema: SubjectSchema }, { name: Unit.name, schema: UnitSchema },
  { name: Topic.name, schema: TopicSchema }, { name: StudentEnrollment.name, schema: StudentEnrollmentSchema },
  { name: TeacherAssignment.name, schema: TeacherAssignmentSchema }, { name: AtlasCurriculumEntry.name, schema: AtlasCurriculumEntrySchema },
])], providers: [AtlasCurriculumService, AtlasAiRateLimitGuard], controllers: [AtlasCurriculumController], exports: [AtlasCurriculumService, AtlasAiRateLimitGuard] })
export class AtlasCurriculumModule {}
