/**
 * GET    /api/sites/[id] — جزئیات یک SourceSite
 * PUT    /api/sites/[id] — ویرایش SourceSite
 * DELETE /api/sites/[id] — حذف SourceSite
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { apiHandler, ok, notFound } from '@/lib/api-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const UpdateSiteSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'slug فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد')
    .optional(),
  baseUrl: z.string().url('آدرس پایه معتبر نیست').optional(),
  adapterKey: z.string().min(1).max(50).optional(),
  requiresBrowser: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = { params: { id: string } };

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/sites/[id] */
export const GET = apiHandler(async (_req: NextRequest, { params }: RouteContext) => {
  const { id } = params;

  const site = await prisma.sourceSite.findUnique({ where: { id } });
  if (!site) return notFound('سایت منبع پیدا نشد');

  return ok(site);
});

/** PUT /api/sites/[id] */
export const PUT = apiHandler(async (req: NextRequest, { params }: RouteContext) => {
  const { id } = params;
  const body: unknown = await req.json();
  const data = UpdateSiteSchema.parse(body);

  // بررسی وجود رکورد قبل از update
  const exists = await prisma.sourceSite.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return notFound('سایت منبع پیدا نشد');

  const site = await prisma.sourceSite.update({ where: { id }, data });

  return ok(site);
});

/** DELETE /api/sites/[id] */
export const DELETE = apiHandler(async (_req: NextRequest, { params }: RouteContext) => {
  const { id } = params;

  const exists = await prisma.sourceSite.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return notFound('سایت منبع پیدا نشد');

  await prisma.sourceSite.delete({ where: { id } });

  return ok({ deleted: true, id });
});
