/**
 * crawler.ts — تایپ‌های خروجی استاندارد کرالرها (Adapter Pattern)
 *
 * هر crawler adapter (DigikalaCrawler، TorobCrawler و ...) باید
 * CrawledProductData برگرداند. این نوع contract بین adapters و بقیه سیستم است.
 *
 * محل ذخیره در DB:
 *   جدول crawled_products → فیلد rawData (jsonb)
 *
 * جریان کامل داده در پروژه:
 *   [Adapter].crawlProduct(url)
 *       ↓ CrawledProductData
 *   validateCrawledData()  ← src/lib/crawler/schema.ts
 *       ↓ ذخیره در DB.rawData
 *   AIProcessingInput     ← src/types/ai.ts
 *       ↓ Claude API
 *   AIProcessingOutput    ← src/types/ai.ts
 *       ↓ ذخیره در DB.processedData
 *   CreateProductRequest  ← src/types/ghateline.ts
 *       ↓ Ghateline API
 *   UUID → ذخیره در DB.ghatelineProductUuid
 *
 * چرا Zod schemas به جای فقط interface؟
 *   TypeScript types فقط compile-time هستند.
 *   Zod schema در runtime هم validation می‌کند — مثلاً وقتی crawler داده
 *   ناقص برمی‌گرداند یا JSON از DB خوانده می‌شود.
 *   استفاده از z.infer تضمین می‌کند type و validator همیشه sync هستند.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Source Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CrawledSourceSchema — اطلاعات سایت مبدأ و زمان کرال.
 *
 * این بخش برای traceability حیاتی است:
 *   - می‌دانیم محصول از کدام سایت آمده (siteSlug)
 *   - می‌دانیم قیمت/موجودی کِی استخراج شده (crawledAt)
 *   - می‌توانیم به صفحه اصلی برگردیم (url)
 */
