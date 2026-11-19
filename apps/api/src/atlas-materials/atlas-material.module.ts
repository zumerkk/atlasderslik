import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamificationModule } from '../gamification/gamification.module';
import { AtlasAiModule } from '../atlas-ai/atlas-ai.module';
import { AtlasMaterial, AtlasMaterialSchema } from './atlas-material.schema';
import { AtlasMaterialService } from './atlas-material.service';
import { AtlasMaterialController } from './atlas-material.controller';

@Module({ imports: [GamificationModule, AtlasAiModule, MongooseModule.forFeature([{ name: AtlasMaterial.name, schema: AtlasMaterialSchema }])],
  providers: [AtlasMaterialService], controllers: [AtlasMaterialController] })
export class AtlasMaterialModule {}
