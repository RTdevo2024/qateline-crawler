/**
 * ai-worker.ts — Worker پردازش AI
 *
 * جریان هر job:
 *   1. خواندن CrawledProduct از DB
 *   2. validate کردن rawData با Zod
 *   3. دریافت لیست دسته‌بندی‌ها از CategoryMapping
 *   4. پردازش با AIProcessor (OpenAI)
 *   5. ذخیره processedData — status = "PROCESSED"
 *
 * توجه: job انتشار enqueue نمی‌شود — اپراتور باید review کند.
 *       بعد از review و تایید، اپراتور دستی enqueuePublish می‌کند.
 */

import { Worker, type Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { createRedisConnection } from '@/lib/queue/connection';
import type { AIJobData } from '@/lib/queue/jobs';
import { prisma } from '@/lib/db/prisma';
import { AIProcessor } from '@/lib/ai/processor';
import { CrawledProductDataSchema } from '@/types/crawler';

// singleton AIProcessor
const aiProcessor = new AIProcessor();

// ─────────────────────────────────────────────────────────────────────────────
// Job Processor
// ─────────────────────────────────────────────────────────────────────────────

async function processAIJob(job: Job<AIJobData>): Promise<void> {
  const { crawledProductId } = job.data;

  await job.log(`[ai] شروع پردازش: ${crawledProductId}`);

  // ۱. خواندن record از DB
  const product = await prisma.crawledProduct.findUnique({
    where: { id: crawledProductId },
  });

  if (!product) {
    throw new Error(`CrawledProduct یافت نشد: ${crawledProductId}`);
  }

  if (product.rawData === null) {
    throw new Error(
      `rawData خالی است برای محصول ${crawledProductId} — ابتدا کرال انجام دهید`,
    );
  }

  await job.updateProgress(10);
  await job.log(`[ai] محصول یافت شد — validate کردن rawData`);

  // ۲. validate rawData با Zod
  const rawDataResult = CrawledProductDataSchema.safeParse(product.rawData);
  if (!rawDataResult.success) {
    const errMsg = `rawData نامعتبر: ${rawDataResult.error.message}`;
    await prisma.crawledProduct.update({
      where: { id: crawledProductId },
      data: { status: 'FAILED', errorMessage: errMsg },
    });
    throw new Error(errMsg);
  }

  const rawData = rawDataResult.data;
  await job.updateProgress(20);

  // ۳. دریافت دسته‌بندی‌ها از DB
  const mappings = await prisma.categoryMapping.findMany({
    select: { sourceCategoryText: true },
  });
  const categoriesList = mappings.map((m) => m.sourceCategoryText);

  await job.log(
    `[ai] ${categoriesList.length} دسته‌بندی یافت شد — شروع پردازش AI`,
  );
  await job.updateProgress(30);

  // ۴. پردازش با AIProcessor
  let processedData: Awaited<ReturnType<AIProcessor['processProduct']>>;
  try {
    processedData = await aiProcessor.processProduct(rawData, categoriesList);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.crawledProduct.update({
      where: { id: crawledProductId },
      data: {
        status: 'FAILED',
        errorMessage: `پردازش AI ناموفق: ${message}`,
      },
    });
    throw err;
  }

  await job.updateProgress(90);
  await job.log(
    `[ai] پردازش موفق — مدل: ${processedData.meta.model}, توکن: ${processedData.meta.inputTokens + processedData.meta.outputTokens}`,
  );

  // ۵. ذخیره processedData — status = PROCESSED
  //    job انتشار اینجا enqueue نمی‌شود — اپراتور باید review کند
  await prisma.crawledProduct.update({
    where: { id: crawledProductId },
    data: {
      processedData: processedData as unknown as Prisma.InputJsonValue,
      status: 'PROCESSED',
      processedAt: new Date(),
      errorMessage: null,
    },
  });

  await job.updateProgress(100);
  await job.log(
    `[ai] processedData ذخیره شد — منتظر review اپراتور (status: PROCESSED)`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createAIWorker — AIWorker را می‌سازد و شروع می‌کند.
 *
 * concurrency: 2 — دو پردازش AI همزمان (محدودیت rate limit OpenAI)
 */
export function createAIWorker(): Worker<AIJobData> {
  const worker = new Worker<AIJobData>('ai', processAIJob, {
    connection: createRedisConnection(),
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    console.log(
      `[AIWorker] ✓ Job ${job.id ?? '?'} تمام شد — status: PROCESSED (منتظر review)`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[AIWorker] ✗ Job ${job?.id ?? '?'} شکست خورد: ${err.message}`,
    );
  });

  worker.on('error', (err) => {
    console.error('[AIWorker] خطای worker:', err.message);
  });

  console.log('[AIWorker] ▶ شروع به کار — concurrency: 2');
  return worker;
}
