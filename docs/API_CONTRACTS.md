# API_CONTRACTS.md — قراردادهای API

> این فایل شکل دقیق همه API های پروژه را مستند می‌کند.
> هر تغییر در API باید ابتدا اینجا ثبت شود (contract-first).

---

## فهرست

1. [API های داخلی (Next.js Route Handlers)](#api-های-داخلی)
2. [API قطعه‌لاین (Ghateline)](#api-قطعه‌لاین)
3. [API کلود (Anthropic)](#api-کلود)

---

## API های داخلی

**Base URL (development):** `http://localhost:3000`
**Auth:** Session cookie (NextAuth.js) — همه route های داخلی نیاز به auth دارند

---

### `POST /api/crawl/start`

یک job کرال جدید شروع می‌کند.

**Request Body:**
```json
{
  "url": "https://www.digikala.com/product/dkp-12345/",
  "type": "product",
  "options": {
    "processWithAI": true,
    "autoPublish": false
  }
}
```

**Validation:**
- `url`: required, string, باید با `https://` شروع شود
- `type`: required, enum `"product" | "category"`
- `options.processWithAI`: optional, boolean, default: `true`
- `options.autoPublish`: optional, boolean, default: `false`

**Response 201:**
```json
{
  "jobId": "cm5xyz123",
  "status": "pending",
  "message": "Crawl job enqueued successfully",
  "queuePosition": 3
}
```

**Response 400:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid URL format",
  "field": "url"
}
```

**Response 422:**
```json
{
  "error": "UNSUPPORTED_SITE",
  "message": "Site not supported: example.com",
  "supportedSites": ["digikala.com", "torob.com"]
}
```

---

### `GET /api/jobs`

لیست jobs با فیلتر و pagination.

**Query Parameters:**
```
status?: "pending" | "crawling" | "crawled" | "processing" | "processed" | "publishing" | "published" | "failed"
page?: number (default: 1)
limit?: number (default: 20, max: 100)
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm5xyz123",
      "url": "https://www.digikala.com/product/dkp-12345/",
      "type": "product",
      "status": "published",
      "createdAt": "2026-05-23T10:00:00Z",
      "updatedAt": "2026-05-23T10:02:30Z",
      "productsCount": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### `GET /api/jobs/{id}`

جزئیات یک job.

**Response 200:**
```json
{
  "id": "cm5xyz123",
  "url": "https://www.digikala.com/product/dkp-12345/",
  "type": "product",
  "status": "published",
  "options": {
    "processWithAI": true,
    "autoPublish": false
  },
  "products": [
    {
      "id": "cm5abc456",
      "title": "کابل شارژر USB-C",
      "status": "published",
      "ghatelineUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ],
  "logs": [
    {
      "level": "info",
      "message": "Crawl started",
      "timestamp": "2026-05-23T10:00:05Z"
    }
  ],
  "createdAt": "2026-05-23T10:00:00Z",
  "updatedAt": "2026-05-23T10:02:30Z"
}
```

**Response 404:**
```json
{
  "error": "JOB_NOT_FOUND",
  "message": "Job with id cm5xyz123 not found"
}
```

---

### `GET /api/products`

لیست محصولات کرال‌شده.

**Query Parameters:**
```
status?: "raw" | "processed" | "published" | "failed"
jobId?: string
page?: number (default: 1)
limit?: number (default: 20)
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "cm5abc456",
      "jobId": "cm5xyz123",
      "sourceUrl": "https://www.digikala.com/product/dkp-12345/",
      "title": "کابل شارژر USB-C سامسونگ",
      "status": "published",
      "ghatelineUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "createdAt": "2026-05-23T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 120, "totalPages": 6 }
}
```

---

### `POST /api/products/{id}/publish`

انتشار دستی یک محصول (وقتی autoPublish غیرفعال است).

**Response 200:**
```json
{
  "success": true,
  "ghatelineUuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

---

### `DELETE /api/jobs/{id}`

لغو یک job در صف (فقط برای status: pending).

**Response 200:**
```json
{
  "success": true,
  "message": "Job cancelled"
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

**Response 404:**
```json
{ "success": false, "message": "Product not found", "code": 404 }
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

**مثال Request Body (حداقل فیلدها):**
```json
{
  "user_id": 42,
  "category_id": 7,
  "title": "فیلتر روغن سامسونگ",
  "brand": "سامسونگ",
  "content": "<p>توضیحات کامل محصول</p>",
  "attrs": [
    { "key": "جنس", "value": "فلز" },
    { "key": "گارانتی", "value": "۶ ماهه" }
  ],
  "images": [
    { "url": "https://cdn.example.com/img1.jpg", "is_main": true }
  ],
  "price_model": [
    { "title": "استاندارد", "price": 150000, "in_stock": true }
  ],
  "status": "draft"
}
```

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

**Response 422:**
```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "title": ["The title field is required."],
    "user_id": ["The user id field must be an integer."]
  }
}
```

**TypeScript:** `ProductsApi.create(data)` → `{ product_uuid: string }`

---

### `PUT /api/v1/products/{uuid}`

ویرایش جزئی یا کامل یک محصول.

**Path Parameter:** `uuid` — UUID v4 محصول

**Request Body:** هر subset از فیلدهای `CreateProductRequest` (همه اختیاری)

```json
{
  "title": "عنوان ویرایش‌شده",
  "status": "publish",
  "attrs": [
    { "key": "جنس", "value": "آلومینیوم" }
  ]
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "محصول با موفقیت ویرایش شد"
}
```

**TypeScript:** `ProductsApi.update(uuid, data)` → `void`

---

### `DELETE /api/v1/products/{uuid}`

حذف دائمی یک محصول.

**Path Parameter:** `uuid` — UUID v4 محصول

**Response 200:**
```json
{
  "success": true,
  "message": "محصول با موفقیت حذف شد"
}
```

**TypeScript:** `ProductsApi.delete(uuid)` → `void`

---

### `GET /api/v1/inventories/product/{product_uuid}`

لیست موجودی‌های یک محصول.

**Response 200:**
```json
{
  "data": [
    {
      "uuid": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
      "product_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "storage_uuid": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
      "quantity": 10,
      "price": 150000,
      "status": "available"
    }
  ]
}
```

---

### `GET /api/v1/inventories/show/{inventory_uuid}`

جزئیات یک موجودی خاص.

**Response 200:**
```json
{
  "uuid": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "product_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "storage_uuid": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
  "quantity": 10,
  "price": 150000,
  "status": "available",
  "created_at": "2026-05-23T10:00:00Z"
}
```

---

### `POST /api/v1/inventories/product/{product_uuid}/create`

ایجاد موجودی برای یک محصول.

**Path Parameter:**
- `product_uuid`: UUID محصولی که موجودی برایش ایجاد می‌شود

**Request Body:**
```json
{
  "storage_uuid": "<GHATELINE_DEFAULT_STORAGE_UUID>",
  "quantity": 1,
  "price": 150000,
  "status": "available"
}
```

**فیلدهای اجباری:**
- `storage_uuid`: UUID انبار (از `GHATELINE_DEFAULT_STORAGE_UUID` استفاده کنید)
- `quantity`: number (حداقل 1)
- `price`: number (ریال)

**فیلدهای اختیاری:**
- `status`: `"available" | "unavailable"` (default: `"available"`)

**Response 201:**
```json
{
  "uuid": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  "product_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "storage_uuid": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
  "quantity": 1,
  "price": 150000,
  "status": "available"
}
```

---

### `GET /api/v1/storages`

لیست انبارهای موجود.

**Response 200:**
```json
{
  "data": [
    {
      "uuid": "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
      "name": "انبار اصلی",
      "status": "active"
    }
  ]
}
```

---

### `GET /api/v1/storages/products/{storage_uuid}`

لیست محصولات موجود در یک انبار.

**Response 200:**
```json
{
  "data": [
    {
      "product_uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "title": "عنوان محصول",
      "quantity": 10
    }
  ]
}
```

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

**مزیت کلیدی:** استفاده از `response_format: { type: "json_object" }` — OpenAI تضمین می‌کند خروجی همیشه JSON معتبر باشد.

### پردازش محصول — `AIProcessor.processProduct`

**ورودی:** `CrawledProductData` + `categoriesList: string[]`

**تنظیمات API:**
```typescript
openaiClient.chat.completions.create({
  model: "gpt-4o",
  response_format: { type: "json_object" },
  max_tokens: 2048,
  stream: false,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
});
```

**خروجی validate‌شده (`AIProcessingOutput`):**
```json
{
  "title": "عنوان فارسی ۶۰-۸۰ کاراکتر SEO-friendly",
  "description": "<p>توضیحات HTML کامل فارسی...</p><ul><li>ویژگی</li></ul>",
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

**مکانیزم retry:**
- اگر Zod validation شکست خورد، یک بار retry با پیام تصحیح انجام می‌شود
- اگر retry هم شکست خورد، `AIProcessingError` throw می‌شود

**Container نهایی در DB (`processedData`):**
```json
{
  "output": { ...AIProcessingOutput... },
  "meta": {
    "model": "gpt-4o",
    "inputTokens": 850,
    "outputTokens": 1200,
    "durationMs": 4500,
    "processedAt": "2026-05-23T10:30:00.000Z"
  }
}
```

**تست CLI:**
```bash
npx tsx scripts/test-ai.ts ./sample-product.json
# یا با دسته‌بندی‌های سفارشی:
npx tsx scripts/test-ai.ts ./sample-product.json "لوازم جانبی,ابزار,قطعات"
```

---

---

## TypeScript Types و Zod Schemas

> تعریف کامل types در `src/types/` و schemas در `src/lib/crawler/` است.

---

### `src/types/common.ts`

```typescript
// Result<T, E> — خروجی توابع قابل شکست
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// PaginatedResponse<T> — پاسخ لیستی
interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// Status strings (هم‌راستا با Prisma enums)
type CrawlJobStatus    = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type CrawledProductStatus = 'RAW' | 'PROCESSED' | 'REVIEWED' | 'PUBLISHED' | 'REJECTED' | 'FAILED';
type LogLevel          = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
```

---

### `src/types/crawler.ts`

**ساختار خروجی استاندارد هر crawler adapter — ذخیره در `rawData` جدول `crawled_products`:**

```typescript
type CrawledProductData = {
  source: {
    siteSlug: string;   // مثال: 'digikala'
    url: string;        // URL کامل صفحه محصول
    crawledAt: string;  // ISO 8601
  };
  product: {
    title: string;
    description?: string;             // ممکن است HTML داشته باشد
    images: string[];                 // URL های معتبر
    attributes: Record<string, string>; // مشخصات فنی key-value
    category?: string;
    brand?: string;
  };
  inventory: {
    price: number;          // ریال، عدد صحیح
    originalPrice?: number; // قبل از تخفیف
    inStock: boolean;
    quantity?: number;
  };
};
```

**Zod schema:** `CrawledProductDataSchema` — برای runtime validation

---

### `src/types/ghateline.ts`

**Types مربوط به API قطعه‌لاین:**

```typescript
// درخواست ایجاد محصول → POST /api/v1/products/create
interface CreateProductRequest {
  title: string;
  price: number;
  user_id: string;         // از GHATELINE_ADMIN_USER_ID
  description?: string;
  status?: 'draft' | 'active' | 'inactive';
  attributes?: Record<string, string>;
  images?: string[];
}

// درخواست ایجاد موجودی → POST /api/v1/inventories/product/{uuid}/create
interface CreateInventoryRequest {
  storage_uuid: string;    // از GHATELINE_DEFAULT_STORAGE_UUID
  quantity: number;
  price: number;
  status?: 'available' | 'unavailable';
}

// wrapper پاسخ API (برخی endpoint ها data، برخی response می‌دهند)
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  response?: T;
  code?: number;
  message?: string;
}
```

---

### `src/types/ai.ts`

**Types مربوط به پردازش Claude AI — ذخیره در `processedData`:**

```typescript
// ورودی به Claude
interface AIProcessingInput {
  rawTitle: string;
  rawDescription?: string;
  price: number;
  attributes: Record<string, string>;
  imageCount: number;
  sourceUrl: string;
  sourceSite: string;
}

// خروجی Claude (validate شده با Zod schema)
type AIProcessingOutput = {
  title: string;        // ۵–۱۰۰ کاراکتر
  description: string;  // ۵۰–۱۰۰۰ کاراکتر
  categoryHint?: string;
  keywords: string[];   // ۳–۱۰ کلیدواژه
  attributes?: Record<string, string>;
  brand?: string;
  confidence: number;   // 0–1
};

// container کامل processedData در DB
interface ProcessedProductData {
  output: AIProcessingOutput;
  meta: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    processedAt: string; // ISO 8601
  };
}
```

**Zod schema:** `AIProcessingOutputSchema` — برای validate کردن JSON خروجی Claude

---

### `src/lib/crawler/schema.ts`

**توابع validation:**

```typescript
// validate یک محصول — برگشت Result<CrawledProductData>
function validateCrawledData(data: unknown): Result<CrawledProductData>

// type guard
function isValidProductData(data: unknown): data is CrawledProductData

// validate آرایه محصولات (برای category crawl)
function validateCrawledDataArray(data: unknown): Result<CrawledProductData[]>

// type guard برای آرایه
function isValidProductDataArray(data: unknown): data is CrawledProductData[]
```

---

*آخرین به‌روزرسانی: 2026-05-23 — تسک 1.0 (Types & Schemas) کامل شد*
