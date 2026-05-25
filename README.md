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

| ابزار | نسخه حداقل |
|-------|------------|
| Node.js | 20.x |
| npm | 10.x |
| Docker Desktop | 4.x |

---

## راه‌اندازی محلی (Local Setup)

### ۱. Clone و نصب dependencies

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

**متغیرهای ضروری:**

| متغیر | توضیح | مقدار پیش‌فرض (local) |
|-------|-------|----------------------|
| `DATABASE_URL` | آدرس اتصال PostgreSQL | `postgresql://postgres:postgres@localhost:5432/qateline_crawler` |
| `REDIS_URL` | آدرس اتصال Redis | `redis://localhost:6379` |
| `OPENAI_API_KEY` | کلید API اوپن‌ای‌آی | — |
| `GHATELINE_API_KEY` | کلید API قطعه‌لاین | — |
| `GHATELINE_API_BASE_URL` | آدرس پایه API قطعه‌لاین | `https://ghateline.com` |
| `GHATELINE_ADMIN_USER_ID` | UUID کاربر admin | — |
| `GHATELINE_DEFAULT_STORAGE_UUID` | UUID انبار پیش‌فرض | — |
| `NEXTAUTH_SECRET` | کلید رمزنگاری session | — |
| `NEXTAUTH_URL` | آدرس اپلیکیشن | `http://localhost:3000` |

### ۳. راه‌اندازی سرویس‌های Docker

```bash
# اجرای PostgreSQL و Redis در پس‌زمینه
docker compose up -d

# بررسی وضعیت و healthcheck سرویس‌ها
docker compose ps
```

پس از اجرا، هر دو سرویس باید وضعیت `healthy` داشته باشند:

```
NAME                 STATUS
qateline_postgres    Up X seconds (healthy)
qateline_redis       Up X seconds (healthy)
```

**پورت‌ها:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### ۴. Migration دیتابیس

```bash
# ایجاد جداول (اولین بار یا بعد از تغییر schema)
npx prisma migrate dev
```

### ۵. Seed دیتابیس

```bash
# پر کردن داده‌های اولیه (SourceSite‌ها، Settings پیش‌فرض)
npx prisma db seed
```

### ۶. اجرا

> **مهم:** Next.js و Workers باید در دو ترمینال جداگانه اجرا شوند.

```bash
# ترمینال ۱ — Next.js dev server (API Routes + پنل)
npm run dev

# ترمینال ۲ — BullMQ workers (کرال + AI + انتشار)
npm run worker:dev
```

پنل مدیریت در `http://localhost:3000` در دسترس است.

#### چرا Workers جدا از Next.js اجرا می‌شوند؟

Workers فرآیندهای طولانی‌مدت هستند که به طور مداوم صف BullMQ را listen می‌کنند.
Next.js یک وب سرور است که request/response را مدیریت می‌کند.
این دو در معماری مجزا بهتر کار می‌کنند:

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│  Next.js (port 3000)    │     │  Workers (no port)           │
│  - API Routes           │     │  - CrawlWorker (concurrency=3)│
│  - پنل مدیریت          │◄────►│  - AIWorker    (concurrency=2)│
│  - enqueue کردن jobs    │     │  - PublishWorker (concurrency=1)│
└─────────────────────────┘     └──────────────────────────────┘
         │                                   │
         └──────────────┬────────────────────┘
                        │
              ┌──────────┴──────────┐
              │      Redis          │  ← BullMQ Queue Broker
              └─────────────────────┘
```

---

## ابزارهای کاربردی

```bash
# Prisma Studio — رابط گرافیکی دیتابیس
npx prisma studio

# بررسی TypeScript
npx tsc --noEmit

# Build کامل
npm run build

# تست دستی کرالر (بدون DB)
npm run test:crawl -- <url>

# تست دستی pipeline کامل (نیاز به DB + Redis + Worker)
npm run test:pipeline -- <url>

# تست AI processor
npm run test:ai

# تست Ghateline API
npm run test:ghateline
```

### تست Pipeline کامل

برای تست کامل کرال → AI:

```bash
# ۱. services را راه‌اندازی کنید
docker compose up -d

# ۲. migration را اعمال کنید
npx prisma migrate dev

# ۳. Worker را در یک terminal راه‌اندازی کنید
npm run worker:dev

# ۴. در terminal دیگر، pipeline را تست کنید
npm run test:pipeline -- https://www.yadakmarket.com/product/...
```

وضعیت هر ۳ ثانیه نمایش داده می‌شود:
```
[۱۲:۳۰:۱۵] 📥  وضعیت: RAW
[۱۲:۳۰:۱۸] 🤖  وضعیت: PROCESSED
✅ Pipeline تا مرحله AI کامل شد!
```

---

## مدیریت Docker

```bash
# شروع سرویس‌ها
docker compose up -d

# توقف سرویس‌ها (داده‌ها حفظ می‌شوند)
docker compose stop

# حذف کانتینرها (داده‌ها در volume باقی می‌مانند)
docker compose down

# حذف کامل شامل داده‌ها (با احتیاط!)
docker compose down -v

# مشاهده لاگ‌ها
docker compose logs -f postgres
docker compose logs -f redis
```

---

## Stack

| لایه | تکنولوژی |
|------|-----------|
| Framework | Next.js 14 App Router |
| زبان | TypeScript (strict) |
| UI | shadcn/ui + Tailwind CSS |
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

✅ **فاز 0 — کامل** (راه‌اندازی پایه)
🔄 **فاز 1 — در حال اجرا** (هسته کرالر)

---

*پروژه داخلی تیم قطعه‌لاین*
