# DESIGN.md — تصمیمات معماری

> این فایل توضیح می‌دهد چرا هر تکنولوژی انتخاب شده و چگونه اجزا با هم کار می‌کنند.
> برای ثبت تصمیمات جدید به `docs/DECISIONS.md` مراجعه کنید.

---

## چرا Next.js 14 App Router؟

**مشکل:** نیاز به هر دو API backend و UI پنل مدیریت داریم.

**گزینه‌های بررسی‌شده:**
1. **Express + React SPA جداگانه** — دو پروژه، دو دیپلوی، پیچیدگی بیشتر
2. **FastAPI + React** — Python برای تیم TypeScript-first کنج بود
3. **Next.js App Router** ✓ — API Routes + SSR UI در یک codebase، یک دیپلوی، TypeScript یکپارچه

**مزایا در این پروژه:**
- Route Handlers (`/api/...`) برای REST API داخلی
- Server Components برای پنل مدیریت با داده real-time
- Shared types بین API و UI بدون duplication
- تنها یک `package.json` و CI/CD pipeline

---

## چرا PostgreSQL و نه MongoDB؟

**مشکل:** داده محصولات ساختار نیمه‌ساختاریافته دارد (هر سایت فیلدهای متفاوتی دارد) اما روابط بین جداول مهم هستند (job → products → inventory).

**گزینه‌های بررسی‌شده:**
1. **MongoDB** — انعطاف schema خوب، اما:
   - ACID transactions ضعیف‌تر
   - JOIN ها سخت‌تر
   - Prisma + MongoDB هنوز بالغ نیست
2. **PostgreSQL** ✓ — بهترین از هر دو دنیا:
   - `jsonb` column برای داده خام کرالر (انعطاف schema)
   - Relational برای job/product/inventory relationships
   - Full ACID transactions
   - Prisma support کامل

**الگوی استفاده:**
```
CrawledProduct {
  id, url, status, ...     ← structured columns
  rawData: jsonb           ← داده خام از سایت (هر سایت متفاوت)
  processedData: jsonb     ← بعد از پردازش AI
}
```

---

## چرا Adapter Pattern برای کرالرها؟

**مشکل:** هر سایت (دیجی‌کالا، ترب، ...) ساختار HTML و URL متفاوتی دارد. علاوه بر این، بعضی سایت‌ها نیاز به browser واقعی دارند (JavaScript-heavy) و بعضی با HTTP ساده کار می‌کنند.

**گزینه‌های بررسی‌شده:**
1. **یک فایل با if/else برای هر سایت** — غیر قابل نگهداری با رشد تعداد سایت‌ها
2. **Plugin system پیچیده** — over-engineering برای این مرحله
3. **Adapter Pattern** ✓ — هر سایت یک کلاس مستقل با interface مشترک

**مزایا:**
- اضافه کردن سایت جدید = یک فایل جدید، بدون تغییر کد موجود (Open/Closed Principle)
- تست مستقل هر adapter
- AdapterRegistry مرکزی برای انتخاب adapter بر اساس URL

### معماری پیاده‌سازی‌شده

```
src/lib/crawler/
├── fetchers/
│   ├── types.ts           ← interface Fetcher + FetchResult + FetchOptions
│   ├── http-fetcher.ts    ← HttpFetcher (axios) — سایت‌های ساده
│   └── browser-fetcher.ts ← BrowserFetcher (Playwright) — سایت‌های JS-heavy
│
└── core/
    ├── errors.ts          ← CrawlerError، AdapterNotFoundError، FetchError، ParseError
    ├── base-adapter.ts    ← abstract class BaseAdapter
    ├── adapter-registry.ts← AdapterRegistry singleton
    └── crawler.ts         ← Crawler — entry point
```

### لایه Fetcher: چرا دو نوع؟

| | HttpFetcher | BrowserFetcher |
|---|---|---|
| **تکنولوژی** | axios | Playwright (Chromium) |
| **سرعت** | ≈ ۵۰۰ms | ≈ ۳-۵s |
| **JavaScript** | ✗ اجرا نمی‌کند | ✓ کامل |
| **ردشدن از bot detection** | پایین | بالا |
| **مصرف RAM** | کم | زیاد |
| **مناسب برای** | API-based, SSR | SPA, JS-rendered |

`requiresBrowser: boolean` در هر adapter مشخص می‌کند کدام fetcher استفاده شود.
`BrowserFetcher` یک browser instance را به صورت singleton نگه می‌دارد تا از overhead راه‌اندازی مجدد جلوگیری شود.

### جریان داده در BaseAdapter

