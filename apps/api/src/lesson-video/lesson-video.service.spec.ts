import { BadRequestException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LessonVideoService, lessonByteRange } from './lesson-video.service';
import { hasPersistentVideoMount, videoStorageRoot } from './lesson-video-storage';
import { OpenAiBudgetException } from '../gamification/openai-budget.service';
import { OpenAiTranscriptionException } from '../gamification/ai.service';

const actorId = '507f1f77bcf86cd799439011';
const otherId = '507f1f77bcf86cd799439012';
const videoId = '507f1f77bcf86cd799439013';
const gradeId = '507f1f77bcf86cd799439014';
const subjectId = '507f1f77bcf86cd799439015';
const topicId = '507f1f77bcf86cd799439016';
const jobId = '507f1f77bcf86cd799439017';
const chain = (value: any) => {
  const q: any = { exec: jest.fn().mockResolvedValue(value) };
  for (const method of ['select', 'lean', 'sort', 'limit']) q[method] = jest.fn().mockReturnValue(q);
  return q;
};
const model = () => ({ findById: jest.fn(() => chain(null)), find: jest.fn(() => chain([])), findOne: jest.fn(() => chain(null)), exists: jest.fn().mockResolvedValue(null), countDocuments: jest.fn().mockResolvedValue(0), create: jest.fn(), createIndexes: jest.fn().mockResolvedValue([]), updateOne: jest.fn((..._args: any[]) => chain({ matchedCount: 1 })), updateMany: jest.fn(() => chain({})), findOneAndUpdate: jest.fn(() => chain(null)), deleteMany: jest.fn(() => chain({})), deleteOne: jest.fn(() => chain({})), aggregate: jest.fn(() => chain([])) });
const approved = { schoolYear: '2026-2027', grades: [{ id: gradeId, level: 8, label: '' }], topics: [{ id: topicId, name: 'Üslü ifadeler', subjectId, subject: 'Matematik', gradeId, gradeLevel: 8, version: '1', outcomes: [{ id: 'approved:0', code: 'M.8', text: 'Tam sayıların tam sayı kuvvetlerini hesaplar.', topicId }] }], outcomes: [{ id: 'approved:0', code: 'M.8', text: 'Tam sayıların tam sayı kuvvetlerini hesaplar.', topicId }] };

