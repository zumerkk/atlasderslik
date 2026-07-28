import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '@repo/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GamificationService } from './gamification.service';

@SkipThrottle()
@Controller('gamification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class GamificationController {
    constructor(private readonly gamification: GamificationService) { }

    /** Single round trip for the whole student dashboard. */
    @Get('overview')
    getOverview(@Req() req: any) {
        return this.gamification.getOverview(req.user.userId);
    }

    @Get('xp')
    getXp(@Req() req: any) {
        return this.gamification.getXpSummary(req.user.userId);
    }

    @Get('leaderboard')
    getLeaderboard(@Req() req: any, @Query('limit') limit?: string) {
        return this.gamification.getLeaderboard(req.user.userId, Math.min(50, parseInt(limit || '10', 10) || 10));
    }

    @Get('weak-spots')
    getWeakSpots(@Req() req: any) {
        return this.gamification.getWeakSpots(req.user.userId);
    }

    @Get('lgs-simulation')
    getLgs(@Req() req: any) {
        return this.gamification.getLgsSimulation(req.user.userId);
    }

    @Get('daily-challenge')
    getDailyChallenge(@Req() req: any) {
        return this.gamification.getDailyChallenge(req.user.userId);
    }

    @Post('daily-challenge/answer')
    answerDailyChallenge(@Req() req: any, @Body('letter') letter: string) {
        return this.gamification.answerDailyChallenge(req.user.userId, letter);
    }

    @Get('store')
    getStore(@Req() req: any) {
        return this.gamification.getStore(req.user.userId);
    }

    @Post('store/buy')
    buyTitle(@Req() req: any, @Body('itemId') itemId: string) {
        return this.gamification.buyTitle(req.user.userId, itemId);
    }

    @Post('store/active-title')
    setActiveTitle(@Req() req: any, @Body('itemId') itemId: string) {
        return this.gamification.setActiveTitle(req.user.userId, itemId);
    }

    // ─── AI (key stays server-side) ─────────────────────

    @Get('ai/coach-tip')
    getCoachTip(@Req() req: any) {
        return this.gamification.getCoachTip(req.user.userId);
    }

    @Get('ai/study-plan')
    getStudyPlan(@Req() req: any) {
        return this.gamification.getStudyPlan(req.user.userId);
    }
}