```typescript
// adapter.crawl(url) در واقع:
fetcher.fetch(url)          // → FetchResult { html, finalUrl, statusCode, headers }
  → this.extract(html, url) // → CrawledProductData
```

هر adapter باید دو متد abstract را پیاده کند:
- `canHandle(url)`: آیا این URL متعلق به این سایت است؟
- `extract(html, url)`: داده محصول را از HTML استخراج کن

### AdapterRegistry

```typescript
adapterRegistry.register(new DigikalaCrawler());
adapterRegistry.register(new TorobCrawler());

// در Crawler:
const adapter = adapterRegistry.findByUrl(url); // یافتن با canHandle()
const data = await adapter.crawl(url);
```

Registry یک singleton module-level است — همه ماژول‌ها به یک instance مشترک دسترسی دارند.

---

## چرا BullMQ برای Queue؟

**مشکل:** کرال کردن و آپلود محصول عملیات‌های طولانی هستند (۳-۳۰ ثانیه هر کدام). نمی‌توان در HTTP request انجام داد.

**گزینه‌های بررسی‌شده:**
1. **Cron job ساده** — بدون retry، بدون visibility، بدون concurrency control
2. **AWS SQS** — dependency خارجی، پیچیدگی، هزینه
3. **Bull (نسخه قبلی)** — deprecated به نفع BullMQ
4. **BullMQ** ✓ — با Redis که قبلاً در stack داریم:
   - Built-in retry با exponential backoff
   - Concurrency control (چند worker موازی)
   - Job priority
   - Dashboard (Bull Board) برای monitoring
   - TypeScript-first
   - Delayed jobs برای rate limiting کرالر

**معماری Queue:**

```
User Request
     ↓
API Route (enqueue)
     ↓
BullMQ Queue (Redis)
     ↓
Worker Process
  ├── crawl.worker → استخراج داده از سایت
  └── publish.worker → آپلود به قطعه‌لاین
```

---

## جریان داده End-to-End

```
1. کاربر URL محصول/دسته را در پنل وارد می‌کند
        ↓
2. API Route /api/crawl/start
   - اعتبارسنجی URL
   - ایجاد Job در DB (status: pending)
   - Enqueue به BullMQ crawl queue
   - بازگشت jobId به کاربر
        ↓
3. crawl.worker اجرا می‌شود
   - getCrawler(url) → انتخاب adapter مناسب
   - adapter.crawlProduct(url) → Playwright browser
   - ذخیره داده خام در DB (CrawledProduct.rawData)
   - Enqueue به BullMQ ai-process queue
   - Job status → crawled
        ↓
4. ai.worker اجرا می‌شود (اختیاری، اگر AI فعال باشد)
   - خواندن داده خام از DB
   - ارسال به Claude API
   - Claude: عنوان/توضیحات فارسی بهینه + دسته‌بندی
   - ذخیره processedData در DB
   - Enqueue به BullMQ publish queue
   - Job status → processed
        ↓
5. publish.worker اجرا می‌شود
   - خواندن processedData از DB
   - تبدیل به GhatelineProduct format
   - POST /api/v1/products/create → قطعه‌لاین
   - POST /api/v1/inventories/product/{uuid}/create → موجودی
   - ذخیره ghateline_uuid در DB
   - Job status → published
        ↓
6. کاربر در پنل می‌تواند وضعیت job را ببیند
   - API Route /api/jobs/{id} → وضعیت real-time
   - یا WebSocket برای live updates (فاز بعدی)
```

---

## تصمیمات Data Model

### جداول اصلی

**Job** — هر درخواست کرال
```
id, url, type(product|category), status, createdAt, updatedAt
```

**CrawledProduct** — محصول استخراج‌شده
```
id, jobId, sourceUrl, title, rawData(jsonb), processedData(jsonb),
ghatelineUuid, status, createdAt
```

**CrawlerLog** — لاگ‌های هر job
```
id, jobId, level, message, metadata(jsonb), createdAt
```

### چرا rawData و processedData جدا؟

- **rawData:** داده اصلی از سایت — هرگز تغییر نمی‌کند، برای debug و reprocess مفید است
- **processedData:** خروجی AI — می‌تواند بعداً با prompt بهتر regenerate شود

---

## محدودیت‌ها و Rate Limiting

- **Playwright:** هر worker حداکثر ۳ browser instance همزمان
- **قطعه‌لاین API:** rate limit نامشخص — با BullMQ delay بین requests
- **Claude API:** token limit و rate limit — batching برای پردازش دسته‌ای
- **سایت‌های target:** هر سایت محدودیت متفاوت — در adapter config قابل تنظیم

---

*آخرین به‌روزرسانی: فاز 1 — لایه پایه کرالر (Fetchers + BaseAdapter + Registry)*
