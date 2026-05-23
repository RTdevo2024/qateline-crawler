/**
 * ghateline.ts — تایپ‌های API قطعه‌لاین (Ghateline)
 *
 * این فایل تمام interface های مربوط به ارتباط با REST API قطعه‌لاین را تعریف
 * می‌کند. مستندات کامل endpoint ها در docs/API_CONTRACTS.md موجود است.
 *
 * اطلاعات اتصال:
 *   Base URL : https://ghateline.com
 *   Auth     : X-API-KEY header (نه Bearer token)
 *   Format   : application/json
 *
 * متغیرهای محیطی مرتبط:
 *   GHATELINE_API_KEY            — کلید احراز هویت
 *   GHATELINE_ADMIN_USER_ID      — UUID کاربر admin برای انتساب محصولات
 *   GHATELINE_DEFAULT_STORAGE_UUID — UUID انبار پیش‌فرض برای موجودی
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * وضعیت یک محصول در قطعه‌لاین.
 *
 * draft    → پیش‌نویس — در فروشگاه نمایش داده نمی‌شود (حالت پیش‌فرض هنگام ایجاد)
 * active   → فعال — قابل جستجو و خرید در فروشگاه است
 * inactive → غیرفعال — موقتاً از دسترس خارج شده
 */
export type GhatelineProductStatus = 'draft' | 'active' | 'inactive';

/**
 * وضعیت یک انبار در قطعه‌لاین.
 *
 * active   → انبار فعال است و محصولات قابل فروش هستند
 * inactive → انبار غیرفعال است
 */
export type GhatelineStorageStatus = 'active' | 'inactive';

/**
 * وضعیت موجودی یک محصول در انبار قطعه‌لاین.
 *
 * available   → محصول در انبار موجود است و قابل فروش است
 * unavailable → موجودی تمام شده یا از فروش خارج شده
 */
export type GhatelineInventoryStatus = 'available' | 'unavailable';

// ─────────────────────────────────────────────────────────────────────────────
// API Response Wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ApiResponse<T> — wrapper استاندارد پاسخ‌های API قطعه‌لاین.
 *
 * توجه: قطعه‌لاین در endpoint های مختلف یا از فیلد data یا از response
 * استفاده می‌کند. هر دو اختیاری تعریف شده‌اند — کد مصرف‌کننده باید
 * هر دو را بررسی کند: data ?? response
 */
