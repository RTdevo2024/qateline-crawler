# API_CONTRACTS.md — قراردادهای API

> این فایل شکل دقیق همه API های پروژه را مستند می‌کند.
> هر تغییر در API باید ابتدا اینجا ثبت شود (contract-first).

---

## فهرست

1. [API های داخلی پنل ادمین (Next.js Route Handlers)](#api-های-داخلی-پنل-ادمین)
2. [API قطعه‌لاین (Ghateline)](#api-قطعه‌لاین)
3. [API هوش مصنوعی](#api-هوش-مصنوعی)

---

## فرمت استاندارد پاسخ

همه API های داخلی از این فرمت استفاده می‌کنند:

**موفق:**
```json
{ "success": true, "data": <payload> }
```

**ناموفق:**
```json
{
  "success": false,
  "error": {
    "message": "توضیح خطا",
    "code": "ERROR_CODE",
    "details": []
  }
}
```

**کدهای خطا:**

| code | HTTP | توضیح |
|------|------|-------|
| `VALIDATION_ERROR` | 400 | ورودی نامعتبر (Zod) |
| `BAD_REQUEST` | 400 | درخواست نادرست |
| `NOT_FOUND` | 404 | رکورد یافت نشد |
| `CONFLICT` | 409 | داده تکراری (unique constraint) |
| `DUPLICATE` | 409 | مقدار تکراری (P2002) |
| `FOREIGN_KEY_ERROR` | 400 | رکورد مرتبط یافت نشد (P2003) |
| `INTERNAL_ERROR` | 500 | خطای داخلی سرور |

---

## API های داخلی پنل ادمین

**Base URL (development):** `http://localhost:3000`
**پیاده‌سازی helper:** `src/lib/api-helpers.ts`

---

### Sites — مدیریت سایت‌های منبع

#### `GET /api/sites`

لیست همه SourceSite ها با pagination.

**Query Params:**
```
page?  — شماره صفحه (default: 1)
limit? — تعداد در صفحه (default: 20, max: 100)
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clu...",
        "name": "یدک مارکت",
        "slug": "yadakmarket",
        "baseUrl": "https://yadakmarket.com",
        "adapterKey": "yadakmarket",
        "requiresBrowser": false,
        "isActive": true,
        "successCount": 120,
        "failCount": 5,
        "createdAt": "2026-05-25T10:00:00Z",
        "updatedAt": "2026-05-25T10:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
  }
}
```

---

#### `POST /api/sites`

ایجاد SourceSite جدید.

**Request Body:**
```json
{
  "name": "یدک مارکت",
  "slug": "yadakmarket",
  "baseUrl": "https://yadakmarket.com",
  "adapterKey": "yadakmarket",
  "requiresBrowser": false,
  "isActive": true
}
```

**Validation:**
- `name`: required, 1-100 کاراکتر
- `slug`: required, 1-50 کاراکتر، فقط `a-z0-9-`
- `baseUrl`: required, URL معتبر
- `adapterKey`: required, 1-50 کاراکتر
- `requiresBrowser`: optional, boolean, default: false
- `isActive`: optional, boolean, default: true

**Response 201:** آبجکت SourceSite ایجادشده

**Response 400:** خطای validation

**Response 409:** slug تکراری

---

#### `GET /api/sites/[id]`

جزئیات یک SourceSite.

**Response 200:** آبجکت SourceSite کامل

**Response 404:** سایت پیدا نشد

---

#### `PUT /api/sites/[id]`

ویرایش SourceSite. همه فیلدها اختیاری هستند.

**Request Body:** زیرمجموعه‌ای از فیلدهای CreateSite

**Response 200:** آبجکت SourceSite به‌روزشده

---

#### `DELETE /api/sites/[id]`

حذف SourceSite.

**Response 200:**
```json
{ "success": true, "data": { "deleted": true, "id": "clu..." } }
```

---

### Crawl Jobs — مدیریت job های کرال

#### `GET /api/crawl-jobs`

لیست crawl job ها با pagination و فیلتر.

**Query Params:**
```
page?         — شماره صفحه (default: 1)
limit?        — تعداد در صفحه (default: 20, max: 100)
status?       — PENDING | RUNNING | COMPLETED | FAILED | CANCELLED
sourceSiteId? — فیلتر بر اساس سایت منبع
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clv...",
        "sourceSiteId": "clu...",
        "status": "COMPLETED",
        "total": 50,
        "succeeded": 48,
        "failed": 2,
        "createdAt": "2026-05-25T10:00:00Z",
        "updatedAt": "2026-05-25T10:05:00Z",
        "sourceSite": { "id": "clu...", "name": "یدک مارکت", "slug": "yadakmarket" },
        "_count": { "products": 50 }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
  }
}
```

---

#### `POST /api/crawl-jobs`

ایجاد crawl job جدید و enqueue کردن URL ها.

**Request Body:**
```json
{
  "sourceSiteId": "clu...",
  "urls": [
    "https://yadakmarket.com/product/1/",
    "https://yadakmarket.com/product/2/"
  ]
}
```

**Validation:**
- `sourceSiteId`: required, باید در DB وجود داشته باشد و isActive = true
- `urls`: required, آرایه 1-500 URL معتبر

**جریان داخلی:**
1. بررسی وجود و فعال بودن SourceSite
2. ایجاد CrawlJob با `total = urls.length` و status = PENDING
3. ایجاد یک CrawledProduct (status = RAW) به ازای هر URL (در یک transaction)
4. enqueue کردن هر محصول در crawlQueue

**Response 201:**
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "clv...",
      "sourceSiteId": "clu...",
      "status": "PENDING",
      "total": 2,
      "createdAt": "2026-05-25T10:00:00Z"
    },
    "enqueued": 2,
    "failed": 0
  }
}
```

**Response 400:** sourceSiteId نامعتبر یا سایت غیرفعال

---

#### `GET /api/crawl-jobs/[id]`

جزئیات و آمار یک crawl job.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "clv...",
    "sourceSiteId": "clu...",
    "inputUrls": ["https://..."],
    "status": "COMPLETED",
    "total": 50,
    "succeeded": 48,
    "failed": 2,
    "createdAt": "2026-05-25T10:00:00Z",
    "sourceSite": { "id": "clu...", "name": "یدک مارکت", "slug": "yadakmarket", "baseUrl": "https://yadakmarket.com" },
    "stats": {
      "total": 50,
      "succeeded": 48,
      "failed": 2,
      "byStatus": {
        "PUBLISHED": 40,
        "REVIEWED": 5,
        "PROCESSED": 3,
        "FAILED": 2
      }
    }
  }
}
```

