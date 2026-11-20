import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

const MICRO_USD = 1_000_000;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const LEDGER_ID = 'atlas-openai-trial';
const WRITE = { writeConcern: { w: 'majority' as const }, maxTimeMS: 5000 };

type Ledger = {
  _id: string;
  startedAt: Date;
  endsAt: Date;
  reservedMicros: number;
  requests: number;
};

export class OpenAiBudgetException extends HttpException {
  constructor(reason: 'limit' | 'unavailable') {
    super(
      reason === 'limit'
        ? 'AtlasAI kullanım bütçesi veya 30 günlük süre doldu. Yönetici kullanım durumunu kontrol edebilir.'
        : 'AtlasAI bütçe kontrolü şu anda kullanılamıyor. Biraz sonra tekrar deneyin.',
      reason === 'limit' ? 429 : 503,
    );
  }
}

/** One persisted allowance for every instance using the application database. */
@Injectable()
export class OpenAiBudgetService {
  private readonly logger = new Logger(OpenAiBudgetService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
  ) {}

  private get limitMicros() {
    const value = this.config.get<string>('ATLAS_OPENAI_BUDGET_USD')?.trim();
    if (!value) return 50 * MICRO_USD;
    if (!/^\d{1,2}(?:\.\d{1,6})?$/.test(value) || Number(value) > 50) return 0;
    return Math.round(Number(value) * MICRO_USD);
  }

  private collection() {
    if (!this.connection.db) throw new OpenAiBudgetException('unavailable');
    return this.connection.db.collection<Ledger>('atlas_openai_budget');
  }

  async reserve(micros: number) {
    const limit = this.limitMicros;
    if (!Number.isSafeInteger(micros) || micros < 1) throw new OpenAiBudgetException('unavailable');
    if (micros > limit) throw new OpenAiBudgetException('limit');
    try {
      const collection = this.collection();
      const now = new Date();
      try {
        await collection.updateOne({ _id: LEDGER_ID }, {
          $setOnInsert: { startedAt: now, endsAt: new Date(now.getTime() + WINDOW_MS), reservedMicros: 0, requests: 0 },
        }, { ...WRITE, upsert: true });
      } catch (error) {
        // Concurrent first requests can race to create the same unique _id.
        if ((error as { code?: number })?.code !== 11000) throw error;
      }
      const result = await collection.updateOne({
        _id: LEDGER_ID,
        $expr: { $gt: ['$endsAt', '$$NOW'] },
        reservedMicros: { $gte: 0, $lte: limit - micros },
      }, { $inc: { reservedMicros: micros, requests: 1 } }, WRITE);
      if (result.matchedCount !== 1) throw new OpenAiBudgetException('limit');
    } catch (error) {
      if (error instanceof OpenAiBudgetException) throw error;
      this.logger.warn('OpenAI budget reservation unavailable.');
      throw new OpenAiBudgetException('unavailable');
    }
  }

  /** Reconcile one confirmed text response; unknown usage retains the full reserve. */
  async settle(reserved: number, measured: number) {
    if (!Number.isSafeInteger(reserved) || !Number.isSafeInteger(measured) || reserved < 1 || measured < 1) return;
    const difference = measured - reserved;
    if (!difference) return;
    try {
      await this.collection().updateOne(
        { _id: LEDGER_ID, reservedMicros: { $gte: reserved } },
        { $inc: { reservedMicros: difference } }, WRITE,
      );
    } catch {
      // An unsuccessful release leaves a conservative charge. A failed
      // increase indicates estimated pricing drift and needs operator review.
      this.logger.warn('OpenAI budget reconciliation unavailable.');
    }
  }

  async status() {
    try {
      const entry = await this.collection().findOne({ _id: LEDGER_ID }, { maxTimeMS: 5000 });
      const limit = this.limitMicros;
      const consumed = entry?.reservedMicros ?? 0;
      const expired = !!entry && entry.endsAt.getTime() <= Date.now();
      return {
        state: !limit ? 'disabled' : expired ? 'expired' : consumed >= limit ? 'exhausted' : entry ? 'active' : 'not-started',
        limitUsd: limit / MICRO_USD,
        accountedUsd: consumed / MICRO_USD,
        remainingUsd: expired ? 0 : Math.max(0, limit - consumed) / MICRO_USD,
        startedAt: entry?.startedAt.toISOString() ?? null,
        endsAt: entry?.endsAt.toISOString() ?? null,
        requests: entry?.requests ?? 0,
      };
    } catch { throw new OpenAiBudgetException('unavailable'); }
  }
}
