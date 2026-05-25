/**
 * publish-worker.ts — Worker انتشار محصول در قطعه‌لاین
 *
 * جریان هر job:
 *   1. خواندن CrawledProduct از DB (باید processedData داشته باشد)
 *   2. validate کردن rawData و processedData
 *   3. آماده‌سازی داده‌های inventory از rawData
 *   4. انتشار با Publisher در قطعه‌لاین
 *   5. ذخیره UUID های محصول و موجودی — status = "PUBLISHED"
 *
 * پیش‌نیاز: اپراتور محصول را review و تایید کرده (status = REVIEWED).
 *           در صورت PROCESSED بودن هم پردازش می‌شود (برای انعطاف بیشتر).
 */

import { Worker, type Job } from 'bullmq';
import { z } from 'zod';
import { createRedisConnection } from '@/lib/queue/connection';
import type { PublishJobData } from '@/lib/queue/jobs';
import { prisma } from '@/lib/db/prisma';
import { getPublisher } from '@/lib/ghateline';
import { CrawledProductDataSchema } from '@/types/crawler';
import { AIProcessingOutputSchema } from '@/types/ai';

// ─────────────────────────────────────────────────────────────────────────────
// Schema برای validate کردن processedData از DB
// ─────────────────────────────────────────────────────────────────────────────

const ProcessedProductDataSchema = z.object({
  output: AIProcessingOutputSchema,
  meta: z.object({
    model: z.string(),
    inputTokens: z.number(),
    outputTokens: z.number(),
    durationMs: z.number(),
    processedAt: z.string(),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Job Processor
// ─────────────────────────────────────────────────────────────────────────────

async function processPublishJob(job: Job<PublishJobData>): Promise<void> {
  const { crawledProductId } = job.data;

  await job.log(`[publish] شروع انتشار: ${crawledProductId}`);

  // ۱. خواندن محصول از DB
  const product = await prisma.crawledProduct.findUnique({
    where: { id: crawledProductId },
  });

  if (!product) {
    throw new Error(`CrawledProduct یافت نشد: ${crawledProductId}`);
  }

  if (product.rawData === null) {
    throw new Error(`rawData خالی است — محصول ${crawledProductId} هنوز کرال نشده`);
  }

  if (product.processedData === null) {
    throw new Error(
      `processedData خالی است — محصول ${crawledProductId} هنوز AI پردازش نشده`,
    );
  }

  await job.updateProgress(10);
  await job.log(`[publish] داده‌ها موجود — شروع validation`);

  // ۲. validate rawData
  const rawDataResult = CrawledProductDataSchema.safeParse(product.rawData);
  if (!rawDataResult.success) {
    throw new Error(`rawData نامعتبر: ${rawDataResult.error.message}`);
  }
  const rawData = rawDataResult.data;

  // ۳. validate processedData
  const processedDataResult = ProcessedProductDataSchema.safeParse(
    product.processedData,
  );
  if (!processedDataResult.success) {
    throw new Error(
      `processedData نامعتبر: ${processedDataResult.error.message}`,
    );
  }
  const processedData = processedDataResult.data;

  await job.updateProgress(20);
  await job.log(`[publish] validation موفق — آماده‌سازی داده‌های انتشار`);

  // ۴. آماده‌سازی inventory از rawData
  //    اگر originalPrice وجود دارد → قیمت اصلی و تخفیف‌دار جدا می‌شوند
  const hasDiscount = rawData.inventory.originalPrice !== undefined;
  const inventoryData = {
    price: hasDiscount
      ? rawData.inventory.originalPrice! // قیمت اصلی (بالاتر)
      : rawData.inventory.price,
    discount_price: hasDiscount
      ? rawData.inventory.price // قیمت با تخفیف (پایین‌تر)
      : undefined,
    count: rawData.inventory.quantity ?? 1,
  };

  await job.log(
    `[publish] قیمت: ${inventoryData.price.toLocaleString()} ریال — موجودی: ${inventoryData.count} عدد`,
  );

  // ۵. انتشار در قطعه‌لاین
  const publisher = getPublisher();
  let publishResult: Awaited<ReturnType<typeof publisher.publishProduct>>;

  try {
    publishResult = await publisher.publishProduct({
      aiOutput: processedData.output,
      inventory: inventoryData,
      images: rawData.product.images,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.crawledProduct.update({
      where: { id: crawledProductId },
      data: {
        status: 'FAILED',
        errorMessage: `انتشار ناموفق: ${message}`,
      },
    });
    throw err;
  }

  await job.updateProgress(90);
  await job.log(
    `[publish] انتشار موفق — product_uuid: ${publishResult.productUuid}`,
  );

  // ۶. ذخیره UUID ها — status = PUBLISHED
  await prisma.crawledProduct.update({
    where: { id: crawledProductId },
    data: {
      ghatelineProductUuid: publishResult.productUuid,
      ghatelineInventoryUuid: publishResult.inventoryUuid,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      errorMessage: null,
    },
  });

  await job.updateProgress(100);
  await job.log(
    `[publish] ✓ انتشار کامل شد — product: ${publishResult.productUuid} | inventory: ${publishResult.inventoryUuid}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createPublishWorker — PublishWorker را می‌سازد و شروع می‌کند.
 *
 * concurrency: 1 — انتشار یکی یکی (جلوگیری از flood در API قطعه‌لاین)
 */
export function createPublishWorker(): Worker<PublishJobData> {
  const worker = new Worker<PublishJobData>('publish', processPublishJob, {
    connection: createRedisConnection(),
    concurrency: 1,
  });

  worker.on('completed', (job) => {
    console.log(
      `[PublishWorker] ✓ Job ${job.id ?? '?'} تمام شد — محصول منتشر شد`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[PublishWorker] ✗ Job ${job?.id ?? '?'} شکست خورد: ${err.message}`,
    );
  });

  worker.on('error', (err) => {
    console.error('[PublishWorker] خطای worker:', err.message);
  });

  console.log('[PublishWorker] ▶ شروع به کار — concurrency: 1');
  return worker;
}