---

### Crawled Products — مدیریت محصولات کرال‌شده

#### `GET /api/crawled-products`

لیست محصولات کرال‌شده با pagination و فیلتر.

**Query Params:**
```
page?       — شماره صفحه (default: 1)
limit?      — تعداد در صفحه (default: 20, max: 100)
status?     — RAW | PROCESSED | REVIEWED | PUBLISHED | REJECTED | PARTIAL | FAILED
crawlJobId? — فیلتر بر اساس job
search?     — جستجو در عنوان (rawData.product.title یا processedData.output.title)
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clw...",
        "crawlJobId": "clv...",
        "sourceUrl": "https://yadakmarket.com/product/1/",
        "status": "PROCESSED",
        "ghatelineProductUuid": null,
        "ghatelineInventoryUuid": null,
        "errorMessage": null,
        "reviewedBy": null,
        "rawAt": "2026-05-25T10:01:00Z",
        "processedAt": "2026-05-25T10:02:00Z",
        "reviewedAt": null,
        "publishedAt": null,
        "createdAt": "2026-05-25T10:00:00Z",
        "updatedAt": "2026-05-25T10:02:00Z",
        "crawlJob": {
          "id": "clv...",
          "sourceSite": { "id": "clu...", "name": "یدک مارکت", "slug": "yadakmarket" }
        }
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 120, "totalPages": 6 }
  }
}
```

> **نکته:** `rawData`، `processedData`، و `finalData` در لیست برگردانده نمی‌شوند.
> برای داده‌های کامل از `GET /api/crawled-products/[id]` استفاده کنید.

---

#### `GET /api/crawled-products/[id]`

جزئیات کامل یک محصول شامل raw + processed + final data.

**Response 200:** آبجکت CrawledProduct کامل با همه فیلدهای JSON

