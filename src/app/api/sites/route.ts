/**
 * GET  /api/sites — لیست همه SourceSite ها
 * POST /api/sites — ایجاد SourceSite جدید
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import {
  apiHandler,
  ok,
  created,
  PaginationSchema,
  getPaginationSkip,
  buildPaginationMeta,
  parseQuery,
} from '@/lib/api-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const GetSitesQuerySchema = PaginationSchema;

const CreateSiteSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'slug فقط می‌تواند شامل حروف کوچک، اعداد و خط تیره باشد'),
  baseUrl: z.string().url('آدرس پایه معتبر نیست'),
  adapterKey: z.string().min(1).max(50),
  requiresBrowser: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/sites — لیست همه سایت‌های منبع */
export const GET = apiHandler(async (req: NextRequest) => {
  const { page, limit } = parseQuery(req.url, GetSitesQuerySchema);

  const [sites, total] = await prisma.$transaction([
    prisma.sourceSite.findMany({
      skip: getPaginationSkip(page, limit),
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sourceSite.count(),
  ]);

  return ok({
    items: sites,
    pagination: buildPaginationMeta(total, page, limit),
  });
});

/** POST /api/sites — ایجاد سایت منبع جدید */
export const POST = apiHandler(async (req: NextRequest) => {
  const body: unknown = await req.json();
  const data = CreateSiteSchema.parse(body);

  const site = await prisma.sourceSite.create({ data });

  return created(site);
});
