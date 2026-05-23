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

**Base URL:** `https://ghateline.com`
**Auth Header:** `X-API-KEY: <GHATELINE_API_KEY>`
**Content-Type:** `application/json`

> مستندات تفصیلی هر endpoint در ادامه اضافه می‌شود.

---

### `GET /api/v1/products`

لیست محصولات فروشگاه.

**Headers:**
```
X-API-KEY: <api_key>
```

**Query Parameters:**
```
page?: number
per_page?: number
```

**Response 200:**
```json
{
  "data": [
    {
      "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "title": "عنوان محصول",
      "description": "توضیحات محصول",
      "price": 150000,
      "status": "active",
      "created_at": "2026-05-23T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150
  }
}
```

---

### `GET /api/v1/products/{uuid}`

جزئیات کامل یک محصول.

**Path Parameter:**
- `uuid`: شناسه یکتای محصول در قطعه‌لاین

**Response 200:**
```json
{
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "title": "عنوان محصول",
  "description": "توضیحات کامل",
  "price": 150000,
  "status": "active",
  "images": [],
  "attributes": {},
  "created_at": "2026-05-23T10:00:00Z",
  "updated_at": "2026-05-23T10:00:00Z"
}
```

**Response 404:**
```json
{
  "message": "Product not found"
}
```

---

### `POST /api/v1/products/create`

ایجاد محصول جدید در فروشگاه.

**Request Body:**
```json
{
  "title": "عنوان محصول",
  "description": "توضیحات کامل محصول",
  "price": 150000,
  "user_id": "<GHATELINE_ADMIN_USER_ID>",
  "status": "draft",
  "attributes": {
    "brand": "سامسونگ",
    "model": "EP-TA800"
  }
}
```

**فیلدهای اجباری:**
- `title`: string
- `price`: number (ریال)
- `user_id`: UUID کاربر admin

**فیلدهای اختیاری:**
- `description`: string
- `status`: `"draft" | "active" | "inactive"` (default: `"draft"`)
- `attributes`: object (key-value مشخصات فنی)

**Response 201:**
```json
{
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "title": "عنوان محصول",
  "status": "draft",
  "created_at": "2026-05-23T10:00:00Z"
}
```

**Response 422:**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": ["The title field is required."]
  }
}
```

---

### `PUT /api/v1/products/{uuid}`

ویرایش اطلاعات محصول.

**Request Body:** (همان فیلدهای create، همه اختیاری)
```json
{
  "title": "عنوان جدید",
  "description": "توضیحات جدید",
  "status": "active"
}
```

**Response 200:**
```json
{
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "title": "عنوان جدید",
  "status": "active",
  "updated_at": "2026-05-23T11:00:00Z"
}
```

---

### `DELETE /api/v1/products/{uuid}`

حذف محصول.

**Response 200:**
```json
{
  "message": "Product deleted successfully"
}
```

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

## API کلود (Anthropic)

**SDK:** `@anthropic-ai/sdk`
**Model:** `claude-sonnet-4-6` (پیش‌فرض)

### پردازش توضیحات محصول

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: `محصول زیر را از یک سایت فروشگاهی ایرانی کرال کرده‌ایم.
      
عنوان خام: ${rawTitle}
توضیحات خام: ${rawDescription}
قیمت: ${price} تومان
مشخصات: ${JSON.stringify(attributes)}

لطفاً خروجی JSON با این فیلدها برگردان:
- title: عنوان بهینه‌شده فارسی (حداکثر ۱۰۰ کاراکتر)
- description: توضیحات حرفه‌ای فارسی (۲۰۰-۵۰۰ کاراکتر)
- category: دسته‌بندی پیشنهادی
- keywords: آرایه ۵ کلیدواژه فارسی`
    }
  ]
});
```

**خروجی انتظاری:**
```json
{
  "title": "کابل شارژ سریع USB-C سامسونگ ۶۵W",
  "description": "کابل اورجینال سامسونگ با قابلیت شارژ سریع ۶۵ واتی...",
  "category": "کابل و شارژر",
  "keywords": ["کابل usb-c", "شارژ سریع", "سامسونگ", "تایپ سی", "65w"]
}
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