```json
{
  "success": true,
  "data": {
    "id": "clw...",
    "crawlJobId": "clv...",
    "sourceUrl": "https://...",
    "rawData": { "source": {...}, "product": {...}, "inventory": {...} },
    "processedData": { "output": {...}, "meta": {...} },
    "finalData": { "title": "عنوان نهایی", ... },
    "status": "PROCESSED",
    "crawlJob": {
      "id": "clv...",
      "status": "COMPLETED",
      "sourceSite": { "id": "clu...", "name": "یدک مارکت", "slug": "yadakmarket", "baseUrl": "https://..." }
    },
    ...
  }
}
```

---

#### `PUT /api/crawled-products/[id]`

به‌روزرسانی `finalData` توسط اپراتور (ویرایش دستی قبل از تایید).

**Request Body:**
```json
{
  "finalData": {
    "title": "عنوان ویرایش‌شده",
    "price": 450000,
    "brand": "بوش",
    "attrs": [{ "key": "رنگ", "value": "مشکی" }]
  }
}
```

**Validation:**
- `finalData`: required, آبجکت JSON معتبر (هر شکلی)

**Response 200:** آبجکت CrawledProduct به‌روزشده

---

#### `DELETE /api/crawled-products/[id]`

حذف دائمی یک محصول.

**Response 200:**
```json
{ "success": true, "data": { "deleted": true, "id": "clw..." } }
```

---

#### `POST /api/crawled-products/[id]/approve`

تایید محصول توسط اپراتور — status به REVIEWED تغییر می‌کند و publish job enqueue می‌شود.

**پیش‌نیاز:** status باید `PROCESSED` یا `PARTIAL` باشد

**Request Body (اختیاری):**
```json
{
  "reviewedBy": "operator@company.com"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "clw...",
    "status": "REVIEWED",
    "reviewedAt": "2026-05-25T11:00:00Z",
    "reviewedBy": "operator@company.com",
    "publishJobId": "bullmq-job-id"
  }
}
```

**Response 400:** اگر status قابل تایید نباشد

---

#### `POST /api/crawled-products/[id]/reject`

رد کردن محصول توسط اپراتور — status به REJECTED تغییر می‌کند.

**محدودیت:** محصولات PUBLISHED و از قبل REJECTED قابل رد شدن نیستند

**Request Body (اختیاری):**
```json
{
  "reason": "کیفیت تصاویر پایین است"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "clw...",
    "status": "REJECTED",
    "reason": "کیفیت تصاویر پایین است"
  }
}
```

---

## API قطعه‌لاین

**Base URL:** `https://ghateline.com` (از `GHATELINE_API_BASE_URL` خوانده می‌شود)
**Auth Header:** `X-API-KEY: <GHATELINE_API_KEY>`
**Content-Type:** `application/json`

> پیاده‌سازی کلاینت: `src/lib/ghateline/`
> Types کامل: `src/lib/ghateline/types.ts`

---

### `GET /api/v1/products`

لیست محصولات با pagination.

**Query Parameters:**
```
page?:     number          — شماره صفحه (از ۱)
per_page?: number (1–100) — تعداد در هر صفحه
status?:   "publish"|"draft"
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "user_id": 42,
      "category_id": 7,
      "title": "فیلتر روغن سامسونگ",
      "brand": "سامسونگ",
      "title_en": "Samsung Oil Filter",
      "slug": "filter-roghan-samsung",
      "status": "publish",
      "attrs": [
        { "key": "جنس", "value": "فلز" },
        { "key": "گارانتی", "value": "۶ ماهه" }
      ],
      "images": [
        { "url": "https://cdn.example.com/img1.jpg", "is_main": true }
      ],
      "created_at": "2026-05-23T10:00:00Z",
      "updated_at": "2026-05-23T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "last_page": 8
  }
}
```

**TypeScript:** `ProductsApi.list(params?)` → `PaginatedResponse<GhatelineProduct>`

---

### `GET /api/v1/products/{uuid}`

جزئیات کامل یک محصول.

**Path Parameter:** `uuid` — UUID v4 محصول

