/**
 * GET /api/crawl-jobs/[id] — جزئیات و آمار یک crawl job
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { apiHandler, ok, notFound } from '@/lib/api-helpers';

type RouteContext = { params: { id: string } };

/** GET /api/crawl-jobs/[id] */
export const GET = apiHandler(async (_req: NextRequest, { params }: RouteContext) => {
  const { id } = params;

  const job = await prisma.crawlJob.findUnique({
    where: { id },
    include: {
      sourceSite: {
        select: { id: true, name: true, slug: true, baseUrl: true },
      },
    },
  });

  if (!job) return notFound('Job پیدا نشد');

  // ─── آمار بر اساس status محصولات ───
  const statusCounts = await prisma.crawledProduct.groupBy({
    by: ['status'],
    where: { crawlJobId: id },
    _count: { status: true },
  });

  const stats = statusCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count.status;
    return acc;
  }, {});

  return ok({
    ...job,
    stats: {
      total: job.total,
      succeeded: job.succeeded,
      failed: job.failed,
      byStatus: stats,
    },
  });
});