export const CrawledSourceSchema = z.object({
  /**
   * شناسه یکتای سایت مبدأ.
   * باید با فیلد adapterKey در جدول source_sites یکسان باشد.
   * مثال‌ها: 'digikala'، 'torob'، 'yadak-market'
   */
  siteSlug: z.string().min(1),

  /**
   * URL کامل صفحه محصول که کرال شد.
   * باید یک URL معتبر باشد (با http:// یا https:// شروع شود).
   */
  url: z.string().url(),

  /**
   * تاریخ و ساعت کرال به فرمت ISO 8601.
   * مثال: '2026-05-23T10:30:00.000Z'
   * برای دانستن اینکه قیمت/موجودی کِی capture شده مفید است.
   */
  crawledAt: z.string().datetime(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Product Info Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CrawledProductInfoSchema — داده خام محصول از سایت.
 *
 * همه فیلدها دقیقاً همانطور که در سایت بودند ذخیره می‌شوند — بدون پردازش.
 * AI processing بعداً عنوان، توضیحات و attributes را بهینه می‌کند.
 */
export const CrawledProductInfoSchema = z.object({
  /**
   * عنوان محصول عینی از سایت — بدون هیچ ویرایشی.
   * ممکن است طولانی، ناخوانا یا دارای اطلاعات اضافه باشد.
   * مثال: 'کابل شارژر TYPE-C 65W سامسونگ مدل EP-TA800NBEGWW اصل'
   */
  title: z.string().min(1),

  /**
   * توضیحات کامل محصول از سایت.
   * ممکن است HTML tag داشته باشد (<br>، <ul>، <strong> و ...).
   * AI این را به متن ساده و حرفه‌ای تبدیل می‌کند.
   * undefined اگر سایت توضیحاتی نداشت.
   */
  description: z.string().optional(),

  /**
   * آرایه URL تصاویر محصول.
   * همه URL ها باید با http:// یا https:// شروع شوند — URL معتبر باشند.
   * آرایه خالی ([]) اگر هیچ تصویری یافت نشد — null نیست.
   *
   * توجه برای adapter نویسان: URL های protocol-relative (مثل //cdn.digikala.com/...)
   * را قبل از return باید به https:// تبدیل کنید، وگرنه این validation fail می‌شود.
   */
  images: z.array(z.string().url()),

  /**
   * مشخصات فنی محصول به صورت key-value.
   * کلیدها و مقادیر معمولاً فارسی هستند اما ممکن است انگلیسی هم باشند.
   * مثال: { 'رنگ': 'مشکی', 'گارانتی': '۱۸ ماهه', 'وزن': '۱۵۰ گرم' }
   * object خالی ({}) اگر مشخصاتی یافت نشد.
   */
  attributes: z.record(z.string(), z.string()),

  /**
   * دسته‌بندی محصول در سایت مبدأ (breadcrumb آخر).
   * ممکن است با دسته‌بندی‌های قطعه‌لاین همخوانی نداشته باشد.
   * CategoryMapping جدول این تبدیل را انجام می‌دهد.
   * مثال: 'لپ‌تاپ و تبلت › لوازم جانبی › کابل و شارژر'
   */
  category: z.string().optional(),

  /**
   * برند محصول اگر از مشخصات یا عنوان قابل استخراج باشد.
   * مثال: 'سامسونگ'، 'بوش'، 'ایران‌خودرو'، 'ACDelco'
   */
  brand: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Inventory Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CrawledInventorySchema — اطلاعات موجودی و قیمت از سایت.
 *
 * این اطلاعات snapshot لحظه کرال است.
 * قیمت و موجودی واقعی در قطعه‌لاین ممکن است متفاوت تنظیم شوند.
 */
export const CrawledInventorySchema = z.object({
  /**
   * قیمت فروش به ریال — همانطور که در سایت نمایش داده می‌شود.
   * عدد صحیح غیرمنفی (ریال، نه تومان).
   * مثال: 1500000 = ۱,۵۰۰,۰۰۰ ریال = ۱۵۰,۰۰۰ تومان
   */
  price: z.number().int().nonnegative(),

  /**
   * قیمت اصلی قبل از تخفیف به ریال.
   * وقتی سایت قیمت خط‌خورده‌ای نشان می‌دهد این فیلد پر می‌شود.
   * اگر تخفیفی نبود undefined است (نه صفر).
   */
  originalPrice: z.number().int().nonnegative().optional(),

  /**
   * آیا محصول در لحظه کرال موجود بود.
   * false → نباید به قطعه‌لاین publish شود مگر با تایید دستی اپراتور.
   */
  inStock: z.boolean(),

  /**
   * تعداد موجودی اگر سایت اطلاع دهد.
   * بعضی سایت‌ها فقط "موجود" یا "ناموجود" نشان می‌دهند.
   * در آن صورت undefined است — نه صفر.
   */
  quantity: z.number().int().nonnegative().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CrawledProductDataSchema — schema اصلی خروجی هر crawler adapter.
 *
 * این schema نقش contract بین adapters و بقیه pipeline را دارد.
 * قبل از ذخیره در DB در validation اجرا می‌شود.
 *
 * استفاده: در src/lib/crawler/schema.ts توابع validateCrawledData و
 * isValidProductData این schema را استفاده می‌کنند.
 */
export const CrawledProductDataSchema = z.object({
  /** اطلاعات سایت مبدأ و زمان کرال */
  source: CrawledSourceSchema,

  /** داده خام محصول از سایت */
  product: CrawledProductInfoSchema,

  /** قیمت و موجودی لحظه کرال */
  inventory: CrawledInventorySchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// Inferred TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TypeScript types مستقیم از Zod schemas.
 *
 * استفاده از z.infer این مزیت را دارد که اگر schema تغییر کند،
 * type هم تغییر می‌کند — هیچ‌گاه drift بین type و validator نداریم.
 */
export type CrawledSource = z.infer<typeof CrawledSourceSchema>;
export type CrawledProductInfo = z.infer<typeof CrawledProductInfoSchema>;
export type CrawledInventory = z.infer<typeof CrawledInventorySchema>;

/**
 * CrawledProductData — نوع اصلی خروجی هر crawler adapter.
 *
 * هر adapter باید این نوع را برگرداند:
 *   crawlProduct(url: string): Promise<CrawledProductData>
 *
 * این نوع در فیلد rawData جدول crawled_products به صورت jsonb ذخیره می‌شود.
 */
export type CrawledProductData = z.infer<typeof CrawledProductDataSchema>;
