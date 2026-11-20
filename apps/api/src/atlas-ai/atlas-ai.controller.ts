import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AtlasChatDto, AtlasInsightsQueryDto, AtlasPlanDto, AtlasPlanProgressDto } from './atlas-ai.dto';
import { AtlasAiService } from './atlas-ai.service';
import { AtlasAiRateLimitGuard } from './atlas-ai-rate-limit.guard';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('atlas-ai')
// School networks share an IP. Every endpoint instead has a JWT account budget.
@SkipThrottle()
@UseGuards(JwtAuthGuard, AtlasAiRateLimitGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class AtlasAiController {
  constructor(private readonly atlas: AtlasAiService) {}

  @Get('status')
  status(@Req() request: { user: { userId: string } }) {
    return this.atlas.status(request.user.userId);
  }

  @Get('budget')
  @Header('Cache-Control', 'private, no-store')
  budget(@Req() request: { user: { userId: string } }) {
    return this.atlas.budgetStatus(request.user.userId);
  }

  @Get('insights')
  insights(
    @Req() request: { user: { userId: string } },
    @Query() query: AtlasInsightsQueryDto,
  ) {
    return this.atlas.insights(request.user.userId, query.studentId);
  }

  @Post('plan')
  plan(
    @Req() request: { user: { userId: string } },
    @Body() body: AtlasPlanDto,
  ) {
    return this.atlas.plan(request.user.userId, body);
  }

  @Post('chat')
  chat(
    @Req() request: { user: { userId: string } },
    @Body() body: AtlasChatDto,
  ) {
    return this.atlas.chat(request.user.userId, body);
  }

  @Get('saved-plan')
  savedPlan(
    @Req() request: { user: { userId: string } },
    @Query() query: AtlasInsightsQueryDto,
  ) {
    return this.atlas.savedPlan(request.user.userId, query.studentId);
  }

  @Patch('saved-plan/progress')
  updatePlanProgress(
    @Req() request: { user: { userId: string } },
    @Body() body: AtlasPlanProgressDto,
  ) {
    return this.atlas.updatePlanProgress(request.user.userId, body);
  }
}
