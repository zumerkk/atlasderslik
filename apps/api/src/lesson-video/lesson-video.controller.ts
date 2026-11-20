import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@repo/shared';
import { LessonVideoService } from './lesson-video.service';
import type { LessonUpload } from './lesson-video.service';

@Controller('lesson-videos')
export class LessonVideoController {
  constructor(private readonly videos: LessonVideoService) {}

  @Get('status') @UseGuards(JwtAuthGuard)
  status() { return this.videos.capabilities(); }

  @Post('upload') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    dest: join(tmpdir(), 'atlas-video-incoming'),
    limits: { fileSize: 256 * 1024 * 1024, files: 1, fields: 6, fieldSize: 5000 },
    fileFilter: (_req, file, callback) => {
      if (!['video/mp4', 'video/webm'].includes(file.mimetype)) return callback(new BadRequestException('Yalnızca MP4 ve WebM ders videoları yüklenebilir.'), false);
      callback(null, true);
    },
  }))
  upload(@UploadedFile() file: LessonUpload, @Body() body: any, @Req() req: any) {
    // Validation is inside the service so failed form validation also removes the temporary file.
    return this.videos.upload(req.user.userId, body, file);
  }

  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.TEACHER, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.videos.update(req.user.userId, id, body); }

  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.TEACHER, UserRole.ADMIN)
  remove(@Param('id') id: string, @Req() req: any) { return this.videos.remove(req.user.userId, id); }

  @Post(':id/playback') @UseGuards(JwtAuthGuard)
  playback(@Param('id') id: string, @Req() req: any) { return this.videos.playback(req.user.userId, id); }

  @Get(':id/stream')
  async stream(@Param('id') id: string, @Query('ticket') ticket: string, @Headers('range') range: string | undefined, @Res() response: Response) {
    await this.videos.stream(id, ticket, range, response);
  }

  @Post(':id/summary') @UseGuards(JwtAuthGuard)
  summarize(@Param('id') id: string, @Req() req: any) { return this.videos.requestSummary(req.user.userId, id); }

  @Get(':id/summary') @UseGuards(JwtAuthGuard)
  summary(@Param('id') id: string, @Req() req: any) { return this.videos.summary(req.user.userId, id); }
}
