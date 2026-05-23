/**
 * ai.ts — تایپ‌های پردازش هوش مصنوعی (OpenAI GPT-4o)
 *
 * OpenAI داده خام کرالر را می‌گیرد، بهینه می‌کند و خروجی آماده‌ای
 * برای انتشار در قطعه‌لاین تولید می‌کند.
 *
 * جریان داده:
 *   CrawledProductData (از crawler.ts)
 *       ↓ تبدیل به prompt
 *   OpenAI GPT-4o (response_format: json_object)
 *       ↓ parse و validate با AIProcessingOutputSchema
 *   AIProcessingOutput
 *       ↓ ذخیره به همراه AIProcessingMeta در DB.processedData
 *   ProcessedProductData (container کامل processedData)
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Output Schema & Type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AIProcessingOutputSchema — Zod schema برای validate کردن JSON خروجی GPT-4o.
 *
 * از response_format: json_object استفاده می‌شود — OpenAI تضمین JSON معتبر می‌دهد.
 * این schema فقط ساختار و مقادیر فیلدها را تأیید می‌کند.
 */
export const AIProcessingOutputSchema = z.object({
  /**
   * عنوان بازنویسی‌شده فارسی — SEO-friendly.
   * هدف: 60-80 کاراکتر (prompt)، validate: min 20 برای انعطاف.
   */
  title: z.string().min(20).max(120),

  /**
   * توضیحات کامل فارسی — HTML با تگ‌های p، ul، li، h3.
   * هدف: 300-500 کلمه. در HTML این معادل ~2000-4000 کاراکتر است.
   */
  description: z.string().min(200),

  /**
   * دسته‌بندی پیشنهادی از لیست دسته‌بندی‌های فروشگاه.
   * اگر هیچ دسته‌بندی مناسبی یافت نشد می‌تواند undefined باشد.
   */
  category: z.string().optional(),

  /**
   * ویژگی‌های برجسته محصول — آرایه‌ای از کلید-مقدار.
   * مثال: [{ key: "رنگ", value: "مشکی" }, { key: "گارانتی", value: "۱۸ ماهه" }]
   */
  attrs: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().min(1),
    })
  ),

  /** عنوان انگلیسی محصول — برای SEO بین‌المللی */
  title_en: z.string().optional(),

  /**
   * slug فارسی URL-safe.
   * مثال: 'کابل-شارژ-سریع-usb-c-سامسونگ'
   * باید فقط حروف فارسی، انگلیسی، اعداد و خط تیره داشته باشد.
   */
  slug: z.string().optional(),

  /** عنوان SEO — 50-60 کاراکتر */
  seo_title: z.string().optional(),

  /** توضیحات متا SEO — 120-160 کاراکتر */
  seo_description: z.string().optional(),
});

/** نوع TypeScript مستقیم از Zod schema */
export type AIProcessingOutput = z.infer<typeof AIProcessingOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Meta & Container
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AIProcessingMeta — اطلاعات metadata پردازش AI.
 *
 * برای محاسبه هزینه API (inputTokens + outputTokens)،
 * بررسی performance (durationMs) و امکان reprocess با model جدیدتر.
 */
export interface AIProcessingMeta {
  /** model OpenAI استفاده‌شده — مثال: 'gpt-4o' */
  model: string;
  /** تعداد input tokens مصرفی */
  inputTokens: number;
  /** تعداد output tokens مصرفی */
  outputTokens: number;
  /** زمان کل پردازش از ارسال تا دریافت پاسخ — میلی‌ثانیه */
  durationMs: number;
  /** تاریخ و ساعت پردازش — ISO 8601 */
  processedAt: string;
}

/**
 * ProcessedProductData — container کامل فیلد processedData در DB.
 *
 * جدول crawled_products فیلد processedData: jsonb دارد.
 * این interface دقیقاً ساختار آن JSON را تعریف می‌کند.
 */
export interface ProcessedProductData {
  /** خروجی تایید‌شده GPT-4o */
  output: AIProcessingOutput;
  /** اطلاعات متا پردازش — برای billing، debug و monitoring */
  meta: AIProcessingMeta;
}
