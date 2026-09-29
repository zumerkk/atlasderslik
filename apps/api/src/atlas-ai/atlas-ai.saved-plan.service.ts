import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import type { AtlasSavedPlanResponse, AtlasStudyPlan } from '@repo/shared';
import { AtlasSavedPlan, AtlasSavedPlanDocument } from './atlas-ai.saved-plan.schema';

const stalePlan = () => new ConflictException(
  'Çalışma planı değişmiş veya erişim kapsamın güncellenmiş. Güncel planı yeniden aç.',
);

@Injectable()
export class AtlasSavedPlanService implements OnModuleInit {
  constructor(
    @InjectModel(AtlasSavedPlan.name)
    private readonly plans: Model<AtlasSavedPlanDocument>,
  ) {}

  async onModuleInit() {
    // Await the owner/student uniqueness guarantee before serving first saves,
    // including deployments that disable Mongoose's automatic index creation.
    await this.plans.createIndexes();
  }

  private owner(ownerId: string, studentId: string) {
    return {
      ownerId: new Types.ObjectId(ownerId),
      studentId: new Types.ObjectId(studentId),
    };
  }

  private response(row: Pick<AtlasSavedPlan, 'plan' | 'completedBlockIds' | 'updatedAt'> | null): AtlasSavedPlanResponse {
    return {
      plan: row?.plan ?? null,
      completedBlockIds: row?.completedBlockIds ?? [],
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  }

  async load(ownerId: string, studentId: string, accessScope: string): Promise<AtlasSavedPlanResponse> {
    const row = await this.plans.findOne({ ...this.owner(ownerId, studentId), accessScope }).lean().exec();
    return this.response(row);
  }

  async save(ownerId: string, plan: AtlasStudyPlan, accessScope: string): Promise<AtlasSavedPlanResponse & { plan: AtlasStudyPlan }> {
    // A fresh revision also distinguishes plans generated within the same millisecond.
    const savedPlan = { ...plan, id: `atlas-plan-${randomUUID()}` };
    const filter = this.owner(ownerId, plan.studentId);
    const update = { $set: { plan: savedPlan, accessScope, completedBlockIds: [] } };
    let row: AtlasSavedPlan | null;
    try {
      row = await this.plans.findOneAndUpdate(filter, update, { new: true, upsert: true, runValidators: true }).lean().exec();
    } catch (error) {
      // Concurrent first-time creation is resolved against the unique owner/student row.
      if (error?.code !== 11000) throw error;
      row = await this.plans.findOneAndUpdate(filter, update, { new: true, runValidators: true }).lean().exec();
    }
    if (!row) throw stalePlan();
    return { ...this.response(row), plan: row.plan };
  }

  async updateProgress(
    ownerId: string,
    studentId: string,
    accessScope: string,
    planId: string,
    blockId: string,
    completed: boolean,
  ): Promise<AtlasSavedPlanResponse> {
    const filter = { ...this.owner(ownerId, studentId), accessScope, 'plan.id': planId };
    const current = await this.plans.findOne(filter).lean().exec();
    if (!current) throw stalePlan();
    const block = current.plan.days.flatMap((day) => day.blocks).find((item) => item.id === blockId);
    if (!block || block.kind === 'break') {
      throw new BadRequestException('Bu çalışma planından geçerli bir çalışma adımı seç.');
    }
    // Set membership is idempotent and preserves edits to other blocks from another tab.
    const change = completed
      ? { $addToSet: { completedBlockIds: blockId } }
      : { $pull: { completedBlockIds: blockId } };
    const updated = await this.plans.findOneAndUpdate(filter, change, { new: true, runValidators: true }).lean().exec();
    if (!updated) throw stalePlan();
    return this.response(updated);
  }
}