describe('LessonVideoService private access and durable summaries', () => {
  let service: LessonVideoService;
  let videos: ReturnType<typeof model>, users: ReturnType<typeof model>, grades: ReturnType<typeof model>, subjects: ReturnType<typeof model>, enrollments: ReturnType<typeof model>, teaching: ReturnType<typeof model>, jobs: ReturnType<typeof model>, quotas: ReturnType<typeof model>;
  let curriculum: any, ai: any;
  const video = () => ({ _id: new Types.ObjectId(videoId), teacherId: new Types.ObjectId(actorId), gradeId: new Types.ObjectId(gradeId), subjectId: new Types.ObjectId(subjectId), topicId: new Types.ObjectId(topicId), source: 'upload', storageKey: 'b5da5836-7d21-4b85-9ef8-0bbc7d2f9096.mp4', sourceHash: 'hash', durationSeconds: 90 });
  const actor = (role: string, active = true) => users.findById.mockReturnValue(chain({ _id: new Types.ObjectId(actorId), role: role.toUpperCase(), isActive: active }));
  beforeEach(() => {
    [videos, users, grades, subjects, enrollments, teaching, jobs, quotas] = Array.from({ length: 8 }, model);
    curriculum = { requireVideoScope: jest.fn().mockResolvedValue(approved), assertRequest: jest.fn().mockResolvedValue({ allowed: true, matchedOutcomeIds: ['approved:0'] }), verifyContent: jest.fn().mockResolvedValue(true) };
    ai = { chatStructured: jest.fn(), transcribeAudio: jest.fn(), isOpenAiConfigured: true, reviewModel: 'gpt-6-sol' };
    service = new LessonVideoService(videos as any, users as any, grades as any, subjects as any, enrollments as any, teaching as any, jobs as any, quotas as any, curriculum, ai, new ConfigService({ JWT_SECRET: 'private-test-video-secret-123456', OPENAI_API_KEY: 'test-not-real' }));
    videos.findById.mockReturnValue(chain(video()));
    actor('student'); enrollments.find.mockReturnValue(chain([{ gradeId: new Types.ObjectId(gradeId), accessSource: 'manual' }]));
    grades.findById.mockReturnValue(chain({ _id: gradeId, level: 8, isActive: true }));
    subjects.findById.mockReturnValue(chain({ _id: subjectId, gradeLevel: 8, isActive: true }));
  });

  it('allows uploads but marks summaries unavailable when the shared AI provider is disabled', () => {
    jest.spyOn(service as any, 'configuredStorageRoot').mockReturnValue('/fixture/storage');
    jest.spyOn(service as any, 'binary').mockReturnValue('/fixture/ffmpeg');
    ai.isOpenAiConfigured = false; // A raw configured key must not override this gate.
    expect(service.capabilities()).toMatchObject({ uploadReady: true, summaryReady: false });
    ai.isOpenAiConfigured = true;
    expect(service.capabilities()).toMatchObject({ uploadReady: true, summaryReady: true });
  });

  it('checks enrollment before inspecting or returning a cached summary', async () => {
    enrollments.find.mockReturnValue(chain([]));
    jobs.findOne.mockReturnValue(chain({ status: 'completed', summary: { overview: 'PRIVATE' } }));
    await expect(service.requestSummary(actorId, videoId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(jobs.findOne).not.toHaveBeenCalled(); expect(ai.chatStructured).not.toHaveBeenCalled();
  });
  it('refuses expired paid rights and keeps independently authorized manual playback', async () => {
    const expired = { gradeId, accessSource: 'package', packageGrants: [{ environment: 'live', startsAt: new Date(0), expiresAt: new Date(1) }] };
    enrollments.find.mockReturnValue(chain([expired]));
    await expect(service.playback(actorId, videoId)).rejects.toBeInstanceOf(ForbiddenException);
    enrollments.find.mockReturnValue(chain([{ ...expired, accessSource: 'manual' }]));
    await expect(service.playback(actorId, videoId)).resolves.toHaveProperty('path');
  });
  it('refuses an inactive class or a subject explicitly tied to a parallel class', async () => {
    grades.findById.mockReturnValue(chain({ _id: gradeId, level: 8, isActive: false }));
    await expect(service.playback(actorId, videoId)).rejects.toBeInstanceOf(ForbiddenException);
    grades.findById.mockReturnValue(chain({ _id: gradeId, level: 8, isActive: true }));
    subjects.findById.mockReturnValue(chain({ _id: subjectId, gradeLevel: 8, gradeId: otherId, isActive: true }));
    await expect(service.playback(actorId, videoId)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('ignores client role claims and denies disabled accounts', async () => {
    actor('teacher', false);
    await expect(service.playback(actorId, videoId)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('does not let a teacher edit another teacher video', async () => {
    actor('teacher'); videos.findById.mockReturnValue(chain({ ...video(), teacherId: new Types.ObjectId(otherId) }));
    await expect(service.update(actorId, videoId, { title: 'Changed' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(videos.updateOne).not.toHaveBeenCalled();
  });
  it('checks current teacher assignment even for an owned video', async () => {
    actor('teacher'); teaching.exists.mockResolvedValue(null);
    await expect(service.playback(actorId, videoId)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('never analyzes external links as if their content had been watched', async () => {
    videos.findById.mockReturnValue(chain({ ...video(), source: 'link' }));
    await expect(service.requestSummary(actorId, videoId)).rejects.toThrow('Yüklenmiş ders videosu');
    expect(jobs.create).not.toHaveBeenCalled();
  });
  it('reuses an existing approved-scope summary without new provider work and hides internal identities', async () => {
    jobs.findOne.mockReturnValue(chain({ _id: jobId, status: 'completed', sourceHash: 'private', requestedBy: otherId, curriculumVersion: 'secret', summary: { overview: 'Onaylı ders özeti.' } }));
    const result = await service.requestSummary(actorId, videoId);
    expect(result.status).toBe('completed'); expect(result).not.toHaveProperty('requestedBy'); expect(result).not.toHaveProperty('sourceHash'); expect(result).not.toHaveProperty('curriculumVersion');
    expect(jobs.create).not.toHaveBeenCalled(); expect(ai.chatStructured).not.toHaveBeenCalled();
  });
  it('does not reuse a summary if current curriculum is revoked', async () => {
    curriculum.requireVideoScope.mockRejectedValue(new ForbiddenException('Müfredat onayı kaldırıldı.'));
    await expect(service.summary(actorId, videoId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(jobs.findOne).not.toHaveBeenCalled();
  });
  it('signs access only after authorization and rejects ticket tampering and wrong video binding', async () => {
    const result = await service.playback(actorId, videoId);
    const ticket = new URL(result.path, 'http://localhost').searchParams.get('ticket')!;
    expect((service as any).verifyTicket(videoId, ticket)).toBe(actorId);
    expect(() => (service as any).verifyTicket(videoId, ticket.slice(0, -3) + 'xyz')).toThrow(UnauthorizedException);
    expect(() => (service as any).verifyTicket(otherId, ticket)).toThrow(UnauthorizedException);
  });
  it('rejects expired playback tickets', async () => {
    const now = Date.now(); jest.spyOn(Date, 'now').mockReturnValue(now);
    const result = await service.playback(actorId, videoId);
    const ticket = new URL(result.path, 'http://localhost').searchParams.get('ticket')!;
    (Date.now as jest.Mock).mockReturnValue(now + 61 * 60 * 1000);
    expect(() => (service as any).verifyTicket(videoId, ticket)).toThrow(UnauthorizedException);
    jest.restoreAllMocks();
  });
  it('removes multipart temporary files when a student attempts upload', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'atlas-video-test-')); const path = join(dir, 'upload'); await writeFile(path, 'fake');
    try {
      await expect(service.upload(actorId, { title: 'Lesson', gradeId, subjectId }, { path, size: 4, mimetype: 'video/mp4', originalname: 'lesson.mp4' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' }); expect(videos.create).not.toHaveBeenCalled();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('rejects forged multipart storage identity and removes its temporary file', async () => {
    actor('teacher'); teaching.exists.mockResolvedValue({ _id: gradeId });
    const dir = await mkdtemp(join(tmpdir(), 'atlas-video-test-')); const path = join(dir, 'upload'); await writeFile(path, 'fake');
    try {
      await expect(service.upload(actorId, { title: 'Lesson', gradeId, subjectId, storageKey: '../../secrets', teacherId: otherId }, { path, size: 4, mimetype: 'video/mp4', originalname: 'lesson.mp4' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' }); expect(videos.create).not.toHaveBeenCalled();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('rejects non-video bytes even when MIME says video', async () => {
    actor('teacher'); teaching.exists.mockResolvedValue({ _id: gradeId });
    grades.findById.mockReturnValue(chain({ _id: gradeId, level: 8, isActive: true })); subjects.findById.mockReturnValue(chain({ _id: subjectId, gradeLevel: 8, isActive: true }));
    jest.spyOn(service, 'capabilities').mockReturnValue({ uploadReady: true, summaryReady: true, maxUploadMb: 256, maxDurationMinutes: 60, sampledFrameLimit: 12 });
    const dir = await mkdtemp(join(tmpdir(), 'atlas-video-test-')); const path = join(dir, 'upload'); await writeFile(path, 'not a video payload');
    try {
      await expect(service.upload(actorId, { title: 'Lesson', gradeId, subjectId }, { path, size: (await stat(path)).size, mimetype: 'video/mp4', originalname: 'lesson.mp4' })).rejects.toThrow('Dosya içeriği');
      await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' }); expect(videos.create).not.toHaveBeenCalled();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('stores an extraction failure without generating a fabricated summary, and cleans job workspace', async () => {
    let workspace = '';
    jest.spyOn(service as any, 'scopeVersion').mockReturnValue('approved-version');
    jest.spyOn(service as any, 'extract').mockImplementation(async (_video, path: any) => { workspace = path; await writeFile(join(path, 'partial.mp3'), 'partial'); throw new BadRequestException('Video sesi çıkarılamadı.'); });
    await service.processJob({ _id: new Types.ObjectId(jobId), requestedBy: actorId, videoId, curriculumVersion: 'approved-version', sourceHash: 'hash', attempts: 1 });
    expect(jobs.updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: new Types.ObjectId(jobId), status: 'processing' }), expect.objectContaining({ $set: expect.objectContaining({ status: 'failed', error: 'Video sesi çıkarılamadı.' }) }));
    expect(ai.chatStructured).not.toHaveBeenCalled(); await expect(stat(workspace)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('refuses empty extracted content without generating or publishing a summary', async () => {
    jest.spyOn(service as any, 'scopeVersion').mockReturnValue('approved-version');
    jest.spyOn(service as any, 'extract').mockResolvedValue({ transcript: '', frames: [], audioMinutes: 0 });
    await service.processJob({ _id: new Types.ObjectId(jobId), requestedBy: actorId, videoId, curriculumVersion: 'approved-version', sourceHash: 'hash', attempts: 1 });
    expect(ai.chatStructured).not.toHaveBeenCalled(); expect(jobs.updateOne.mock.calls.some(call => (call[1] as any)?.$set?.summary)).toBe(false);
  });
  it('requeues transient transcription failures once with a persisted retry time', async () => {
    jest.spyOn(service as any, 'scopeVersion').mockReturnValue('approved-version');
    jest.spyOn(service as any, 'extract').mockRejectedValue(new ServiceUnavailableException('OpenAI geçici olarak yanıt vermedi.'));
    await service.processJob({ _id: new Types.ObjectId(jobId), requestedBy: actorId, videoId, curriculumVersion: 'approved-version', sourceHash: 'hash', attempts: 1 });
    expect(jobs.updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: new Types.ObjectId(jobId), status: 'processing' }), expect.objectContaining({ $set: expect.objectContaining({ status: 'queued', nextAttemptAt: expect.any(Date) }) }));
  });
  it.each([new OpenAiBudgetException('limit'), new OpenAiBudgetException('unavailable'), new OpenAiTranscriptionException(false)])('does not retry a budget denial or permanent provider failure', async error => {
    jest.spyOn(service as any, 'scopeVersion').mockReturnValue('approved-version');
    jest.spyOn(service as any, 'extract').mockRejectedValue(error);
    await service.processJob({ _id: new Types.ObjectId(jobId), requestedBy: actorId, videoId, curriculumVersion: 'approved-version', sourceHash: 'hash', attempts: 1 });
    expect(jobs.updateOne).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'processing' }), expect.objectContaining({ $set: expect.objectContaining({ status: 'failed' }) }));
    expect(jobs.updateOne.mock.calls.some(call => call[1]?.$set?.nextAttemptAt)).toBe(false);
  });
  it('does no provider work after another worker or deletion takes the claim', async () => {
    jest.spyOn(service as any, 'scopeVersion').mockReturnValue('approved-version');
    jobs.updateOne.mockReturnValue(chain({ matchedCount: 0 }));
    const extract = jest.spyOn(service as any, 'extract');
    await service.processJob({ _id: new Types.ObjectId(jobId), requestedBy: actorId, videoId, curriculumVersion: 'approved-version', sourceHash: 'hash', attempts: 1, claimToken: 'stale' });
    expect(extract).not.toHaveBeenCalled();
    expect(jobs.updateOne.mock.calls.some(call => call[1]?.$set?.status)).toBe(false);
  });
  it('sweeps expired final attempts even when a provider is unavailable', async () => {
    jest.spyOn(service, 'capabilities').mockReturnValue({ uploadReady: false, summaryReady: false, maxUploadMb: 256, maxDurationMinutes: 60, sampledFrameLimit: 12 });
    await service.pump();
    expect(jobs.updateMany).toHaveBeenCalledWith(expect.objectContaining({ attempts: { $gte: 2 } }), expect.objectContaining({ $set: expect.objectContaining({ status: 'failed' }) }));
    expect(jobs.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('forwards the exact audio segment and duration through the budgeted provider', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'atlas-video-test-'));
    try {
      const path = join(dir, 'audio.mp3');
      const audio = Buffer.from('segment-fixture');
      await writeFile(path, audio);
      ai.transcribeAudio.mockResolvedValue('Ders kaydı');
      await expect((service as any).transcribe(path, 35.5)).resolves.toBe('Ders kaydı');
      expect(ai.transcribeAudio).toHaveBeenCalledWith(audio, 35.5);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('does not release a generated summary unless evidence and curriculum checks both pass', async () => {
    jest.spyOn(service as any, 'scopeVersion').mockReturnValue('approved-version');
    jest.spyOn(service as any, 'extract').mockResolvedValue({ transcript: '[0–90 saniye] İki üzeri üç sekizdir.', frames: [], audioMinutes: 2 });
    jest.spyOn(service as any, 'analyze').mockResolvedValue({ overview: 'Özet', sections: [], keyPoints: [], excludedContentNote: '', coverage: { note: '' } });
    ai.chatStructured.mockResolvedValue({ grounded: false, confidence: .95 });
    await service.processJob({ _id: new Types.ObjectId(jobId), requestedBy: actorId, videoId, curriculumVersion: 'approved-version', sourceHash: 'hash', attempts: 1 });
    expect(curriculum.verifyContent).not.toHaveBeenCalled(); expect(jobs.updateOne.mock.calls.some(call => (call[1] as any)?.$set?.summary)).toBe(false);
  });
  it('routes summary generation and independent evidence review through the quality model before publishing', async () => {
    const content = { transcript: '[0–90 saniye] İki üzeri üç sekizdir.', frames: [{ seconds: 45, dataUrl: 'data:image/jpeg;base64,fixture' }], audioMinutes: 2 };
    const generated = {
      overview: 'İki sayısının üçüncü kuvveti sekizdir.',
      sections: [{ title: 'Tam sayı kuvveti', summary: 'İki üzeri üç sekizdir.', outcomeIds: ['approved:0'], timestampSeconds: 0 }],
      keyPoints: ['İki üzeri üç sekizdir.'], excludedContentNote: '',
    };
    jest.spyOn(service as any, 'scopeVersion').mockReturnValue('approved-version');
    jest.spyOn(service as any, 'extract').mockResolvedValue(content);
    ai.chatStructured.mockResolvedValueOnce(generated).mockResolvedValueOnce({ grounded: true, confidence: .95 });

    await service.processJob({ _id: new Types.ObjectId(jobId), requestedBy: actorId, videoId, curriculumVersion: 'approved-version', sourceHash: 'hash', attempts: 1 });

    expect(ai.chatStructured).toHaveBeenNthCalledWith(1, expect.objectContaining({
      model: 'gpt-6-sol', images: [content.frames[0].dataUrl], user: expect.stringContaining(content.transcript),
    }), expect.any(Object), 'atlas_lesson_video_summary');
    expect(ai.chatStructured).toHaveBeenNthCalledWith(2, expect.objectContaining({
      model: 'gpt-6-sol', images: [content.frames[0].dataUrl], user: expect.stringContaining(generated.overview),
    }), expect.any(Object), 'atlas_lesson_video_evidence');
    expect(curriculum.verifyContent).toHaveBeenCalledWith(approved, expect.stringContaining(generated.overview), ['approved:0']);
    expect(jobs.updateOne).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'processing' }), expect.objectContaining({
      $set: expect.objectContaining({ status: 'completed', summary: expect.objectContaining({ overview: generated.overview }) }),
    }));
  });
  it('rechecks worker access before extracting a queued lesson', async () => {
    enrollments.find.mockReturnValue(chain([]));
    const extract = jest.spyOn(service as any, 'extract');
    await service.processJob({ _id: new Types.ObjectId(jobId), requestedBy: actorId, videoId, curriculumVersion: 'approved-version', sourceHash: 'hash', attempts: 1 });
    expect(extract).not.toHaveBeenCalled(); expect(ai.chatStructured).not.toHaveBeenCalled();
    expect(jobs.updateOne.mock.calls.some(call => (call[1] as any)?.$set?.summary)).toBe(false);
  });
  it('withholds a finished analysis if curriculum changed while the worker ran', async () => {
    jest.spyOn(service as any, 'scopeVersion').mockReturnValueOnce('approved-version').mockReturnValueOnce('new-version');
    jest.spyOn(service as any, 'extract').mockResolvedValue({ transcript: '[0–90 saniye] İki üzeri üç sekizdir.', frames: [], audioMinutes: 2 });
    jest.spyOn(service as any, 'analyze').mockResolvedValue({ overview: 'Özet', sections: [], keyPoints: [], excludedContentNote: '', coverage: { note: '' } });
    ai.chatStructured.mockResolvedValue({ grounded: true, confidence: .95 });
    await service.processJob({ _id: new Types.ObjectId(jobId), requestedBy: actorId, videoId, curriculumVersion: 'approved-version', sourceHash: 'hash', attempts: 1 });
    expect(curriculum.verifyContent).toHaveBeenCalled(); expect(jobs.updateOne.mock.calls.some(call => (call[1] as any)?.$set?.summary)).toBe(false);
  });
  it('uses a persistent atomic quota before scheduling a different lesson', async () => {
    jest.spyOn(service, 'capabilities').mockReturnValue({ uploadReady: true, summaryReady: true, maxUploadMb: 256, maxDurationMinutes: 60, sampledFrameLimit: 12 });
    quotas.findOneAndUpdate.mockReturnValue({ ...chain(null), exec: jest.fn().mockRejectedValue({ code: 11000 }) });
    await expect(service.requestSummary(actorId, videoId)).rejects.toThrow('Günlük ders özeti sınırına');
    expect(jobs.create).not.toHaveBeenCalled();
  });
  it('enforces unique job and quota indexes when production autoIndex is disabled', async () => {
    jest.spyOn(service, 'pump').mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(jobs.createIndexes).toHaveBeenCalled(); expect(quotas.createIndexes).toHaveBeenCalled(); service.onModuleDestroy();
  });
});

describe('lesson video persistent storage', () => {
  it('does not silently use the working directory or an unmounted configured directory in production', () => {
    expect(videoStorageRoot(true)).toBeNull();
    expect(videoStorageRoot(true, 'relative/videos', '/var/data')).toBeNull();
    expect(videoStorageRoot(true, '/atlas-unmounted/videos', '/atlas-unmounted')).toBeNull();
  });
  it('recognizes a dedicated volume but not an ephemeral mount or root filesystem', () => {
    const mounts = '1 0 0:1 / / rw - overlay overlay rw\n2 1 0:2 / /var/atlas\\040disk rw - ext4 /dev/disk rw\n3 1 0:3 / /var/temp rw - tmpfs tmpfs rw';
    expect(hasPersistentVideoMount('/var/atlas disk', mounts)).toBe(true);
    expect(hasPersistentVideoMount('/var/temp', mounts)).toBe(false);
    expect(hasPersistentVideoMount('/', mounts)).toBe(false);
  });
});

describe('lessonByteRange', () => {
  it('supports full reads, suffix ranges and capped end ranges', () => {
    expect(lessonByteRange(undefined, 100)).toBeNull(); expect(lessonByteRange('bytes=10-200', 100)).toEqual({ start: 10, end: 99 }); expect(lessonByteRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
  });
  it.each(['bytes=100-101', 'bytes=-0', 'bytes=20-10', 'bytes=0-1,4-5', 'bytes=-', 'bytes=9007199254740993-'])('rejects invalid or unsupported range %s', value => { expect(() => lessonByteRange(value, 100)).toThrow(BadRequestException); });
});
