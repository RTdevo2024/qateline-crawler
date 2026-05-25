/**
 * queues.ts — تعریف BullMQ Queue های پروژه
 *
 * سه صف اصلی:
 *   crawlQueue   — کرال صفحات محصول
 *   aiQueue      — پردازش AI
 *   publishQueue — انتشار در قطعه‌لاین
 *
 * توجه مهم circular dependency:
 *   این فایل از jobs.ts فقط با `import type` استفاده می‌کند.
 *   در runtime هیچ import ی از jobs.ts نیست → circular dep وجود ندارد.
 */

import { Queue } from 'bullmq';
import { createRedisConnection } from './connection';
// import type → فقط TypeScript، در runtime پاک می‌شود
import type { CrawlJobData, AIJobData, PublishJobData } from './jobs';

// ─────────────────────────────────────────────────────────────────────────────
// تنظیمات پیش‌فرض job
// ─────────────────────────────────────────────────────────────────────────────

const defaultJobOptions = {
  /** تعداد تلاش‌های مجدد در صورت شکست */
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    /** تاخیر اولیه بین retry ها — میلی‌ثانیه */
    delay: 5_000,
  },
  /** نگه داشتن آخرین ۱۰۰ job موفق در Redis */
  removeOnComplete: { count: 100 },
  /** نگه داشتن آخرین ۵۰۰ job ناموفق برای بررسی */
  removeOnFail: { count: 500 },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Queue Instances
// هر Queue اتصال Redis مجزای خودش را دارد (BullMQ best practice)
// ─────────────────────────────────────────────────────────────────────────────

let _crawlQueue: Queue<CrawlJobData> | undefined;
let _aiQueue: Queue<AIJobData> | undefined;
let _publishQueue: Queue<PublishJobData> | undefined;

/** crawlQueue — صف job های کرال */
export function getCrawlQueue(): Queue<CrawlJobData> {
  if (_crawlQueue === undefined) {
    _crawlQueue = new Queue<CrawlJobData>('crawl', {
      connection: createRedisConnection(),
      defaultJobOptions,
    });
  }
  return _crawlQueue;
}

/** aiQueue — صف job های پردازش AI */
export function getAIQueue(): Queue<AIJobData> {
  if (_aiQueue === undefined) {
    _aiQueue = new Queue<AIJobData>('ai', {
      connection: createRedisConnection(),
      defaultJobOptions,
    });
  }
  return _aiQueue;
}

/** publishQueue — صف job های انتشار */
export function getPublishQueue(): Queue<PublishJobData> {
  if (_publishQueue === undefined) {
    _publishQueue = new Queue<PublishJobData>('publish', {
      connection: createRedisConnection(),
      defaultJobOptions,
    });
  }
  return _publishQueue;
}

/** closeAllQueues — اتصالات همه Queue ها را می‌بندد (برای graceful shutdown) */
export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    _crawlQueue?.close(),
    _aiQueue?.close(),
    _publishQueue?.close(),
  ]);
  _crawlQueue = undefined;
  _aiQueue = undefined;
  _publishQueue = undefined;
}
