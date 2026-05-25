# TASKS.md — لیست تسک‌های اجرایی

> این فایل باید بعد از هر تسک آپدیت شود.
> ترتیب تسک‌ها مهم است — وابستگی‌ها رعایت شود.

---

## فاز 0: راه‌اندازی

| # | تسک | وضعیت | وابستگی |
|---|-----|--------|---------|
| 0.1 | ایجاد مستندات پایه (CLAUDE.md, DESIGN.md, ...) | ✅ | — |
| 0.2 | Next.js 14 + نصب همه dependencies + shadcn/ui | ✅ | 0.1 |
| 0.3 | تنظیم TypeScript strict + path aliases | ✅ | 0.2 |
| 0.4 | تنظیم ESLint (از طریق Next.js) | ✅ | 0.3 |
| 0.5 | تنظیم Prisma + schema اولیه | ✅ | 0.3 |
| 0.6 | اجرای اولین migration + تایید اتصال DB | ⬜ | 0.5 |
| 0.7 | تنظیم Redis + تایید اتصال | ⬜ | 0.2 |
| 0.8 | docker-compose.yml (postgres + redis + healthcheck) + .env.example + README.md آپدیت | ✅ | 0.2 |

---

## فاز 1: هسته کرالر

| # | تسک | وضعیت | وابستگی |
|---|-----|--------|---------|
| 1.0 | Types و Zod Schemas (common، crawler، ghateline، ai، schema.ts) | ✅ | فاز 0 |
| 1.1 | لایه پایه کرالر: Fetcher، HttpFetcher، BrowserFetcher، BaseAdapter، AdapterRegistry، Crawler، Errors | ✅ | 1.0 |
| 1.1b | YadakMarketAdapter (WooCommerce) + adapters/index.ts + تست‌های node:test + CLI test-crawl.ts | ✅ | 1.1 |
| 1.2 | `DigikalaCrawler` با Playwright | ⬜ | 1.1 |
| 1.3 | `ProductRepository` و `JobRepository` | ⬜ | 0.6 |
| 1.4 | BullMQ queue+workers — connection/queues/jobs + crawl/ai/publish workers + index.ts | ✅ | 0.7 |
| 1.5 | `POST /api/crawl/start` route handler | ⬜ | 1.4 |
| 1.6 | `GET /api/jobs/{id}` route handler | ⬜ | 1.3 |
| 1.7 | تست دستی: کرال کامل یک محصول دیجی‌کالا | ⬜ | 1.1–1.6 |

---

## فاز 2: AI و یکپارچه‌سازی قطعه‌لاین

| # | تسک | وضعیت | وابستگی |
|---|-----|--------|---------|
| 2.1 | OpenAI GPT-4o client + prompt template + AIProcessor | ✅ | فاز 1 کامل |
| 2.2 | `GhatelineClient` + `ProductsApi` + types + singleton + CLI test | ✅ | فاز 1 کامل |
| 2.2b | `InventoriesApi` + `StoragesApi` + `Publisher` (rollback) + CLI test-publish.ts | ✅ | 2.2 |
| 2.3 | BullMQ workers (crawl→ai→publish pipeline) + test-pipeline.ts + graceful shutdown | ✅ | 2.1, 2.2b |
| 2.4 | اتصال pipeline: crawl→ai خودکار، ai→publish دستی (review) | ✅ | 2.3 |
| 2.5 | تست دستی: چرخه کامل کرال → AI → آپلود | ⬜ | 2.1–2.4 |

---

## فاز 3: پنل مدیریت

| # | تسک | وضعیت | وابستگی |
|---|-----|--------|---------|
| 3.0 | API Routes پنل ادمین (sites, crawl-jobs, crawled-products + approve/reject) + api-helpers.ts + API_CONTRACTS.md | ✅ | فاز 2 |
| 3.1 | NextAuth.js setup + صفحه login | ⬜ | فاز 2 کامل |
| 3.2 | Layout پنل + navigation | ⬜ | 3.1 |
| 3.3 | صفحه Dashboard (آمار کلی) | ⬜ | 3.2 |
| 3.4 | صفحه Jobs (لیست + جزئیات) | ⬜ | 3.2 |
| 3.5 | صفحه Products (لیست + وضعیت) | ⬜ | 3.2 |
| 3.6 | Bull Board برای مانیتور queue | ⬜ | 3.2 |

---

## فاز 4: تست و دیپلوی

| # | تسک | وضعیت | وابستگی |
|---|-----|--------|---------|
| 4.1 | Unit tests برای crawlers | ⬜ | فاز 3 کامل |
| 4.2 | Integration tests برای API routes | ⬜ | فاز 3 کامل |
| 4.3 | `docker-compose.yml` (app + postgres + redis) | ⬜ | فاز 3 کامل |
| 4.4 | مستندات دیپلوی و متغیرهای محیطی production | ⬜ | 4.3 |

---

## نحوه آپدیت این فایل

وقتی تسکی تمام شد:
1. `⬜` را به `✅` تغییر دهید
2. اگر تسک در حال اجراست: `⬜` → `🔄`
3. اگر تسک بلاک شده: `⬜` → `🚫` (با توضیح دلیل)

```
⬜ انجام نشده
🔄 در حال اجرا
✅ کامل شده
🚫 بلاک شده
```

---

*آخرین به‌روزرسانی: 2026-05-25 — تسک 3.0 (Admin Panel API Routes) کامل شد*
