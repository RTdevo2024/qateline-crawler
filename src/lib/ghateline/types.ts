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

// ─────────────────────────────────────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────────────────────────────────────

/** آیتم تصویر موجودی */
export interface GhatelineInventoryImage {
  url: string;
  alt?: string;
}

/**
 * GhatelineInventory — یک رکورد موجودی در سیستم قطعه‌لاین.
 *
 * برگشتی از:
 *   GET /api/v1/inventories/product/{product_uuid}  (در data آرایه)
 *   GET /api/v1/inventories/show/{inventory_uuid}   (object تکی)
 */
export interface GhatelineInventory {
  uuid: string;
  product_uuid: string;
  storage_uuid: string;
  user_id: number;
  price: number;
  discount_price?: number;
  discount_expire?: string;
  discount_tree?: number[];
  count: number;
  min_sale?: number;
  max_sale?: number;
  original?: boolean;
  used?: boolean;
  weight?: number;
  purchase_price?: number;
  image?: GhatelineInventoryImage;
  send_time?: string;
  /** variables — کلید = عنوان variant (مثلاً «رنگ»)، مقدار = مقدار انتخابی */
  variables?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/**
 * CreateInventoryRequest — body درخواست:
 * POST /api/v1/inventories/product/{product_uuid}/create
 *
 * فیلدهای اجباری: user_id، storage_uuid، price، count
 */
export interface CreateInventoryRequest {
  /** شناسه عددی کاربر admin — integer، اجباری */
  user_id: number;
  /** UUID انبار — از GHATELINE_DEFAULT_STORAGE_UUID */
  storage_uuid: string;
  /**
   * variants انتخاب‌شده برای این موجودی.
   * مثال: { "رنگ": "مشکی", "سایز": "XL" }
   * باید با price_model محصول مطابقت داشته باشد.
   */
  variables?: Record<string, string>;
  /** قیمت فروش — ریال، integer */
  price: number;
  /** قیمت با تخفیف */
  discount_price?: number;
  /** تاریخ انقضا تخفیف — فرمت Y/m/d */
  discount_expire?: string;
  /** درخت تخفیف */
  discount_tree?: number[];
  /** تعداد موجودی */
  count: number;
  /** حداقل تعداد در هر سفارش */
  min_sale?: number;
  /** حداکثر تعداد در هر سفارش */
  max_sale?: number;
  /** آیا محصول اصل است */
  original?: boolean;
  /** آیا محصول دست دوم است */
  used?: boolean;
  /** وزن — گرم */
  weight?: number;
  /** قیمت خرید (هزینه تمام‌شده) */
  purchase_price?: number;
  /** تصویر موجودی */
  image?: GhatelineInventoryImage;
  /** زمان ارسال */
  send_time?: string;
}

/**
 * CreateInventoryApiResponse — پاسخ POST .../create
 */
export interface CreateInventoryApiResponse {
  success: boolean;
  message: string;
  /** UUID موجودی تازه‌ایجادشده */
  inventory_uuid: string;
  code: number;
}

/** پارامترهای query برای GET /api/v1/inventories/product/{uuid} */
export interface ListInventoriesParams {
  page?: number;
  per_page?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GhatelineStorage — یک انبار در سیستم قطعه‌لاین.
 *
 * برگشتی از GET /api/v1/storages
 */
export interface GhatelineStorage {
  uuid: string;
  name: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

/** آیتم لیست محصولات یک انبار */
export interface GhatelineStorageProduct {
  product_uuid: string;
  title: string;
  quantity: number;
}

/** پارامترهای query برای لیست انبارها */
export interface ListStoragesParams {
  page?: number;
  per_page?: number;
}

/** پارامترهای query برای لیست محصولات یک انبار */
export interface ListStorageProductsParams {
  page?: number;
  per_page?: number;
}
