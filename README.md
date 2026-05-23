# qateline-crawler

سیستم کرالر هوشمند برای استخراج و انتشار محصولات از سایت‌های فروشگاهی ایرانی روی فروشگاه [قطعه‌لاین](https://ghateline.com).

---

## چه کاری می‌کند؟

1. **کرال** — محصولات را از سایت‌هایی مثل دیجی‌کالا با Playwright استخراج می‌کند
2. **پردازش** — با Claude AI عنوان و توضیحات فارسی را بهینه می‌کند
3. **انتشار** — محصول را از طریق API قطعه‌لاین آپلود می‌کند
4. **پنل** — رابط وب برای مانیتورینگ و کنترل

---

## پیش‌نیازها

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

---

## راه‌اندازی محلی

### ۱. Clone و نصب

```bash
git clone <repo-url>
cd qateline-crawler
npm install
```

### ۲. متغیرهای محیطی

```bash
cp .env.example .env.local
# فایل .env.local را با مقادیر واقعی پر کنید
```

### ۳. دیتابیس

```bash
npx prisma migrate dev
```

### ۴. اجرا

```bash
# ترمینال ۱ — Next.js dev server
npm run dev

# ترمینال ۲ — BullMQ workers
npm run worker
```

پنل مدیریت در `http://localhost:3000` در دسترس است.

---

## Stack

| لایه | تکنولوژی |
|------|-----------|
| Framework | Next.js 14 App Router |
| زبان | TypeScript (strict) |
| ORM | Prisma |
| Database | PostgreSQL |
| Queue | BullMQ |
| Broker | Redis |
| Browser | Playwright |
| AI | Anthropic Claude |

---

## مستندات

| فایل | محتوا |
|------|-------|
| [docs/CLAUDE.md](docs/CLAUDE.md) | راهنمای عامل هوش مصنوعی و قوانین کدنویسی |
| [docs/DESIGN.md](docs/DESIGN.md) | تصمیمات معماری و جریان داده |
| [docs/PROGRESS.md](docs/PROGRESS.md) | وضعیت فازها و پیشرفت پروژه |
| [docs/TASKS.md](docs/TASKS.md) | لیست تسک‌های اجرایی |
| [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) | مستندات کامل API |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture Decision Records |

---

## وضعیت پروژه

🔄 **فاز 0 — در حال اجرا** (راه‌اندازی پایه)

---

*پروژه داخلی تیم قطعه‌لاین*
