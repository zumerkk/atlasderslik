import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { OpenAiBudgetService } from './openai-budget.service';

@Module({ imports: [ConfigModule], providers: [AiService, OpenAiBudgetService], exports: [AiService] })
export class AiProviderModule {}
