# PROGRESS.md — ردگیری پیشرفت پروژه

> این فایل باید بعد از هر تسک آپدیت شود.
> وضعیت کلی: **فاز 1 — در صف**

---

## خلاصه وضعیت

| فاز | عنوان | وضعیت | پیشرفت |
|-----|-------|--------|--------|
| 0 | راه‌اندازی | ✅ کامل | 7/7 |
| 1 | هسته کرالر | 🔄 در حال اجرا | 3/8 |
| 2 | AI و یکپارچه‌سازی | 🔄 در حال اجرا | 4/5 |
| 3 | پنل مدیریت | ⏳ منتظر | 0/6 |
| 4 | تست و دیپلوی | ⏳ منتظر | 0/4 |

---

## فاز 0: راه‌اندازی (Setup)

**هدف:** ایجاد ساختار پایه پروژه، تنظیم ابزارها و اطمینان از کارکرد محیط.

- [x] ایجاد مستندات پایه (CLAUDE.md, DESIGN.md, TASKS.md, DECISIONS.md, API_CONTRACTS.md)
- [x] Next.js 14 + نصب dependencies اصلی (Prisma, BullMQ, Playwright, Anthropic SDK, ...)
- [x] تنظیم TypeScript (`tsconfig.json` با strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes)
- [x] ESLint (از طریق Next.js) + shadcn/ui init
- [x] ساختار پوشه‌های پروژه (src/lib/crawler, ai, db, queue, workers, types, prisma)
- [x] shadcn/ui کامپوننت‌ها: button, input, label, card, table, badge, dialog, dropdown-menu, form, select, textarea, separator, skeleton, tabs, sonner
- [x] تایید `npm run build` بدون خطا
- [x] تنظیم Prisma + schema اولیه (schema.prisma، seed.ts، singleton client) — فاز 1
- [x] docker-compose.yml — PostgreSQL + Redis با healthcheck و volumes
- [x] .env.example آپدیت با DATABASE_URL, REDIS_URL, OPENAI_API_KEY, GHATELINE_API_KEY, GHATELINE_API_BASE_URL
- [x] README.md — دستورات کامل local setup (docker compose up -d، migrate، seed)
- [ ] اجرای migration روی DB واقعی (`npx prisma migrate dev`)
- [ ] تنظیم Redis connection + BullMQ queue اولیه (فاز 1)

**بلاک‌ها:** هیچ

---

## فاز 1: هسته کرالر

**هدف:** پیاده‌سازی کامل چرخه کرال — از URL تا ذخیره در DB.

**پیش‌نیاز:** اتمام کامل فاز 0

- [x] تعریف Types و Zod Schemas (crawler، ghateline، ai، common، schema.ts)
- [x] لایه پایه کرالر: Fetcher interface، HttpFetcher، BrowserFetcher، BaseAdapter، AdapterRegistry، Crawler، Errors
- [x] YadakMarketAdapter (WooCommerce) — cheerio، parsePersianPrice، تصاویر full-size، specifications، breadcrumb، stock
- [x] adapters/index.ts — ثبت همه adapters با adapterRegistry.register
- [x] تست‌های node:test برای YadakMarketAdapter — 17/17 پاس
- [x] scripts/test-crawl.ts — CLI برای تست دستی (npm run test:crawl -- <url>)
- [x] BullMQ Queue + Worker سیستم — crawl/ai/publish worker + queue + jobs + connection
- [x] scripts/test-pipeline.ts — CLI تست pipeline کامل (npm run test:pipeline -- <url>)
- [x] تست یکپارچه pipeline — کرال yadakmarket (پژو 206 تسمه تایم) موفق: rawData کامل، AIWorker جواب داد (401 = API key placeholder)
- [ ] پیاده‌سازی `DigikalaCrawler` با Playwright
- [ ] Repository: `ProductRepository` و `JobRepository`
- [ ] API Route: `POST /api/crawl/start`
- [ ] API Route: `GET /api/jobs/{id}`

**بلاک‌ها:** OpenAI API key واقعی برای تست کامل AI processing

---

## فاز 2: AI و یکپارچه‌سازی قطعه‌لاین

**هدف:** پردازش هوشمند داده و آپلود به فروشگاه.

**پیش‌نیاز:** اتمام کامل فاز 1

- [x] OpenAI GPT-4o client (`src/lib/ai/client.ts`) — singleton، DEFAULT_MODEL از env
- [x] Prompt template (`src/lib/ai/prompts.ts`) — buildProductProcessingPrompt با system+user prompt فارسی
- [x] AIProcessor (`src/lib/ai/processor.ts`) — json_object، Zod validation، retry با پیام تصحیح
- [x] src/lib/ai/index.ts — export های راحت
- [x] scripts/test-ai.ts — CLI تست با JSON ورودی
- [x] src/types/ai.ts — schema جدید با فیلدهای OpenAI (title, description HTML, category, attrs, title_en, slug, seo_title, seo_description)
- [x] npm install openai + OPENAI_API_KEY در .env.example + npm run test:ai script
- [x] کلاینت API قطعه‌لاین — GhatelineClient (axios+auth)، ProductsApi (Zod)، types کامل، singleton، CLI test
- [x] InventoriesApi + StoragesApi + Publisher (rollback) + singleton‌ها + CLI test-publish.ts + API_CONTRACTS.md کامل
- [x] BullMQ workers — crawl-worker، ai-worker، publish-worker + workers/index.ts با graceful shutdown
- [ ] تست دستی: کرال + پردازش + آپلود یک محصول کامل

