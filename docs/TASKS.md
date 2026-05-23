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

---

## فاز 1: هسته کرالر

| # | تسک | وضعیت | وابستگی |
|---|-----|--------|---------|
| 1.0 | Types و Zod Schemas (common، crawler، ghateline، ai، schema.ts) | ✅ | فاز 0 |
| 1.1 | `CrawlerAdapter` abstract class | ⬜ | فاز 0 کامل |
| 1.2 | `DigikalaCrawler` با Playwright | ⬜ | 1.1 |
| 1.3 | Factory function `getCrawler(url)` | ⬜ | 1.2 |
| 1.4 | `ProductRepository` و `JobRepository` | ⬜ | 0.6 |
| 1.5 | BullMQ `crawl.queue` و `crawl.worker` | ⬜ | 1.3, 1.4, 0.7 |
| 1.6 | `POST /api/crawl/start` route handler | ⬜ | 1.5 |
| 1.7 | `GET /api/jobs/{id}` route handler | ⬜ | 1.4 |
| 1.8 | تست دستی: کرال کامل یک محصول دیجی‌کالا | ⬜ | 1.1–1.7 |

---

## فاز 2: AI و یکپارچه‌سازی قطعه‌لاین

| # | تسک | وضعیت | وابستگی |
|---|-----|--------|---------|
| 2.1 | Anthropic SDK client + prompt template | ⬜ | فاز 1 کامل |
| 2.2 | `GhatelineClient` برای API قطعه‌لاین | ⬜ | فاز 1 کامل |
| 2.3 | BullMQ `publish.worker` | ⬜ | 2.1, 2.2 |
| 2.4 | اتصال `crawl.worker` به `publish.worker` | ⬜ | 2.3 |
| 2.5 | تست دستی: چرخه کامل کرال → AI → آپلود | ⬜ | 2.1–2.4 |

---

## فاز 3: پنل مدیریت

| # | تسک | وضعیت | وابستگی |
|---|-----|--------|---------|
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

*آخرین به‌روزرسانی: 2026-05-23 — تسک 1.0 (Types & Schemas) کامل شد*
