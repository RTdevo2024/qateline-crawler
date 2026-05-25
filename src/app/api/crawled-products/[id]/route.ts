/**
 * GET    /api/crawled-products/[id] — جزئیات کامل یک محصول (raw + processed + final)
 * PUT    /api/crawled-products/[id] — به‌روزرسانی finalData (ویرایش اپراتور)
 * DELETE /api/crawled-products/[id] — حذف محصول
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { apiHandler, ok, notFound } from '@/lib/api-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * schema به‌روزرسانی finalData توسط اپراتور.
 * finalData می‌تواند هر شکلی داشته باشد — اپراتور می‌تواند هر فیلدی اضافه/ویرایش کند.
 * فقط بررسی می‌کنیم که یک object معتبر باشد.
 */
/**
 * finalData می‌تواند هر شکلی داشته باشد — اپراتور می‌تواند هر فیلدی اضافه/ویرایش کند.
 * از z.record(string, unknown) برای سازگاری با Zod v4 و InputJsonValue استفاده می‌کنیم.
 */
const UpdateProductSchema = z.object({
  finalData: z.record(z.string(), z.unknown()),
});

type RouteContext = { params: { id: string } };

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/crawled-products/[id] */
export const GET = apiHandler(async (_req: NextRequest, { params }: RouteContext) => {
  const { id } = params;

  const product = await prisma.crawledProduct.findUnique({
    where: { id },
    include: {
      crawlJob: {
        select: {
          id: true,
          status: true,
          sourceSite: { select: { id: true, name: true, slug: true, baseUrl: true } },
        },
      },
    },
  });

  if (!product) return notFound('محصول پیدا نشد');

  return ok(product);
});

/** PUT /api/crawled-products/[id] — به‌روزرسانی finalData توسط اپراتور */
export const PUT = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = params;
  const body: unknown = await req.json();
  const { finalData } = UpdateProductSchema.parse(body);

  const exists = await prisma.crawledProduct.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return notFound('محصول پیدا نشد');

  const updated = await prisma.crawledProduct.update({
    where: { id },
    data: { finalData: finalData as Prisma.InputJsonValue },
  });

  return ok(updated);
});

/** DELETE /api/crawled-products/[id] */
export const DELETE = apiHandler(async (_req: NextRequest, { params }: RouteContext) => {
  const { id } = params;

  const exists = await prisma.crawledProduct.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return notFound('محصول پیدا نشد');

  await prisma.crawledProduct.delete({ where: { id } });

  return ok({ deleted: true, id });
});