**Response 200:**
```json
{
  "success": true,
  "data": {
    "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "user_id": 42,
    "category_id": 7,
    "title": "فیلتر روغن سامسونگ",
    "brand": "سامسونگ",
    "title_en": "Samsung Oil Filter",
    "slug": "filter-roghan-samsung",
    "content": "<p>توضیحات کامل...</p>",
    "warnings": "<p>هشدارها...</p>",
    "guide": "<p>راهنمای استفاده...</p>",
    "tabs": [
      { "title": "مشخصات", "content": "<p>...</p>", "sort": 1 }
    ],
    "attrs": [
      { "key": "جنس", "value": "فلز" }
    ],
    "images": [
      {
        "url": "https://cdn.example.com/img1.jpg",
        "alt": "تصویر اصلی",
        "is_main": true,
        "sort": 1
      }
    ],
    "videos": {
      "main": "https://cdn.example.com/video.mp4"
    },
    "price_model": [
      {
        "title": "استاندارد",
        "price": 150000,
        "compare_price": 180000,
        "in_stock": true,
        "quantity": 10
      }
    ],
    "commission": 5,
    "in_stock_status": true,
    "seo_title": "فیلتر روغن سامسونگ | قطعه‌لاین",
    "seo_description": "خرید فیلتر روغن سامسونگ با بهترین قیمت",
    "is_vip": false,
    "comment_status": true,
    "question_status": true,
    "status": "publish",
    "sub_categories": [12, 15],
    "created_at": "2026-05-23T10:00:00Z",
    "updated_at": "2026-05-23T10:00:00Z"
  }
}
```

**TypeScript:** `ProductsApi.get(uuid)` → `GhatelineProduct`

---

### `POST /api/v1/products/create`

ایجاد محصول جدید.

**Request Body — فیلدهای کامل:**

| فیلد | نوع | اجباری | توضیح |
|------|-----|--------|-------|
| `user_id` | integer | ✅ | از `parseInt(GHATELINE_ADMIN_USER_ID)` |
| `category_id` | integer | ✅ | شناسه دسته‌بندی اصلی |
| `title` | string | ✅ | عنوان فارسی |
| `brand` | string | — | نام برند |
| `title_en` | string | — | عنوان انگلیسی |
| `slug` | string | — | URL slug |
| `content` | string | — | توضیحات کامل (HTML) |
| `warnings` | string | — | هشدارها (HTML) |
| `guide` | string | — | راهنما (HTML) |
| `tabs` | array | — | تب‌های محتوا `[{title, content, sort?}]` |
| `attrs` | array | — | مشخصات فنی `[{key, value}]` |
| `images` | array | — | تصاویر `[{url, alt?, is_main?, sort?}]` |
| `videos` | object | — | `{main?: url, preview?: url}` |
| `model_3d` | url | — | آدرس مدل سه‌بعدی |
| `price_model` | array | — | `[{title, price, compare_price?, in_stock?, quantity?}]` |
| `commission` | integer | — | درصد پورسانت (0–100) |
| `in_stock_status` | boolean | — | وضعیت کلی موجودی |
| `inquiry_options` | object | — | `{enabled?, phone?, message?}` |
| `seo_title` | string | — | عنوان SEO |
| `seo_description` | string | — | توضیحات SEO |
| `seo_canonical` | url | — | canonical URL |
| `is_vip` | boolean | — | محصول VIP |
| `comment_status` | boolean | — | فعال بودن نظرات |
| `question_status` | boolean | — | فعال بودن سوال و جواب |
| `status` | `"publish"\|"draft"` | — | پیش‌فرض: `"draft"` |
| `sub_categories` | integer[] | — | دسته‌بندی‌های فرعی |
| `uuid` | string (UUID) | — | برای ایجاد idempotent |

**Response 200/201:**
```json
{
  "success": true,
  "message": "محصول با موفقیت ایجاد شد",
  "product_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "code": 0
}
```

> ⚠️ فیلد برگشتی `product_uuid` است نه `uuid`

**TypeScript:** `ProductsApi.create(data)` → `{ product_uuid: string }`

---

### `PUT /api/v1/products/{uuid}`

ویرایش جزئی یا کامل یک محصول.

**TypeScript:** `ProductsApi.update(uuid, data)` → `void`

---

### `DELETE /api/v1/products/{uuid}`

حذف دائمی یک محصول.

**TypeScript:** `ProductsApi.delete(uuid)` → `void`

---

### `GET /api/v1/inventories/product/{product_uuid}`

لیست موجودی‌های یک محصول.

**TypeScript:** `InventoriesApi.listByProduct(productUuid, params?)` → `PaginatedResponse<GhatelineInventory>`

