/**
 * GET /api/crawled-products — لیست محصولات کرال‌شده با pagination و فیلتر
 *
 * Query params:
 *   page       — شماره صفحه (default: 1)
 *   limit      — تعداد در صفحه (default: 20, max: 100)
 *   status     — فیلتر بر اساس وضعیت (RAW, PROCESSED, REVIEWED, PUBLISHED, REJECTED, PARTIAL, FAILED)
 *   crawlJobId — فیلتر بر اساس job
 *   search     — جستجو در عنوان محصول (rawData.product.title)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import {
  apiHandler,
  ok,
  PaginationSchema,
  getPaginationSkip,
  buildPaginationMeta,
  parseQuery,
} from '@/lib/api-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CrawledProductStatusEnum = z.enum([
  'RAW',
  'PROCESSED',
  'REVIEWED',
  'PUBLISHED',
  'REJECTED',
  'PARTIAL',
  'FAILED',
]);

const GetProductsQuerySchema = PaginationSchema.extend({
  status: CrawledProductStatusEnum.optional(),
  crawlJobId: z.string().optional(),
  search: z.string().min(1).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/crawled-products */
export const GET = apiHandler(async (req: NextRequest) => {
  const { page, limit, status, crawlJobId, search } = parseQuery(
    req.url,
    GetProductsQuerySchema,
  );

  // ─── ساخت where clause ───
  const where: Prisma.CrawledProductWhereInput = {
    ...(status !== undefined && { status }),
    ...(crawlJobId !== undefined && { crawlJobId }),
    // جستجو در عنوان محصول (rawData.product.title)
    ...(search !== undefined && {
      OR: [
        {
          rawData: {
            path: ['product', 'title'],
            string_contains: search,
          } as Prisma.JsonFilter,
        },
        {
          processedData: {
            path: ['output', 'title'],
            string_contains: search,
          } as Prisma.JsonFilter,
        },
      ],
    }),
  };

  const [products, total] = await prisma.$transaction([
    prisma.crawledProduct.findMany({
      where,
      skip: getPaginationSkip(page, limit),
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        crawlJobId: true,
        sourceUrl: true,
        status: true,
        ghatelineProductUuid: true,
        ghatelineInventoryUuid: true,
        errorMessage: true,
        reviewedBy: true,
        rawAt: true,
        processedAt: true,
        reviewedAt: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        // داده‌های خام فقط در view جزئیات نمایش داده می‌شوند
        // اینجا فقط خلاصه
        crawlJob: {
          select: {
            id: true,
            sourceSite: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    prisma.crawledProduct.count({ where }),
  ]);

  return ok({
    items: products,
    pagination: buildPaginationMeta(total, page, limit),
  });
});
