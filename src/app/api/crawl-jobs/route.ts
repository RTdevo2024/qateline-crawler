/**
 * GET  /api/crawl-jobs — لیست crawl job ها با pagination و فیلتر
 * POST /api/crawl-jobs — ایجاد crawl job جدید و enqueue کردن در crawlQueue
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { enqueueCrawl } from '@/lib/queue/jobs';
import {
  apiHandler,
  ok,
  created,
  badRequest,
  PaginationSchema,
  getPaginationSkip,
  buildPaginationMeta,
  parseQuery,
} from '@/lib/api-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CrawlJobStatusEnum = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

const GetJobsQuerySchema = PaginationSchema.extend({
  status: CrawlJobStatusEnum.optional(),
  sourceSiteId: z.string().optional(),
});

const CreateJobSchema = z.object({
  sourceSiteId: z.string().min(1, 'sourceSiteId الزامی است'),
  urls: z
    .array(z.string().url('هر URL باید معتبر باشد'))
    .min(1, 'حداقل یک URL الزامی است')
    .max(500, 'حداکثر ۵۰۰ URL در یک job مجاز است'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/crawl-jobs */
export const GET = apiHandler(async (req: NextRequest) => {
  const { page, limit, status, sourceSiteId } = parseQuery(
    req.url,
    GetJobsQuerySchema,
  );

  const where = {
    ...(status !== undefined && { status }),
    ...(sourceSiteId !== undefined && { sourceSiteId }),
  };

  const [jobs, total] = await prisma.$transaction([
    prisma.crawlJob.findMany({
      where,
      skip: getPaginationSkip(page, limit),
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sourceSite: {
          select: { id: true, name: true, slug: true },
        },
        _count: { select: { products: true } },
      },
    }),
    prisma.crawlJob.count({ where }),
  ]);

  return ok({
    items: jobs,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

/** POST /api/crawl-jobs — ایجاد job جدید و enqueue کردن URL ها */
export const POST = apiHandler(async (req: NextRequest) => {
  const body: unknown = await req.json();
  const { sourceSiteId, urls } = CreateJobSchema.parse(body);

  // بررسی وجود سایت منبع
  const sourceSite = await prisma.sourceSite.findUnique({
    where: { id: sourceSiteId },
    select: { id: true, isActive: true },
  });
  if (!sourceSite) {
    return badRequest('سایت منبع با این شناسه وجود ندارد');
  }
  if (!sourceSite.isActive) {
    return badRequest('سایت منبع غیرفعال است');
  }

  // ─── ایجاد CrawlJob + CrawledProduct ها در یک transaction ───
  const job = await prisma.$transaction(async (tx) => {
    const newJob = await tx.crawlJob.create({
      data: {
        sourceSiteId,
        inputUrls: urls,
        status: 'PENDING',
        total: urls.length,
      },
    });

    // ایجاد یک CrawledProduct به ازای هر URL
    await tx.crawledProduct.createMany({
      data: urls.map((url) => ({
        crawlJobId: newJob.id,
        sourceUrl: url,
        status: 'RAW' as const,
      })),
    });

    return newJob;
  });

  // ─── Query محصولات ایجاد‌شده برای دریافت ID ها ───
  const products = await prisma.crawledProduct.findMany({
    where: { crawlJobId: job.id },
    select: { id: true, sourceUrl: true },
    orderBy: { createdAt: 'asc' },
  });

  // ─── Enqueue هر محصول در crawlQueue ───
  let enqueuedCount = 0;
  const enqueueErrors: string[] = [];

  await Promise.allSettled(
    products.map(async (product) => {
      try {
        await enqueueCrawl({
          crawledProductId: product.id,
          sourceUrl: product.sourceUrl,
        });
        enqueuedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        enqueueErrors.push(`${product.sourceUrl}: ${msg}`);
      }
    }),
  );

  return created({
    job: {
      id: job.id,
      sourceSiteId: job.sourceSiteId,
      status: job.status,
      total: job.total,
      createdAt: job.createdAt,
    },
    enqueued: enqueuedCount,
    failed: enqueueErrors.length,
    ...(enqueueErrors.length > 0 && { enqueueErrors }),
  });
});
