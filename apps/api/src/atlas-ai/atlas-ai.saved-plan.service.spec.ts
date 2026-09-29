import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { AtlasStudyPlan } from '@repo/shared';
import { AtlasSavedPlanService } from './atlas-ai.saved-plan.service';

const ownerId = '507f1f77bcf86cd799439011';
const studentId = '507f1f77bcf86cd799439012';
const query = (value: unknown) => ({ lean: () => ({ exec: jest.fn().mockResolvedValue(value) }) });
const plan: AtlasStudyPlan = {
  id: 'original', studentId, studentName: 'Deniz', createdAt: '2026-09-20T09:00:00Z',
  timezone: 'Europe/Istanbul', dailyMinutes: 30, title: 'Plan', summary: '', notes: [],
  days: [{ date: '2026-09-20', label: 'Bugün', blocks: [
    { id: 'work', startTime: '17:00', endTime: '17:25', minutes: 25, subject: 'Matematik', topic: 'Kesirler', activity: 'Soru çöz', kind: 'practice', reason: '' },
    { id: 'break', startTime: '17:25', endTime: '17:30', minutes: 5, subject: '', topic: '', activity: 'Mola', kind: 'break', reason: '' },
  ] }],
};

describe('Atlas saved plan persistence', () => {
  let model: any;
  let service: AtlasSavedPlanService;
  const record = (value = plan, completedBlockIds: string[] = []) => ({
    plan: value, completedBlockIds, updatedAt: new Date('2026-09-20T09:00:00Z'),
  });
  beforeEach(() => {
    model = {
      createIndexes: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(() => query(record())),
      findOneAndUpdate: jest.fn((_filter, update) => query(record(update.$set?.plan || plan, update.$set?.completedBlockIds || []))),
    };
    service = new AtlasSavedPlanService(model);
  });

  it('requires the unique owner/student index before accepting requests', async () => {
    await service.onModuleInit();
    expect(model.createIndexes).toHaveBeenCalledTimes(1);
    model.createIndexes.mockRejectedValue(new Error('Cannot guarantee unique owners'));
    await expect(service.onModuleInit()).rejects.toThrow('Cannot guarantee unique owners');
  });

  it('requires both account ownership and current authorization scope to load a plan', async () => {
    const result = await service.load(ownerId, studentId, 'PARENT');
    expect(model.findOne).toHaveBeenCalledWith({ ownerId: new Types.ObjectId(ownerId), studentId: new Types.ObjectId(studentId), accessScope: 'PARENT' });
    expect(result).toEqual({ plan, completedBlockIds: [], updatedAt: '2026-09-20T09:00:00.000Z' });
  });

  it('does not fall back to another owner or an earlier access scope when no plan matches', async () => {
    model.findOne.mockReturnValue(query(null));
    expect(await service.load(ownerId, studentId, 'new-teacher-scope')).toEqual({ plan: null, completedBlockIds: [], updatedAt: null });
    expect(model.findOne).toHaveBeenCalledTimes(1);
  });

  it('gives every replacement a unique revision and resets completion without mutating planner output', async () => {
    const first = await service.save(ownerId, plan, 'PARENT');
    const second = await service.save(ownerId, plan, 'PARENT');
    expect(first.plan.id).not.toBe(second.plan.id);
    expect(first.plan.id).not.toBe(plan.id);
    expect(plan.id).toBe('original');
    expect(model.findOneAndUpdate).toHaveBeenLastCalledWith(
      { ownerId: new Types.ObjectId(ownerId), studentId: new Types.ObjectId(studentId) },
      { $set: { plan: second.plan, accessScope: 'PARENT', completedBlockIds: [] } },
      expect.objectContaining({ upsert: true, new: true }),
    );
  });

  it('resolves simultaneous first saves through the unique owner/student record', async () => {
    model.findOneAndUpdate.mockImplementationOnce(() => ({ lean: () => ({ exec: jest.fn().mockRejectedValue({ code: 11000 }) }) }));
    await expect(service.save(ownerId, plan, 'PARENT')).resolves.toHaveProperty('plan.studentId', studentId);
    expect(model.findOneAndUpdate.mock.calls[1][2]).not.toHaveProperty('upsert');
  });

  it('uses atomic set membership for completion and undo so unrelated block edits are preserved', async () => {
    await service.updateProgress(ownerId, studentId, 'PARENT', plan.id, 'work', true);
    expect(model.findOneAndUpdate).toHaveBeenLastCalledWith(
      { ownerId: new Types.ObjectId(ownerId), studentId: new Types.ObjectId(studentId), accessScope: 'PARENT', 'plan.id': plan.id },
      { $addToSet: { completedBlockIds: 'work' } }, expect.objectContaining({ new: true }),
    );
    await service.updateProgress(ownerId, studentId, 'PARENT', plan.id, 'work', false);
    expect(model.findOneAndUpdate.mock.calls[1][1]).toEqual({ $pull: { completedBlockIds: 'work' } });
  });

  it.each(['break', 'not-a-block'])('rejects invalid completion target %s without a write', async (blockId) => {
    await expect(service.updateProgress(ownerId, studentId, 'PARENT', plan.id, blockId, true)).rejects.toBeInstanceOf(BadRequestException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a stale, missing, or foreign plan before changing progress', async () => {
    model.findOne.mockReturnValue(query(null));
    await expect(service.updateProgress(ownerId, studentId, 'PARENT', plan.id, 'work', true)).rejects.toBeInstanceOf(ConflictException);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a plan replaced between read and write instead of marking the new plan', async () => {
    model.findOneAndUpdate.mockReturnValue(query(null));
    await expect(service.updateProgress(ownerId, studentId, 'PARENT', plan.id, 'work', true)).rejects.toBeInstanceOf(ConflictException);
    expect(model.findOneAndUpdate.mock.calls[0][0]['plan.id']).toBe(plan.id);
  });
});
