import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { StudentProgress, StudentProgressSchema } from './schemas/student-progress.schema';
import { DailyChallenge, DailyChallengeSchema } from './schemas/daily-challenge.schema';
import { Submission, SubmissionSchema } from '../education/schemas/submission.schema';
import { StudentEnrollment, StudentEnrollmentSchema } from '../education/schemas/student-enrollment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: StudentProgress.name, schema: StudentProgressSchema },
            { name: DailyChallenge.name, schema: DailyChallengeSchema },
            { name: Submission.name, schema: SubmissionSchema },
            { name: StudentEnrollment.name, schema: StudentEnrollmentSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [GamificationController, AiController],
    providers: [GamificationService, AiService],
    exports: [GamificationService, AiService],
})
export class GamificationModule { }
