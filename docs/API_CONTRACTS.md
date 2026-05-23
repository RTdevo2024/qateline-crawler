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

*آخرین به‌روزرسانی: 2026-05-23 — مستندات اولیه، جزئیات بیشتر در فازهای بعدی اضافه می‌شود*
