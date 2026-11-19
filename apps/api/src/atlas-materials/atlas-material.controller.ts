import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AtlasAiRateLimitGuard } from '../atlas-ai/atlas-ai-rate-limit.guard';
import { AtlasMaterialService } from './atlas-material.service';
import { AtlasMaterialQuery, CreateAtlasMaterialDto } from './atlas-material.dto';

@Controller('atlas-materials') @SkipThrottle() @UseGuards(JwtAuthGuard, AtlasAiRateLimitGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class AtlasMaterialController {
  constructor(private readonly materials: AtlasMaterialService) {}
  @Post() create(@Req() req: { user: { userId: string } }, @Body() dto: CreateAtlasMaterialDto) { return this.materials.create(req.user.userId, dto); }
  @Get() list(@Req() req: { user: { userId: string } }, @Query() query: AtlasMaterialQuery) { return this.materials.list(req.user.userId, query.studentId); }
  @Get(':id/pdf') async download(@Req() req: { user: { userId: string } }, @Param('id') id: string, @Res() res: Response) {
    const result = await this.materials.download(req.user.userId, id);
    res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Content-Length', result.buffer.length); res.end(result.buffer);
  }
}
