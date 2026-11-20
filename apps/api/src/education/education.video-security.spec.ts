import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@repo/shared';
import { Types } from 'mongoose';
import { EducationService } from './education.service';

const teacherId = '507f1f77bcf86cd799439011';
const otherId = '507f1f77bcf86cd799439012';
const gradeId = '507f1f77bcf86cd799439013';
const subjectId = '507f1f77bcf86cd799439014';
const videoId = '507f1f77bcf86cd799439015';
const query = (value: any) => { const q: any = { exec: jest.fn().mockResolvedValue(value) }; for (const method of ['select', 'lean', 'populate']) q[method] = jest.fn().mockReturnValue(q); return q; };
const model = () => ({ findById: jest.fn(() => query(null)), exists: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}), findByIdAndUpdate: jest.fn(() => query({})), findByIdAndDelete: jest.fn(() => query({})) });

describe('Education legacy video endpoint security', () => {
  let service: EducationService;
  let models: ReturnType<typeof model>[];
  const payload = { title: 'Ders anlatımı', description: 'Konu tekrarı', videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk', gradeId, subjectId };
  beforeEach(() => {
    models = Array.from({ length: 15 }, model);
    service = new (EducationService as any)(...models);
    models[14].findById.mockReturnValue(query({ _id: new Types.ObjectId(teacherId), role: UserRole.TEACHER, isActive: true }));
    models[0].findById.mockReturnValue(query({ _id: new Types.ObjectId(gradeId), level: 8, isActive: true }));
    models[1].findById.mockReturnValue(query({ _id: new Types.ObjectId(subjectId), gradeLevel: 8, isActive: true }));
    models[8].exists.mockResolvedValue({ _id: subjectId });
    models[5].findById.mockReturnValue(query({ _id: new Types.ObjectId(videoId), teacherId: new Types.ObjectId(teacherId), gradeId: new Types.ObjectId(gradeId), subjectId: new Types.ObjectId(subjectId), source: 'link' }));
  });
  it('rejects forged private upload storage attributes before creating a record', async () => {
    await expect(service.createVideo({ ...payload, source: 'upload', storageKey: '../../private-file' }, teacherId)).rejects.toBeInstanceOf(BadRequestException);
    expect(models[5].create).not.toHaveBeenCalled();
  });
  it('saves the authenticated teacher identity and ignores unrelated client fields', async () => {
    await service.createVideo({ ...payload, teacherId: otherId, views: 999999 }, teacherId);
    expect(models[5].create).toHaveBeenCalledWith(expect.objectContaining({ teacherId: new Types.ObjectId(teacherId), source: 'link' }));
    expect(models[5].create.mock.calls[0][0]).not.toHaveProperty('views');
  });
  it('requires a current assignment to the selected grade and subject', async () => {
    models[8].exists.mockResolvedValue(null);
    await expect(service.createVideo(payload, teacherId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(models[5].create).not.toHaveBeenCalled();
  });
  it('rejects a mismatched grade hierarchy', async () => {
    models[1].findById.mockReturnValue(query({ _id: new Types.ObjectId(subjectId), gradeLevel: 7, isActive: true }));
    await expect(service.createVideo(payload, teacherId)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('denies editing and deleting another teacher video', async () => {
    models[5].findById.mockReturnValue(query({ teacherId: new Types.ObjectId(otherId), source: 'link' }));
    await expect(service.updateVideo(videoId, { title: 'Changed' }, teacherId)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteVideo(videoId, teacherId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(models[5].findByIdAndUpdate).not.toHaveBeenCalled(); expect(models[5].findByIdAndDelete).not.toHaveBeenCalled();
  });
  it('prevents legacy endpoints editing or deleting private uploaded records', async () => {
    models[5].findById.mockReturnValue(query({ teacherId: new Types.ObjectId(teacherId), source: 'upload' }));
    await expect(service.updateVideo(videoId, { videoUrl: 'https://evil.example' }, teacherId)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.deleteVideo(videoId, teacherId)).rejects.toBeInstanceOf(BadRequestException);
    expect(models[5].findByIdAndUpdate).not.toHaveBeenCalled(); expect(models[5].findByIdAndDelete).not.toHaveBeenCalled();
  });
});
