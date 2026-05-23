/**
 * ai.ts — تایپ‌های پردازش هوش مصنوعی (Claude API)
 *
 * Claude AI داده خام کرالر را می‌گیرد، بهینه می‌کند و خروجی آماده‌ای
 * برای انتشار در قطعه‌لاین تولید می‌کند.
 *
 * جریان داده:
 *   CrawledProductData (از crawler.ts)
 *       ↓ تبدیل به AIProcessingInput
 *   Claude API (claude-sonnet-4-6)
 *       ↓ parse و validate با AIProcessingOutputSchema
 *   AIProcessingOutput
 *       ↓ ذخیره به همراه AIProcessingMeta در DB.processedData
 *   ProcessedProductData (container کامل processedData)
 *
 * چرا Zod schema برای خروجی AI؟
 *   Claude ممکن است JSON ناقص یا فیلد اضافه برگرداند.
 *   schema از ورود داده نادرست به مراحل بعدی جلوگیری می‌کند.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AIProcessingInput — داده‌ای که به Claude ارسال می‌شود.
 *
 * این interface داده خام کرالر (CrawledProductData) را به فرمتی تبدیل
 * می‌کند که برای ساخت prompt مناسب است.
 * تبدیل CrawledProductData → AIProcessingInput در ai.worker انجام می‌شود.
 */
export interface AIProcessingInput {
  /** عنوان خام از سایت — همانطور که کرالر استخراج کرده، بدون ویرایش */
  rawTitle: string;
  /**
   * توضیحات خام از سایت — ممکن است HTML tag داشته باشد.
   * Claude باید آن را به متن ساده تبدیل و بهینه کند.
   */
  rawDescription?: string;
  /** قیمت به ریال — برای context درست به Claude کمک می‌کند */
  price: number;
  /** مشخصات فنی خام از سایت (کلید-مقدار فارسی) */
  attributes: Record<string, string>;
  /** تعداد تصاویر موجود — Claude نمی‌تواند تصویر ببیند اما تعداد را می‌داند */
  imageCount: number;
  /** URL صفحه کرال‌شده — برای reference و context */
  sourceUrl: string;
  /** slug سایت مبدأ — Claude می‌داند از کجا آمده (مثال: 'digikala') */
  sourceSite: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output Schema & Type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AIProcessingOutputSchema — Zod schema برای validate کردن JSON خروجی Claude.
 *
 * Claude با دستورالعمل prompt یک JSON برمی‌گرداند.
 * این schema تضمین می‌کند تمام فیلدهای لازم حضور دارند و مقادیر معتبرند.
 *
 * اگر Claude خروجی نامعتبر داد:
 *   - safeParse fail می‌کند
 *   - محصول با status FAILED در DB ذخیره می‌شود
 *   - جزئیات خطا در errorMessage ثبت می‌شود
 */
export const AIProcessingOutputSchema = z.object({
  /**
   * عنوان بازنویسی‌شده فارسی.
   * Claude باید: واضح، کوتاه، SEO-friendly و بدون اطلاعات اضافه بنویسد.
   * محدودیت: حداقل ۵، حداکثر ۱۰۰ کاراکتر.
   * مثال: 'کابل شارژ سریع ۶۵ واتی USB-C سامسونگ'
   */
  title: z.string().min(5).max(100),

  /**
   * توضیحات بهینه‌شده فارسی.
   * Claude باید: حرفه‌ای، کامل و جذاب برای خریدار بنویسد.
   * نباید HTML داشته باشد — متن ساده.
   * محدودیت: حداقل ۵۰، حداکثر ۱۰۰۰ کاراکتر.
   */
  description: z.string().min(50).max(1000),

  /**
   * پیشنهاد دسته‌بندی برای قطعه‌لاین.
   * Claude لیست دسته‌بندی‌های قطعه‌لاین را نمی‌داند پس فقط hint می‌دهد.
   * mapping نهایی در CategoryMapping جدول انجام می‌شود.
   * مثال: 'کابل و شارژر'، 'لوازم جانبی خودرو'
   */
  categoryHint: z.string().optional(),

  /**
   * کلیدواژه‌های فارسی برای جستجوی داخلی فروشگاه.
   * همه به صورت lowercase و بدون علائم نگارشی.
   * حداقل ۳، حداکثر ۱۰ کلیدواژه.
   */
  keywords: z.array(z.string().min(1)).min(3).max(10),

  /**
   * مشخصات فنی پاکسازی‌شده و استانداردشده.
   * Claude باید: موارد تکراری را حذف، کلیدها را یکنواخت کند.
   * اگر مشخصاتی قابل استانداردسازی نبود می‌تواند undefined باشد.
   */
  attributes: z.record(z.string(), z.string()).optional(),

  /**
   * برند استخراج‌شده یا تایید‌شده توسط Claude.
   * اگر در عنوان یا مشخصات برند مشخص بود اینجا می‌گذارد.
   * مثال: 'سامسونگ'، 'بوش'، 'ACDelco'
   */
  brand: z.string().optional(),

  /**
   * سطح اطمینان Claude از کیفیت خروجی — ۰ تا ۱.
   * < 0.5 : داده خام کم بود، خروجی ممکن است نادرست باشد
   * 0.5–0.8 : خروجی معقول است اما review توصیه می‌شود
   * > 0.8 : خروجی با اطمینان بالا
   */
  confidence: z.number().min(0).max(1),
});

/**
 * AIProcessingOutput — نوع TypeScript مستقیم از Zod schema.
 *
 * خروجی تایید‌شده Claude که در DB.processedData ذخیره می‌شود.
 */
export type AIProcessingOutput = z.infer<typeof AIProcessingOutputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Meta & Container
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AIProcessingMeta — اطلاعات metadata پردازش AI.
 *
 * این اطلاعات در کنار خروجی اصلی ذخیره می‌شوند و برای:
 *   - محاسبه هزینه API (inputTokens + outputTokens)
 *   - بررسی performance (durationMs)
 *   - امکان reprocess با model جدیدتر (model field)
 * استفاده می‌شوند.
 */
export interface AIProcessingMeta {
  /** model Claude استفاده‌شده — مثال: 'claude-sonnet-4-6' */
  model: string;
  /** تعداد input tokens مصرفی (داده ارسال‌شده به Claude) */
  inputTokens: number;
  /** تعداد output tokens مصرفی (پاسخ Claude) */
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
 *
 * ترکیب خروجی Claude + metadata پردازش در یک object.
 */
export interface ProcessedProductData {
  /** خروجی تایید‌شده Claude */
  output: AIProcessingOutput;
  /** اطلاعات متا پردازش — برای billing، debug و monitoring */
  meta: AIProcessingMeta;
}
