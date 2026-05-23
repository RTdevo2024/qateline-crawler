// ─────────────────────────────────────────────────────────────────────────────
// Primitive Status Types
// ─────────────────────────────────────────────────────────────────────────────

/** وضعیت محصول — مطابق مستندات API: publish یا draft */
export type GhatelineProductStatus = 'publish' | 'draft';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-object Types (استفاده در CreateProductRequest و GhatelineProduct)
// ─────────────────────────────────────────────────────────────────────────────

/** یک تب محتوا در صفحه محصول */
export interface GhatelineTab {
  title: string;
  content: string;
  sort?: number;
}

/**
 * یک ویژگی (مشخصه فنی) محصول.
 * مثال: { key: "رنگ", value: "مشکی" }
 */
export interface GhatelineAttrItem {
  key: string;
  value: string;
}

/** یک آیتم تصویر محصول */
export interface GhatelineImageItem {
  url: string;
  alt?: string;
  title?: string;
  sort?: number;
  is_main?: boolean;
}

/** مجموعه ویدیوهای محصول */
export interface GhatelineVideos {
  /** آدرس ویدیوی اصلی */
  main?: string;
  /** آدرس پیش‌نمایش (thumbnail/short clip) */
  preview?: string;
}

/**
 * یک نمونه قیمت در price_model.
 * هر محصول می‌تواند چند variant قیمتی داشته باشد.
 */
export interface GhatelinePriceModelItem {
  title: string;
  price: number;
  compare_price?: number;
  in_stock?: boolean;
  quantity?: number;
}

/** تنظیمات استعلام قیمت */
export interface GhatelineInquiryOptions {
  enabled?: boolean;
  phone?: string;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

/** meta پاسخ‌های لیستی — ساختار Laravel-style */
export interface GhatelinePagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response Wrappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * پاسخ لیستی از API قطعه‌لاین.
 *
 * ساختار: { success?, data: T[], meta?: {...} }
 * success اختیاری است چون برخی endpoint ها آن را حذف می‌کنند.
 */
export interface GhatelineListApiResponse<T> {
  success?: boolean;
  data: T[];
  meta?: GhatelinePagination;
  message?: string;
  code?: number;
}

/**
 * پاسخ عمومی API قطعه‌لاین برای endpoint های غیر-لیستی.
 *
 * data یا response — بسته به endpoint ممکن است یکی از دو فیلد پر باشد.
 */
export interface GhatelineApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  response?: T;
  code?: number;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GhatelineProduct — جزئیات کامل یک محصول در سیستم قطعه‌لاین.
 *
 * برگشتی از:
 *   GET /api/v1/products        (در data آرایه)
 *   GET /api/v1/products/{uuid} (object تکی)
 */
export interface GhatelineProduct {
  uuid: string;
  user_id: number;
  category_id: number;
  title: string;
  brand?: string;
  title_en?: string;
  slug?: string;
  content?: string;
  warnings?: string;
  guide?: string;
  tabs?: GhatelineTab[];
  attrs?: GhatelineAttrItem[];
  images?: GhatelineImageItem[];
  videos?: GhatelineVideos;
  model_3d?: string;
  price_model?: GhatelinePriceModelItem[];
  commission?: number;
  in_stock_status?: boolean;
  inquiry_options?: GhatelineInquiryOptions;
  seo_title?: string;
  seo_description?: string;
  seo_canonical?: string;
  is_vip?: boolean;
  comment_status?: boolean;
  question_status?: boolean;
  status: GhatelineProductStatus;
  sub_categories?: number[];
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CreateProductRequest — body درخواست POST /api/v1/products/create
 *
 * فیلدهای اجباری: user_id، category_id، title
 *
 * نکات مهم:
 * - user_id باید integer باشد — از parseInt(GHATELINE_ADMIN_USER_ID) بگیرید
 * - status پیش‌فرض 'draft' است تا بررسی نهایی انجام شود
 * - uuid اختیاری است — برای ایجاد idempotent استفاده کنید
 */
export interface CreateProductRequest {
  /** شناسه عددی کاربر admin — integer، اجباری */
  user_id: number;
  /** شناسه عددی دسته‌بندی اصلی — integer، اجباری */
  category_id: number;
  /** عنوان محصول — اجباری */
  title: string;
  /** برند محصول */
  brand?: string;
  /** عنوان انگلیسی */
  title_en?: string;
  /** slug URL-friendly */
  slug?: string;
  /** توضیحات کامل — می‌تواند HTML باشد */
  content?: string;
  /** هشدارها — می‌تواند HTML باشد */
  warnings?: string;
  /** راهنمای استفاده — می‌تواند HTML باشد */
  guide?: string;
  /** تب‌های محتوایی */
  tabs?: GhatelineTab[];
  /** مشخصات فنی — آرایه‌ای از key/value */
  attrs?: GhatelineAttrItem[];
  /** تصاویر محصول */
  images?: GhatelineImageItem[];
  /** ویدیوها */
  videos?: GhatelineVideos;
  /** آدرس مدل سه‌بعدی — URL */
  model_3d?: string;
  /** مدل‌های قیمتی (variants) */
  price_model?: GhatelinePriceModelItem[];
  /** درصد پورسانت — integer 0–100 */
  commission?: number;
  /** وضعیت موجودی کلی */
  in_stock_status?: boolean;
  /** تنظیمات استعلام قیمت */
  inquiry_options?: GhatelineInquiryOptions;
  /** عنوان SEO */
  seo_title?: string;
  /** توضیحات SEO */
  seo_description?: string;
  /** canonical URL */
  seo_canonical?: string;
  /** آیا محصول VIP است */
  is_vip?: boolean;
  /** فعال بودن بخش نظرات */
  comment_status?: boolean;
  /** فعال بودن بخش سوال و جواب */
  question_status?: boolean;
  /** وضعیت — پیش‌فرض 'draft' */
  status?: GhatelineProductStatus;
  /** دسته‌بندی‌های فرعی — آرایه‌ای از شناسه‌های عددی */
  sub_categories?: number[];
  /** UUID دلخواه برای ایجاد idempotent */
  uuid?: string;
}

/**
 * CreateProductApiResponse — پاسخ POST /api/v1/products/create
 *
 * توجه: product_uuid است نه uuid
 */
export interface CreateProductApiResponse {
  success: boolean;
  message: string;
  /** UUID محصول تازه‌ایجادشده — این مقدار را در DB ذخیره کنید */
  product_uuid: string;
  code: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UpdateProductRequest — body درخواست PUT /api/v1/products/{uuid}
 *
 * همه فیلدهای CreateProductRequest اختیاری هستند.
 * user_id و category_id و uuid از درخواست update حذف شده‌اند.
 */
export type UpdateProductRequest = Partial<
  Omit<CreateProductRequest, 'user_id' | 'category_id' | 'uuid'>
>;

// ─────────────────────────────────────────────────────────────────────────────
// List Products
// ─────────────────────────────────────────────────────────────────────────────

/** پارامترهای query برای GET /api/v1/products */
export interface ListProductsParams {
  page?: number;
  per_page?: number;
  status?: GhatelineProductStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GhatelineValidationError — ساختار خطای HTTP 422
 *
 * errors: کلید = نام فیلد، مقدار = آرایه پیام‌های خطا
 */
export interface GhatelineValidationError {
  message: string;
  errors: Record<string, string[]>;
}
