/**
 * common.ts — تایپ‌های مشترک سراسر پروژه
 *
 * این فایل primitive building blocks را تعریف می‌کند که در همه لایه‌های
 * پروژه استفاده می‌شوند: API routes، workers، repositories و ...
 *
 * هیچ business logic ندارد — فقط ساختار داده و status strings.
 * وابستگی به هیچ پکیج خارجی ندارد.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Result Pattern
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result<T, E> — خروجی استاندارد توابعی که ممکن است شکست بخورند.
 *
 * به جای throw کردن exception در کد داخلی از این pattern استفاده می‌شود.
 * این تضمین می‌کند caller مجبور است error را بررسی کند.
 *
 * مثال مصرف:
 *   const result: Result<CrawledProductData> = validateCrawledData(json);
 *   if (!result.success) {
 *     logger.error(result.error.message);
 *     return;
 *   }
 *   // اینجا TypeScript می‌داند result.data از نوع CrawledProductData است
 *   console.log(result.data.product.title);
 *
 * تفاوت با exception:
 *   - compiler خطای handle نشده را نمی‌گیرد (exception)
 *   - با Result، اگر success را بررسی نکنید به data دسترسی ندارید
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PaginatedResponse<T> — پاسخ استاندارد API برای endpoint های لیستی.
 *
 * همه endpoint های GET که لیست برمی‌گردانند از این ساختار استفاده می‌کنند:
 *   GET /api/jobs         → PaginatedResponse<CrawlJobSummary>
 *   GET /api/products     → PaginatedResponse<CrawledProductSummary>
 */
export interface PaginatedResponse<T> {
  /** آرایه داده صفحه فعلی */
  data: T[];
  pagination: {
    /** شماره صفحه فعلی — از ۱ شروع می‌شود، نه ۰ */
    page: number;
    /** حداکثر تعداد آیتم در این صفحه */
    limit: number;
    /** تعداد کل رکوردها در DB (بدون فیلتر pagination) */
    total: number;
    /** تعداد کل صفحات — معادل Math.ceil(total / limit) */
    totalPages: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Types (هم‌راستا با Prisma enums در prisma/schema.prisma)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * وضعیت‌های یک CrawlJob در چرخه حیاتش.
 *
 * مقادیر با enum CrawlJobStatus در Prisma یکسان هستند (UPPER_SNAKE_CASE).
 * از const object استفاده شده تا:
 *   - به عنوان value در runtime قابل استفاده باشد (مثلاً در switch)
 *   - type-safe باشد (TypeScript literal types)
 *   - از Prisma enum جدا باشد (برای layer isolation)
 *
 * PENDING   → در صف BullMQ، هنوز شروع نشده
 * RUNNING   → worker در حال اجرای کرال است
 * COMPLETED → همه محصولات پردازش شدند (حتی اگر برخی fail شده باشند)
 * FAILED    → خود job با خطای غیرقابل بازیابی متوقف شد
 * CANCELLED → کاربر آن را لغو کرد (فقط وقتی status = PENDING ممکن است)
 */
export const CRAWL_JOB_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type CrawlJobStatus = (typeof CRAWL_JOB_STATUS)[keyof typeof CRAWL_JOB_STATUS];

/**
 * وضعیت‌های یک CrawledProduct در چرخه کرال → پردازش → انتشار.
 *
 * مقادیر با enum CrawledProductStatus در Prisma یکسان هستند.
 *
 * RAW       → داده خام از سایت استخراج و در rawData ذخیره شد
 * PROCESSED → Claude AI پردازش کرد و نتیجه در processedData ذخیره شد
 * REVIEWED  → اپراتور به صورت دستی بررسی و تایید کرد (manual review mode)
 * PUBLISHED → با موفقیت در قطعه‌لاین آپلود شد و ghatelineProductUuid پر شد
 * REJECTED  → اپراتور رد کرد — منتشر نخواهد شد مگر با reset دستی
 * FAILED    → خطای غیرقابل بازیابی در یکی از مراحل — errorMessage پر است
 */
export const CRAWLED_PRODUCT_STATUS = {
  RAW: 'RAW',
  PROCESSED: 'PROCESSED',
  REVIEWED: 'REVIEWED',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
} as const;

export type CrawledProductStatus =
  (typeof CRAWLED_PRODUCT_STATUS)[keyof typeof CRAWLED_PRODUCT_STATUS];

/**
 * سطح اهمیت یک پیام log در SystemLog.
 *
 * مقادیر با enum LogLevel در Prisma یکسان هستند.
 *
 * DEBUG → اطلاعات دیباگ (فقط در development)
 * INFO  → رویداد عادی (شروع job، تکمیل محصول و ...)
 * WARN  → وضعیت غیرعادی اما قابل ادامه (retry، rate limit و ...)
 * ERROR → خطای جدی که نیاز به بررسی دارد
 */
export const LOG_LEVEL = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL];
