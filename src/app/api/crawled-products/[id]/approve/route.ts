/**
 * POST /api/crawled-products/[id]/approve
 *
 * جریان:
 *   1. بررسی وجود محصول
 *   2. تغییر status به REVIEWED
 *   3. ثبت reviewedAt و reviewedBy
 *   4. enqueue کردن publish job
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { enqueuePublish } from '@/lib/queue/jobs';
import { apiHandler, ok, notFound, badRequest } from '@/lib/api-helpers';

// وضعیت‌هایی که approve روی آن‌ها مجاز است
const APPROVABLE_STATUSES = ['PROCESSED', 'PARTIAL'] as const;

const ApproveBodySchema = z.object({
  /** نام یا شناسه اپراتور (اختیاری تا NextAuth راه‌اندازی شود) */
  reviewedBy: z.string().max(100).optional(),
});

type RouteContext = { params: { id: string } };

/** POST /api/crawled-products/[id]/approve */
export const POST = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = params;

  // body اختیاری است (ممکن است body نداشته باشد)
  let reviewedBy: string | undefined;
  try {
    const body: unknown = await req.json();
    const parsed = ApproveBodySchema.safeParse(body);
    if (parsed.success) {
      reviewedBy = parsed.data.reviewedBy;
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

  // فقط محصولات PROCESSED یا PARTIAL قابل تایید هستند
  if (!(APPROVABLE_STATUSES as readonly string[]).includes(product.status)) {
    return badRequest(
      `محصول با وضعیت ${product.status} قابل تایید نیست. وضعیت باید PROCESSED یا PARTIAL باشد.`,
    );
  }

  // تغییر status به REVIEWED
  const updated = await prisma.crawledProduct.update({
    where: { id },
    data: {
      status: 'REVIEWED',
      reviewedAt: new Date(),
      reviewedBy: reviewedBy ?? null,
    },
  });

  // enqueue publish job
  let publishJobId: string | undefined;
  try {
    const job = await enqueuePublish({ crawledProductId: id });
    publishJobId = job.id;
  } catch (err) {
    // اگر enqueue شکست خورد، status عوض شده اما publish نمی‌شود
    // لاگ و اطلاع‌رسانی — admin می‌تواند دستی retry کند
    console.error('[approve] enqueuePublish failed:', err);
  }

  return ok({
    id: updated.id,
    status: updated.status,
    reviewedAt: updated.reviewedAt,
    reviewedBy: updated.reviewedBy,
    publishJobId: publishJobId ?? null,
  });
});