---

### `POST /api/v1/inventories/product/{product_uuid}/create`

ایجاد موجودی برای یک محصول.

**Request Body — فیلدهای اجباری:**

| فیلد | نوع | اجباری | توضیح |
|------|-----|--------|-------|
| `user_id` | integer | ✅ | از `parseInt(GHATELINE_ADMIN_USER_ID)` |
| `storage_uuid` | string (UUID) | ✅ | از `GHATELINE_DEFAULT_STORAGE_UUID` |
| `price` | integer | ✅ | قیمت فروش — ریال |
| `count` | integer | ✅ | تعداد موجودی |

**Response 200/201:**
```json
{
  "success": true,
  "message": "موجودی با موفقیت ایجاد شد",
  "inventory_uuid": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "code": 0
}
```

> ⚠️ فیلد برگشتی `inventory_uuid` است نه `uuid`

**TypeScript:** `InventoriesApi.create(productUuid, data)` → `{ inventory_uuid: string }`

---

### `GET /api/v1/storages`

لیست انبارهای موجود.

**TypeScript:** `StoragesApi.list(params?)` → `PaginatedResponse<GhatelineStorage>`

---

## کدهای خطای قطعه‌لاین

| HTTP Status | معنی |
|-------------|------|
| 200 | موفق |
| 201 | ایجاد موفق |
| 401 | API key نامعتبر |
| 403 | دسترسی ندارید |
| 404 | پیدا نشد |
| 422 | داده ورودی نامعتبر |
| 429 | Rate limit |
| 500 | خطای سرور |

---

## API هوش مصنوعی (OpenAI GPT-4o)

**SDK:** `openai`
**Model:** `gpt-4o` (پیش‌فرض، قابل تغییر با `OPENAI_MODEL`)
**Auth:** `OPENAI_API_KEY`

### پردازش محصول — `AIProcessor.processProduct`

**ورودی:** `CrawledProductData` + `categoriesList: string[]`

**خروجی validate‌شده (`AIProcessingOutput`):**
```json
{
  "title": "عنوان فارسی ۶۰-۸۰ کاراکتر SEO-friendly",
  "description": "<p>توضیحات HTML کامل فارسی...</p>",
  "category": "لوازم جانبی خودرو",
  "attrs": [
    { "key": "رنگ", "value": "مشکی" },
    { "key": "گارانتی", "value": "۱۸ ماهه" }
  ],
  "title_en": "Samsung 65W USB-C Fast Charging Cable",
  "slug": "کابل-شارژ-سریع-usb-c-سامسونگ",
  "seo_title": "کابل شارژ سریع سامسونگ USB-C 65W",
  "seo_description": "خرید کابل شارژ سریع ۶۵ واتی سامسونگ USB-C با گارانتی اصالت کالا..."
}
```

**Container نهایی در DB (`processedData`):**
```json
{
  "output": { "...AIProcessingOutput..." },
  "meta": {
    "model": "gpt-4o",
    "inputTokens": 850,
    "outputTokens": 1200,
    "durationMs": 4500,
    "processedAt": "2026-05-23T10:30:00.000Z"
  }
}
```

---

## TypeScript Types

> تعریف کامل types در `src/types/` است.

### `src/types/common.ts`
- `Result<T, E>` — خروجی توابع قابل شکست
- `PaginatedResponse<T>` — پاسخ لیستی
- `CrawlJobStatus`, `CrawledProductStatus`, `LogLevel` — status enums

### `src/lib/api-helpers.ts`
- `ApiSuccess<T>`, `ApiError`, `ApiResponse<T>` — types پاسخ API
- `apiHandler()` — wrapper برای error handling و type-safe routing
- `ok()`, `created()`, `notFound()`, `badRequest()` — سازنده‌های response
- `PaginationSchema`, `getPaginationSkip()`, `buildPaginationMeta()` — ابزارهای pagination

### `src/types/crawler.ts`
- `CrawledProductData` — ساختار rawData

### `src/types/ai.ts`
- `AIProcessingOutput` — خروجی Claude AI
- `ProcessedProductData` — container processedData در DB

---

*آخرین به‌روزرسانی: 2026-05-25 — Admin Panel API Routes (فاز 3) پیاده‌سازی شد*
