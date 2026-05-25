/**
 * jobs.ts — تعریف انواع داده‌های job و توابع enqueue
 *
 * جریان pipeline:
 *   enqueueCrawl → crawl-worker → enqueueAI → ai-worker → (review) → enqueuePublish → publish-worker
 *
 * توجه: queues.ts این فایل را فقط با import type وارد می‌کند
 *       تا از circular dependency در runtime جلوگیری شود.
 */

import type { Job } from 'bullmq';
import { getCrawlQueue, getAIQueue, getPublishQueue } from './queues';

// ─────────────────────────────────────────────────────────────────────────────
// Job Data Types
// ─────────────────────────────────────────────────────────────────────────────

/** داده‌های job کرال — شناسه محصول در DB و URL مبدا */
export interface CrawlJobData {
  /** شناسه CrawledProduct در دیتابیس */
  crawledProductId: string;
  /** URL صفحه محصول که باید کرال شود */
  sourceUrl: string;
}

/** داده‌های job پردازش AI */
export interface AIJobData {
  /** شناسه CrawledProduct در دیتابیس */
  crawledProductId: string;
}

/** داده‌های job انتشار در قطعه‌لاین */
export interface PublishJobData {
  /** شناسه CrawledProduct در دیتابیس */
  crawledProductId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Enqueue Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * enqueueCrawl — یک job کرال به crawlQueue اضافه می‌کند.
 *
 * پیش‌نیاز: CrawledProduct با این ID باید از قبل در DB وجود داشته باشد.
 */
export async function enqueueCrawl(data: CrawlJobData): Promise<Job<CrawlJobData>> {
  return getCrawlQueue().add('crawl', data);
}

/**
 * enqueueAI — یک job پردازش AI به aiQueue اضافه می‌کند.
 *
 * پیش‌نیاز: CrawledProduct باید rawData داشته باشد (status = RAW).
 */
export async function enqueueAI(data: AIJobData): Promise<Job<AIJobData>> {
  return getAIQueue().add('ai', data);
}

/**
 * enqueuePublish — یک job انتشار به publishQueue اضافه می‌کند.
 *
 * پیش‌نیاز: اپراتور محصول را review و تایید کرده باشد (status = REVIEWED).
 */
export async function enqueuePublish(data: PublishJobData): Promise<Job<PublishJobData>> {
  return getPublishQueue().add('publish', data);
}
