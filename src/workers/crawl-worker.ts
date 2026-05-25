/**
 * crawl-worker.ts — Worker کرال با error handling کامل و پشتیبانی از PARTIAL status
 *
 * وضعیت‌های ممکن بعد از اجرای هر job:
 *
 *   ✅ موفق کامل:
 *      crawler.crawl() → CrawledProductData
 *      status = RAW, rawAt = now, enqueueAI()
 *
 *   ⚡ موفق جزئی (صفحه کاملاً لود نشد ولی data کامل است):
 *      BrowserFetcher timeout → extract از partial HTML موفق
 *      status = RAW (مثل موفق کامل — data هست، به AI نیاز داریم)
 *
 *   ⚠ کرال جزئی (صفحه لود نشد، extraction هم شکست):
 *      PartialFetchError re-thrown از BaseAdapter
 *      status = PARTIAL — job به موفقیت تمام می‌شود (no BullMQ retry)
 *      اپراتور می‌تواند دستی retry کند از پنل
 *
 *   ❌ شکست کامل (شبکه، bot-block، خطای غیرمنتظره):
 *      FetchError یا ParseError یا خطای دیگر
 *      status = FAILED — job throw می‌کند → BullMQ تا ۳ بار retry می‌کند
 */

import { Worker, type Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { createRedisConnection } from '@/lib/queue/connection';
import type { CrawlJobData } from '@/lib/queue/jobs';
import { enqueueAI } from '@/lib/queue/jobs';
import { prisma } from '@/lib/db/prisma';
import { Crawler } from '@/lib/crawler/core/crawler';
import { PartialFetchError } from '@/lib/crawler/core/errors';
// side-effect: ثبت همه adapter ها در registry
import '@/lib/crawler/adapters/index';

// singleton Crawler — یک instance برای همه job ها
const crawler = new Crawler();

// ─────────────────────────────────────────────────────────────────────────────
// Job Processor
// ─────────────────────────────────────────────────────────────────────────────

async function processCrawlJob(job: Job<CrawlJobData>): Promise<void> {
  const { crawledProductId, sourceUrl } = job.data;

  await job.log(`[crawl] شروع — url: ${sourceUrl} | id: ${crawledProductId}`);

  // ۱. خواندن record از DB
  const product = await prisma.crawledProduct.findUnique({
    where: { id: crawledProductId },
  });

  if (!product) {
    throw new Error(`CrawledProduct یافت نشد: ${crawledProductId}`);
  }

  await job.updateProgress(10);
  await job.log(`[crawl] محصول در DB یافت شد (attempt ${job.attemptsMade + 1})`);

  // ۲. کرال URL
  let rawData: unknown;

  try {
    rawData = await crawler.crawl(sourceUrl);
    // موفق (کامل یا partial HTML که extraction از آن کار کرد)
  } catch (err) {
    // ─── PartialFetchError: صفحه جزئی لود شد، extraction هم ناموفق ───────
    if (err instanceof PartialFetchError) {
      await handlePartialCrawl(job, crawledProductId, err);
      return; // job موفق تمام می‌شود — no BullMQ retry
    }

    // ─── سایر خطاها: FAILED → BullMQ retry ─────────────────────────────
    const message = err instanceof Error ? err.message : String(err);
    await job.log(`[crawl] ✗ خطای کرال: ${message}`);

    await prisma.crawledProduct.update({
      where: { id: crawledProductId },
      data: {
        status: 'FAILED',
        errorMessage: `کرال ناموفق (attempt ${job.attemptsMade + 1}): ${message}`,
      },
    });

    throw err; // re-throw → BullMQ retry
  }

  await job.updateProgress(80);
  await job.log(`[crawl] ✓ کرال موفق — ذخیره rawData`);

  // ۳. ذخیره rawData — status = RAW
  await prisma.crawledProduct.update({
    where: { id: crawledProductId },
    data: {
      rawData: rawData as Prisma.InputJsonValue,
      status: 'RAW',
      rawAt: new Date(),
      errorMessage: null,
    },
  });

  await job.updateProgress(90);
  await job.log(`[crawl] rawData ذخیره شد — enqueue job AI`);

  // ۴. enqueue job AI
  const aiJob = await enqueueAI({ crawledProductId });

  await job.updateProgress(100);
  await job.log(`[crawl] ✓ job AI enqueue شد: ${aiJob.id ?? '?'}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// handlePartialCrawl — مدیریت کرال جزئی (PARTIAL status)
// ─────────────────────────────────────────────────────────────────────────────

async function handlePartialCrawl(
  job: Job<CrawlJobData>,
  crawledProductId: string,
  err: PartialFetchError,
): Promise<void> {
  const { sourceUrl } = job.data;
  const chars = err.partialHtml.length;

  await job.log(
    `[crawl] ⚠ PARTIAL — صفحه کاملاً لود نشد و extraction ناموفق (${chars} chars partial HTML)`,
  );
  await job.log(
    `[crawl]   url: ${sourceUrl} | دلیل: ${err.message}`,
  );

  // cast لازم است تا prisma generate برای PARTIAL enum value اجرا شود
  // بعد از اجرای `npx prisma generate` این cast برداشته می‌شود
  type AnyStatus = Parameters<typeof prisma.crawledProduct.update>[0]['data']['status'];
  await prisma.crawledProduct.update({
    where: { id: crawledProductId },
    data: {
      status: 'PARTIAL' as AnyStatus,
      errorMessage: [
        `کرال جزئی: ${err.message}`,
        `HTML جزئی دریافت شد: ${chars} کاراکتر`,
        `اپراتور می‌تواند دستی retry کند یا این محصول را رد کند`,
      ].join(' | '),
    },
  });

  console.warn(
    `[CrawlWorker] ⚠ Job ${job.id ?? '?'} — PARTIAL: ${sourceUrl} (${chars} chars partial)`,
  );
  // return (no throw) → job به عنوان موفق ثبت می‌شود — بدون BullMQ retry
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createCrawlWorker — CrawlWorker را می‌سازد و شروع می‌کند.
 *
 * concurrency: 3 — سه URL همزمان کرال می‌شوند.
 * هر Worker اتصال Redis مجزا دارد (BullMQ best practice).
 *
 * timeout هر job:
 *   BrowserFetcher حداکثر 60+90=150s + retry delays = ~5 دقیقه
 */
export function createCrawlWorker(): Worker<CrawlJobData> {
  const worker = new Worker<CrawlJobData>('crawl', processCrawlJob, {
    connection: createRedisConnection(),
    concurrency: 3,
  });

  worker.on('completed', (job) => {
    console.log(
      `[CrawlWorker] ✓ Job ${job.id ?? '?'} کامل — ${job.data.sourceUrl}`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[CrawlWorker] ✗ Job ${job?.id ?? '?'} شکست — ${job?.data.sourceUrl ?? '?'}: ${err.message}`,
    );
  });

  worker.on('error', (err) => {
    console.error('[CrawlWorker] Worker error:', err.message);
  });

  console.log('[CrawlWorker] ▶ شروع — concurrency: 3');
  return worker;
}
