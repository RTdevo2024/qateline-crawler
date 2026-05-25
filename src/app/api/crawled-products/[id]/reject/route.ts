/**
 * POST /api/crawled-products/[id]/reject
 *
 * جریان:
 *   1. بررسی وجود محصول
 *   2. تغییر status به REJECTED
 *   3. ثبت reason در errorMessage (اختیاری)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { apiHandler, ok, notFound, badRequest } from '@/lib/api-helpers';

// وضعیت‌هایی که reject روی آن‌ها مجاز است
const REJECTABLE_STATUSES = ['RAW', 'PROCESSED', 'REVIEWED', 'PARTIAL', 'FAILED'] as const;

const RejectBodySchema = z.object({
  /** دلیل رد شدن (اختیاری) */
  reason: z.string().max(500).optional(),
});

type RouteContext = { params: { id: string } };

/** POST /api/crawled-products/[id]/reject */
export const POST = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = params;

  let reason: string | undefined;
  try {
    const body: unknown = await req.json();
    const parsed = RejectBodySchema.safeParse(body);
    if (parsed.success) {
      reason = parsed.data.reason;
    }
  } catch {
    // body نداشتیم — مشکلی نیست
  }

  // بررسی وجود و وضعیت محصول
  const product = await prisma.crawledProduct.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!product) return notFound('محصول پیدا نشد');

  if (product.status === 'PUBLISHED') {
    return badRequest('محصول منتشرشده قابل رد شدن نیست');
  }

  if (product.status === 'REJECTED') {
    return badRequest('محصول قبلاً رد شده است');
  }

  if (!(REJECTABLE_STATUSES as readonly string[]).includes(product.status)) {
    return badRequest(`محصول با وضعیت ${product.status} قابل رد شدن نیست`);
  }

  const updated = await prisma.crawledProduct.update({
    where: { id },
    data: {
      status: 'REJECTED',
      errorMessage: reason ?? null,
    },
  });

  return ok({
    id: updated.id,
    status: updated.status,
    reason: updated.errorMessage,
  });
});
