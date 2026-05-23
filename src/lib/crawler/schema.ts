/**
 * schema.ts — Zod schemas و توابع validation برای داده کرالرها
 *
 * این فایل schemas را از src/types/crawler.ts import و re-export می‌کند،
 * و توابع validation آماده‌برای‌استفاده فراهم می‌کند.
 *
 * استفاده معمول در crawl.worker.ts:
 *   import { validateCrawledData, isValidProductData } from '@/lib/crawler/schema';
 *
 *   const result = validateCrawledData(rawJson);
 *   if (!result.success) {
 *     logger.error('داده کرالر نامعتبر', { error: result.error.message });
 *     return;
 *   }
 *   // result.data از نوع CrawledProductData است — type-safe
 *   await saveToDatabase(result.data);
 *
 * چرا این فایل جدا از src/types/crawler.ts است؟
 *   - types فقط تعریف ساختار — بدون import اضافه
 *   - این فایل validation logic دارد و Result type ایمپورت می‌کند
 *   - workers و repositories فقط از اینجا import می‌کنند، نه مستقیم از zod
 */

import { z } from 'zod';
import { CrawledProductDataSchema } from '@/types/crawler';
import type { CrawledProductData } from '@/types/crawler';
import type { Result } from '@/types/common';

// Re-export schemas و types تا importers فقط به این یک فایل نیاز داشته باشند
export {
  CrawledProductDataSchema,
  CrawledSourceSchema,
  CrawledProductInfoSchema,
  CrawledInventorySchema,
} from '@/types/crawler';

export type {
  CrawledProductData,
  CrawledSource,
  CrawledProductInfo,
  CrawledInventory,
} from '@/types/crawler';

// ─────────────────────────────────────────────────────────────────────────────
// Single Product Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * validateCrawledData — تایید می‌کند یک مقدار ناشناخته CrawledProductData معتبر است.
 *
 * نتیجه را به صورت Result<CrawledProductData> برمی‌گرداند.
 * در صورت شکست، پیام خطا شامل فیلد مشکل‌دار و دلیل است.
 *
 * @param data - داده‌ای که باید تایید شود (معمولاً از JSON.parse یا DB)
 * @returns Result با data تایید‌شده یا error توضیحی
 *
 * مثال:
 *   const result = validateCrawledData(JSON.parse(dbRow.rawData));
 *   if (!result.success) { ... }
 *   result.data.product.title // type-safe CrawledProductData
 */
export function validateCrawledData(data: unknown): Result<CrawledProductData> {
  const parsed = CrawledProductDataSchema.safeParse(data);

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' | ');

    return {
      success: false,
      error: new Error(`داده کرالر نامعتبر — ${messages}`),
    };
  }

  return { success: true, data: parsed.data };
}

/**
 * isValidProductData — type guard برای CrawledProductData.
 *
 * در if statements استفاده می‌شود وقتی throw کردن مناسب نیست:
 *   if (isValidProductData(rawData)) {
 *     rawData.product.title // type-safe
 *   }
 *
 * @param data - مقداری که باید بررسی شود
 * @returns true اگر data یک CrawledProductData معتبر باشد
 */
export function isValidProductData(data: unknown): data is CrawledProductData {
  return CrawledProductDataSchema.safeParse(data).success;
}

// ─────────────────────────────────────────────────────────────────────────────
// Array Validation (Category Crawl)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema برای آرایه‌ای از CrawledProductData.
 * در کرال دسته‌ای (crawlCategory) استفاده می‌شود.
 */
export const CrawledProductDataArraySchema = z.array(CrawledProductDataSchema);

/**
 * validateCrawledDataArray — تایید آرایه‌ای از محصولات کرال‌شده.
 *
 * برای خروجی crawlCategory() استفاده می‌شود که چند محصول برمی‌گرداند.
 *
 * @param data - آرایه داده که باید تایید شود
 * @returns Result با آرایه تایید‌شده یا error توضیحی
 */
export function validateCrawledDataArray(data: unknown): Result<CrawledProductData[]> {
  const parsed = CrawledProductDataArraySchema.safeParse(data);

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' | ');

    return {
      success: false,
      error: new Error(`آرایه داده کرالر نامعتبر — ${messages}`),
    };
  }

  return { success: true, data: parsed.data };
}

/**
 * isValidProductDataArray — type guard برای آرایه CrawledProductData.
 *
 * @param data - مقداری که باید بررسی شود
 */
export function isValidProductDataArray(data: unknown): data is CrawledProductData[] {
  return CrawledProductDataArraySchema.safeParse(data).success;
}
