import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AtlasAiRateLimitGuard } from './atlas-ai-rate-limit.guard';
import { AtlasCurriculumService } from './atlas-ai.curriculum.service';
import { AtlasCurriculumDraftDto, AtlasCurriculumQueryDto, AtlasCurriculumReviewDto } from './atlas-ai.curriculum.dto';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('atlas-ai/curriculum')
@SkipThrottle()
@UseGuards(JwtAuthGuard, AtlasAiRateLimitGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class AtlasCurriculumController {
  constructor(private readonly curriculum: AtlasCurriculumService) {}
  @Get('scope') scope(@Req() req: any, @Query() query: AtlasCurriculumQueryDto) {
    return this.curriculum.resolve(req.user.userId, query.studentId, query.topicId);
  }
  @Get('review') review(@Req() req: any, @Query() query: AtlasCurriculumQueryDto) {
    return this.curriculum.listForReview(req.user.userId, query.topicId, query.gradeId);
  }
  @Post('draft') draft(@Req() req: any, @Body() body: AtlasCurriculumDraftDto) {
    return this.curriculum.saveDraft(req.user.userId, body);
  }
  @Patch(':id/approve') approve(@Req() req: any, @Param('id') id: string, @Body() body: AtlasCurriculumReviewDto) {
    return this.curriculum.approve(req.user.userId, id, body);
  }
  @Patch(':id/revoke') revoke(@Req() req: any, @Param('id') id: string, @Body() body: AtlasCurriculumReviewDto) {
    return this.curriculum.revoke(req.user.userId, id, body);
  }
}