export interface ApiResponse<T> {
  /** آیا درخواست با موفقیت انجام شد */
  success: boolean;
  /** داده پاسخ — endpoint های جدیدتر */
  data?: T;
  /** داده پاسخ — endpoint های قدیمی‌تر (نام متفاوت، محتوا یکسان) */
  response?: T;
  /** کد وضعیت داخلی API قطعه‌لاین (ممکن است با HTTP status متفاوت باشد) */
  code?: number;
  /** پیام توضیحی — در خطاها همیشه پر است */
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GhatelineProduct — جزئیات کامل یک محصول در سیستم قطعه‌لاین.
 *
 * برگشتی GET /api/v1/products/{uuid}
 * پس از ایجاد محصول (POST /api/v1/products/create)، UUID را ذخیره کنید
 * تا در مراحل بعدی (موجودی، به‌روزرسانی) استفاده شود.
 */
export interface GhatelineProduct {
  /** شناسه یکتای محصول به فرمت UUID v4 */
  uuid: string;
  /** عنوان فارسی محصول */
  title: string;
  /** توضیحات کامل محصول — ممکن است HTML داشته باشد */
  description?: string;
  /** قیمت فروش به ریال */
  price: number;
  /** وضعیت نمایش محصول در فروشگاه */
  status: GhatelineProductStatus;
  /** آرایه URL تصاویر محصول */
  images?: string[];
  /**
   * مشخصات فنی محصول به صورت key-value فارسی.
   * مثال: { "برند": "سامسونگ", "گارانتی": "۱۸ ماهه" }
   */
  attributes?: Record<string, string>;
  /** تاریخ ایجاد محصول — ISO 8601 */
  created_at: string;
  /** تاریخ آخرین به‌روزرسانی — ISO 8601 */
  updated_at: string;
}

/**
 * CreateProductRequest — body درخواست ایجاد محصول جدید.
 *
 * ارسال به POST /api/v1/products/create
 * فیلدهای اجباری: title، price، user_id
 *
 * user_id باید از env.GHATELINE_ADMIN_USER_ID گرفته شود.
 */
export interface CreateProductRequest {
  /** عنوان محصول — اجباری، فارسی و SEO-friendly */
  title: string;
  /** قیمت فروش به ریال — اجباری، عدد صحیح مثبت */
  price: number;
  /** UUID کاربر admin — اجباری، از GHATELINE_ADMIN_USER_ID */
  user_id: string;
  /** توضیحات کامل محصول — اختیاری */
  description?: string;
  /** وضعیت اولیه — پیش‌فرض 'draft' تا بررسی نهایی */
  status?: GhatelineProductStatus;
  /**
   * مشخصات فنی — اختیاری.
   * کلیدها و مقادیر باید فارسی باشند.
   * مثال: { "برند": "بوش", "مدل": "GBM-350" }
   */
  attributes?: Record<string, string>;
  /** آرایه URL تصاویر — اختیاری */
  images?: string[];
}

/**
 * CreateProductResponse — پاسخ ایجاد موفق محصول.
 *
 * برگشتی POST /api/v1/products/create با HTTP 201
 * uuid برگشتی را در DB ذخیره کنید (فیلد ghatelineProductUuid).
 */
export interface CreateProductResponse {
  /** UUID محصول تازه‌ایجادشده — باید در DB ذخیره شود */
  uuid: string;
  /** عنوان ذخیره‌شده */
  title: string;
  /** وضعیت اولیه */
  status: GhatelineProductStatus;
  /** تاریخ ایجاد — ISO 8601 */
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GhatelineInventory — جزئیات موجودی یک محصول در یک انبار.
 *
 * برگشتی GET /api/v1/inventories/show/{inventory_uuid}
 * هر محصول می‌تواند در چند انبار موجودی داشته باشد.
 * ما معمولاً فقط یک موجودی در انبار پیش‌فرض (GHATELINE_DEFAULT_STORAGE_UUID) ایجاد می‌کنیم.
 */
export interface GhatelineInventory {
  /** شناسه یکتای موجودی — UUID v4 */
  uuid: string;
  /** UUID محصول مرتبط */
  product_uuid: string;
  /** UUID انباری که این موجودی در آن است */
  storage_uuid: string;
  /** تعداد موجود در انبار */
  quantity: number;
  /** قیمت فروش به ریال — می‌تواند با قیمت محصول متفاوت باشد */
  price: number;
  /** وضعیت در دسترس بودن */
  status: GhatelineInventoryStatus;
  /** تاریخ ایجاد — ISO 8601 (در برخی endpoint ها ممکن است نباشد) */
  created_at?: string;
}

/**
 * CreateInventoryRequest — body درخواست ایجاد موجودی.
 *
 * ارسال به POST /api/v1/inventories/product/{product_uuid}/create
 * فیلدهای اجباری: storage_uuid، quantity، price
 *
 * storage_uuid باید از env.GHATELINE_DEFAULT_STORAGE_UUID گرفته شود.
 */
export interface CreateInventoryRequest {
  /** UUID انبار — اجباری، از GHATELINE_DEFAULT_STORAGE_UUID */
  storage_uuid: string;
  /** تعداد اولیه — اجباری، حداقل ۱ */
  quantity: number;
  /** قیمت فروش به ریال — اجباری */
  price: number;
  /** وضعیت — پیش‌فرض 'available' */
  status?: GhatelineInventoryStatus;
}

/**
 * CreateInventoryResponse — پاسخ ایجاد موفق موجودی.
 *
 * برگشتی POST /api/v1/inventories/product/{product_uuid}/create با HTTP 201
 * uuid برگشتی را در DB ذخیره کنید (فیلد ghatelineInventoryUuid).
 */
export interface CreateInventoryResponse {
  /** UUID موجودی تازه‌ایجادشده — باید در DB ذخیره شود */
  uuid: string;
  /** UUID محصول مرتبط */
  product_uuid: string;
  /** UUID انبار */
  storage_uuid: string;
  /** تعداد ثبت‌شده */
  quantity: number;
  /** قیمت ثبت‌شده به ریال */
  price: number;
  /** وضعیت ثبت‌شده */
  status: GhatelineInventoryStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GhatelineStorage — اطلاعات یک انبار در قطعه‌لاین.
 *
 * برگشتی GET /api/v1/storages
 * معمولاً فقط یک انبار اصلی داریم — UUID آن در GHATELINE_DEFAULT_STORAGE_UUID است.
 */
export interface GhatelineStorage {
  /** شناسه یکتای انبار — UUID v4 */
  uuid: string;
  /** نام نمایشی انبار (مثال: "انبار اصلی") */
  name: string;
  /** وضعیت انبار */
  status: GhatelineStorageStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Responses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GhatelineValidationError — ساختار خطای HTTP 422 از قطعه‌لاین.
 *
 * وقتی داده ورودی invalid باشد، قطعه‌لاین این ساختار را برمی‌گرداند.
 * errors کلید = نام فیلد، مقدار = آرایه پیام‌های خطا برای آن فیلد.
 */
export interface GhatelineValidationError {
  /** پیام کلی (مثال: "The given data was invalid.") */
  message: string;
  /** خطاهای per-field — مثال: { "title": ["The title field is required."] } */
  errors: Record<string, string[]>;
}
