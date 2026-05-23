# PROGRESS.md — ردگیری پیشرفت پروژه

> این فایل باید بعد از هر تسک آپدیت شود.
> وضعیت کلی: **فاز 0 — در حال اجرا**

---

## خلاصه وضعیت

| فاز | عنوان | وضعیت | پیشرفت |
|-----|-------|--------|--------|
| 0 | راه‌اندازی | 🔄 در حال اجرا | 1/7 |
| 1 | هسته کرالر | ⏳ منتظر | 0/8 |
| 2 | AI و یکپارچه‌سازی | ⏳ منتظر | 0/5 |
| 3 | پنل مدیریت | ⏳ منتظر | 0/6 |
| 4 | تست و دیپلوی | ⏳ منتظر | 0/4 |

---

## فاز 0: راه‌اندازی (Setup)

**هدف:** ایجاد ساختار پایه پروژه، تنظیم ابزارها و اطمینان از کارکرد محیط.

- [x] ایجاد مستندات پایه (CLAUDE.md, DESIGN.md, TASKS.md, DECISIONS.md, API_CONTRACTS.md)
- [ ] `npm init` + نصب dependencies اصلی
- [ ] تنظیم TypeScript (`tsconfig.json` با strict mode)
- [ ] تنظیم ESLint + Prettier
- [ ] تنظیم Prisma + اتصال به PostgreSQL
- [ ] ایجاد schema اولیه Prisma و اجرای migration
- [ ] تنظیم Redis connection + BullMQ queue اولیه
- [ ] تایید اجرای `npm run dev` بدون خطا

**بلاک‌ها:** هیچ

---

## فاز 1: هسته کرالر

**هدف:** پیاده‌سازی کامل چرخه کرال — از URL تا ذخیره در DB.

**پیش‌نیاز:** اتمام کامل فاز 0

- [ ] پیاده‌سازی `CrawlerAdapter` abstract class
- [ ] پیاده‌سازی `DigikalaCrawler` با Playwright
- [ ] Factory function `getCrawler(url)`
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

---

*آخرین به‌روزرسانی: 2026-05-23*
