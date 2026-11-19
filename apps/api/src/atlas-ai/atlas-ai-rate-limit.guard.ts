import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectThrottlerStorage, ThrottlerException } from '@nestjs/throttler';
import type { ThrottlerStorage } from '@nestjs/throttler';

/** Runs after JWT authentication. Classmates sharing Wi-Fi get separate budgets. */
@Injectable()
export class AtlasAiRateLimitGuard implements CanActivate {
  constructor(
    @InjectThrottlerStorage() private readonly storage: ThrottlerStorage,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const userId = http.getRequest().user?.userId;
    if (!userId) throw new UnauthorizedException();
    const request = http.getRequest();
    const imageRequest = context.getHandler().name === 'chat' && request.body?.mode === 'image';
    // Images carry a separate, lower spend budget; reports don't consume chat quota.
    const progressRequest = context.getHandler().name === 'updatePlanProgress';
    const materialRequest = context.getClass().name === 'AtlasMaterialController' && context.getHandler().name === 'create';
    const paidHelper = ['generateQuiz', 'getCoachTip', 'getStudyPlan'].includes(context.getHandler().name);
    const dailyQuestion = ['getDailyChallenge', 'getOverview'].includes(context.getHandler().name);
    const operation = paidHelper ? context.getHandler().name : dailyQuestion ? 'daily-question' : materialRequest ? 'material' : imageRequest ? 'image' : progressRequest ? 'progress' : context.getHandler().name === 'chat' ? 'chat' : 'learning';
    const limit = paidHelper ? 2 : dailyQuestion ? 6 : materialRequest ? 2 : imageRequest ? 3 : progressRequest ? 60 : 20;
    const result = await this.storage.increment(
      `atlas-ai:${operation}:${userId}`,
      60000,
      limit,
      60000,
      `atlas-ai-${operation}-account`,
    );
    const response = http.getResponse();
    response.setHeader('X-RateLimit-Atlas-Limit', limit);
    response.setHeader(
      'X-RateLimit-Atlas-Remaining',
      Math.max(0, limit - result.totalHits),
    );
    if (result.isBlocked) {
      response.setHeader('Retry-After', result.timeToBlockExpire);
      throw new ThrottlerException(
        'Çok hızlı mesaj gönderiyorsun. Bir dakika sonra yeniden deneyebilirsin.',
      );
    }
    return true;
  }
}
