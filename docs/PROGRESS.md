# PROGRESS.md — ردگیری پیشرفت پروژه

> این فایل باید بعد از هر تسک آپدیت شود.
> وضعیت کلی: **فاز 1 — در صف**

---

## خلاصه وضعیت

| فاز | عنوان | وضعیت | پیشرفت |
|-----|-------|--------|--------|
| 0 | راه‌اندازی | ✅ کامل | 7/7 |
| 1 | هسته کرالر | 🔄 در حال اجرا | 2/8 |
| 2 | AI و یکپارچه‌سازی | ⏳ منتظر | 0/5 |
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
- [ ] اجرای migration روی DB واقعی (`npx prisma migrate dev --name init`)
- [ ] تنظیم Redis connection + BullMQ queue اولیه (فاز 1)

**بلاک‌ها:** هیچ

---

## فاز 1: هسته کرالر

**هدف:** پیاده‌سازی کامل چرخه کرال — از URL تا ذخیره در DB.

**پیش‌نیاز:** اتمام کامل فاز 0

- [x] تعریف Types و Zod Schemas (crawler، ghateline، ai، common، schema.ts)
- [x] لایه پایه کرالر: Fetcher interface، HttpFetcher، BrowserFetcher، BaseAdapter، AdapterRegistry، Crawler، Errors
- [ ] پیاده‌سازی `DigikalaCrawler` با Playwright
- [ ] BullMQ `crawl.queue` و `crawl.worker`
- [ ] Repository: `ProductRepository` و `JobRepository`
- [ ] API Route: `POST /api/crawl/start`
- [ ] API Route: `GET /api/jobs/{id}`
- [ ] تست دستی: کرال یک محصول دیجی‌کالا

**بلاک‌ها:** هیچ

---

## فاز 2: AI و یکپارچه‌سازی قطعه‌لاین

**هدف:** پردازش هوشمند داده و آپلود به فروشگاه.

**پیش‌نیاز:** اتمام کامل فاز 1

- [ ] کلاینت Anthropic SDK (`src/lib/ai/claude.ts`)
- [ ] Prompt طراحی برای بهینه‌سازی عنوان/توضیحات فارسی
- [ ] کلاینت API قطعه‌لاین (`src/lib/ghateline/client.ts`)
- [ ] BullMQ `publish.worker` برای آپلود به قطعه‌لاین
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

---

*آخرین به‌روزرسانی: 2026-05-23 — تسک 1.1 (لایه پایه کرالر) کامل شد*
