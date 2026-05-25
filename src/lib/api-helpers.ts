/**
 * api-helpers.ts — ابزارهای مشترک API Route Handlers
 *
 * شامل:
 *   - apiHandler: wrapper برای error catching و response wrapping
 *   - ok / created / notFound / badRequest: سازنده‌های response استاندارد
 *   - PaginationSchema و کمک‌کننده‌های pagination
 *
 * همه route handlers پنل مدیریت باید از این ابزارها استفاده کنند.
 *
 * فرمت پاسخ استاندارد:
 *   موفق: { success: true, data: T }
 *   ناموفق: { success: false, error: { message, code, details? } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Response Types
// ─────────────────────────────────────────────────────────────────────────────

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
};

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────────────────────
// Response Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** پاسخ موفق 200 */
export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true as const, data }, { status });
}

/** پاسخ موفق 201 Created */
export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true as const, data }, { status: 201 });
}

/** پاسخ 404 Not Found */
export function notFound(message = 'رکورد پیدا نشد'): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false as const, error: { message, code: 'NOT_FOUND' } },
    { status: 404 },
  );
}

/** پاسخ 400 Bad Request */
export function badRequest(message: string, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false as const, error: { message, code: 'BAD_REQUEST', details } },
    { status: 400 },
  );
}

/** پاسخ 409 Conflict */
export function conflict(message: string): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false as const, error: { message, code: 'CONFLICT' } },
    { status: 409 },
  );
}

/** پاسخ 422 Unprocessable Entity */
export function unprocessable(message: string, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false as const, error: { message, code: 'UNPROCESSABLE', details } },
    { status: 422 },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// apiHandler — error-catching wrapper برای Next.js App Router route handlers
//
// مثال استفاده:
//   export const GET = apiHandler(async (req: NextRequest) => {
//     const data = await getData();
//     return ok(data);
//   });
//
//   export const PUT = apiHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
//     const { id } = params;
//     return ok(updatedData);
//   });
// ─────────────────────────────────────────────────────────────────────────────

export function apiHandler<TArgs extends [NextRequest, ...unknown[]]>(
  handler: (...args: TArgs) => Promise<NextResponse>,
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      // ─── Zod validation error ───
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        return NextResponse.json(
          {
            success: false as const,
            error: {
              message: 'داده ورودی نامعتبر است',
              code: 'VALIDATION_ERROR',
              details,
            },
          } satisfies ApiError,
          { status: 400 },
        );
      }

      // ─── Prisma known errors ───
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          // Record not found
          return NextResponse.json(
            {
              success: false as const,
              error: { message: 'رکورد پیدا نشد', code: 'NOT_FOUND' },
            } satisfies ApiError,
            { status: 404 },
          );
        }
        if (error.code === 'P2002') {
          // Unique constraint violation
          return NextResponse.json(
            {
              success: false as const,
              error: { message: 'این مقدار قبلاً ثبت شده است', code: 'DUPLICATE' },
            } satisfies ApiError,
            { status: 409 },
          );
        }
        if (error.code === 'P2003') {
          // Foreign key constraint
          return NextResponse.json(
            {
              success: false as const,
              error: { message: 'رکورد مرتبط یافت نشد', code: 'FOREIGN_KEY_ERROR' },
            } satisfies ApiError,
            { status: 400 },
          );
        }
      }

      // ─── Generic error ───
      const message =
        error instanceof Error ? error.message : 'خطای داخلی سرور';
      console.error('[API Error]', error);
      return NextResponse.json(
        {
          success: false as const,
          error: { message, code: 'INTERNAL_ERROR' },
        } satisfies ApiError,
        { status: 500 },
      );
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** schema مشترک برای query params pagination */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof PaginationSchema>;

/** محاسبه skip برای Prisma */
export function getPaginationSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/** ساخت آبجکت pagination metadata */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): { page: number; limit: number; total: number; totalPages: number } {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse Query Params helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * parseQuery — query params از URL را با یک Zod schema parse می‌کند.
 * مقادیر null را حذف می‌کند تا default های schema اعمال شوند.
 */
export function parseQuery<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
): z.infer<T> {
  const { searchParams } = new URL(url);
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return schema.parse(raw);
}