**بلاک‌ها:** نیاز به API key قطعه‌لاین معتبر

---

## فاز 3: پنل مدیریت

**هدف:** رابط کاربری وب برای کنترل و مانیتورینگ.

**پیش‌نیاز:** اتمام کامل فاز 2

- [ ] تنظیم NextAuth.js (login/logout)
- [ ] صفحه Dashboard: وضعیت کلی jobs
- [ ] صفحه Jobs: لیست و جزئیات هر job
- [ ] صفحه Products: محصولات کرال‌شده با status
- [ ] فرم ارسال URL جدید برای کرال
- [ ] Bull Board integration برای مانیتور queue

**بلاک‌ها:** هیچ

---

## فاز 4: تست و دیپلوی

**هدف:** پوشش تست کافی و آماده‌سازی برای production.

**پیش‌نیاز:** اتمام کامل فاز 3

- [ ] Unit tests برای همه crawlers
- [ ] Integration test برای API routes اصلی
- [ ] تنظیم Docker Compose (app + postgres + redis)
- [ ] مستندات دیپلوی و راه‌اندازی production

**بلاک‌ها:** هیچ

---

## لاگ تغییرات

| تاریخ | فاز | تسک | توضیح |
|-------|-----|-----|-------|
| 2026-05-23 | 0 | مستندات | ایجاد docs/ با فایل‌های پایه |
| 2026-05-23 | 0 | setup | Next.js 14، dependencies، shadcn/ui، ساختار پوشه‌ها، TypeScript strict |
| 2026-05-23 | 1 | prisma | schema.prisma (6 model، 3 enum)، seed.ts، singleton client، package.json prisma.seed |
| 2026-05-23 | 1 | types | src/types/common.ts، crawler.ts، ghateline.ts، ai.ts و src/lib/crawler/schema.ts — tsc پاک |
| 2026-05-23 | 1 | crawler-core | fetchers/types.ts، http-fetcher.ts، browser-fetcher.ts، core/errors.ts، base-adapter.ts، adapter-registry.ts، crawler.ts — tsc پاک |
| 2026-05-23 | 1 | yadak-adapter | adapters/yadakmarket.ts، adapters/index.ts، __tests__/yadakmarket.test.ts (17/17)، scripts/test-crawl.ts — tsc پاک |
| 2026-05-23 | 2 | ai-processor | src/lib/ai/{client,prompts,processor,index}.ts، scripts/test-ai.ts، types/ai.ts schema جدید — openai نصب، tsc پاک |
| 2026-05-23 | 2 | ghateline-client | src/lib/ghateline/{types,client,products,index}.ts، scripts/test-ghateline-products.ts، docs/API_CONTRACTS.md — tsc پاک |
| 2026-05-23 | 2 | ghateline-inventory | inventories.ts، storages.ts، publisher.ts (rollback)، index.ts آپدیت، scripts/test-publish.ts، API_CONTRACTS.md کامل — tsc پاک |
| 2026-05-25 | 0 | infra | docker-compose.yml (postgres+redis با healthcheck+volumes)، .env.example آپدیت، README.md راه‌اندازی کامل — tsc پاک، build پاک |
| 2026-05-25 | 1+2 | queue+workers | src/lib/queue/{connection,queues,jobs}.ts + src/workers/{crawl,ai,publish,index}.ts + scripts/test-pipeline.ts + package.json worker:dev + README آپدیت — tsc پاک |
| 2026-05-25 | 1 | browser-fetcher | browser-fetcher.ts بازنویسی کامل: retry (load 60s → domcontentloaded 90s) + PartialFetchError + partial recovery — tsc پاک |
| 2026-05-25 | 1 | anti-detection | RETRYABLE_NETWORK_ERRORS، anti-bot (webdriver، plugins، Sec-Fetch headers)، ERR_CONNECTION_TIMED_OUT رفع شد — tsc پاک |
| 2026-05-25 | 0 | env+db | .env.local، prisma db push --skip-generate، prisma db seed — DB synced، PARTIAL enum اضافه شد |
| 2026-05-25 | 1+2 | integration-test | تست pipeline: crawl yadakmarket موفق (rawData کامل)، AI job enqueue، AIWorker 401 (placeholder key) — pipeline کار می‌کند |

---

*آخرین به‌روزرسانی: 2026-05-25 — تست یکپارچه pipeline: کرال yadakmarket کامل، منتظر API key واقعی برای AI processing*
