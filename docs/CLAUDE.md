# CLAUDE.md — راهنمای عامل هوش مصنوعی

> این فایل برای Claude Code، Codex، و هر عامل هوش مصنوعی دیگری نوشته شده که روی این پروژه کار می‌کند.
> قبل از هر اقدامی این فایل را کامل بخوانید.

---

## قانون اول — فایل‌های ردگیری

**همیشه قبل از شروع هر تسک:**
1. `docs/PROGRESS.md` را بخوانید تا وضعیت کلی پروژه را بدانید.
2. `docs/TASKS.md` را بخوانید تا تسک جاری و وابستگی‌هایش را بشناسید.

**همیشه بعد از اتمام هر تسک:**
1. وضعیت تسک را در `docs/TASKS.md` به `[x]` تغییر دهید.
2. بخش مربوطه را در `docs/PROGRESS.md` آپدیت کنید.
3. اگر تصمیم معماری مهمی گرفتید، در `docs/DECISIONS.md` ثبت کنید.

---

## معرفی پروژه

**qateline-crawler** یک سیستم کرالر هوشمند است که:
- از سایت‌های فروشگاهی ایرانی (دیجی‌کالا، ترب، ...) محصولات را استخراج می‌کند
- با کمک Claude AI توضیحات و دسته‌بندی را بهینه می‌کند
- محصولات را از طریق REST API روی فروشگاه قطعه‌لاین بارگذاری می‌کند
- یک پنل مدیریت وب برای کنترل فرآیند ارائه می‌دهد

**مخاطب اصلی:** تیم داخلی قطعه‌لاین

---

## Stack تکنولوژی

| لایه | تکنولوژی | نسخه | دلیل انتخاب |
|------|-----------|------|-------------|
| Framework | Next.js App Router | 14.x | SSR + API Routes در یک پروژه |
| زبان | TypeScript | 5.x | strict mode اجباری |
| ORM | Prisma | 5.x | type-safe DB access |
| Database | PostgreSQL | 16.x | ACID + jsonb برای داده خام |
| Queue | BullMQ | 5.x | retry، concurrency، job scheduling |
| Cache/Broker | Redis | 7.x | BullMQ broker + session cache |
| Browser Automation | Playwright | 1.x | کرالر JS-heavy sites |
| AI | Anthropic Claude SDK | latest | بهینه‌سازی توضیحات محصول |
| Auth | NextAuth.js | 4.x | session management پنل |
| Styling | Tailwind CSS | 3.x | پنل مدیریت |

---

## ساختار پوشه‌ها

```
qateline-crawler/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # Route Handlers (API endpoints)
│   │   │   ├── crawl/
│   │   │   ├── products/
│   │   │   ├── jobs/
│   │   │   └── auth/
│   │   ├── (dashboard)/            # پنل مدیریت (route group)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── jobs/
│   │   │   └── products/
│   │   └── layout.tsx
│   │
│   ├── lib/                        # منطق اصلی (framework-agnostic)
│   │   ├── crawlers/               # Adapter Pattern
│   │   │   ├── base.crawler.ts     # abstract class CrawlerAdapter
│   │   │   ├── digikala.crawler.ts
│   │   │   ├── torob.crawler.ts
│   │   │   └── index.ts            # factory function getCrawler(url)
│   │   │
│   │   ├── queue/                  # BullMQ workers و queues
│   │   │   ├── crawl.queue.ts
│   │   │   ├── publish.queue.ts
│   │   │   └── workers/
│   │   │       ├── crawl.worker.ts
│   │   │       └── publish.worker.ts
│   │   │
│   │   ├── ghateline/              # کلاینت API قطعه‌لاین
│   │   │   ├── client.ts
│   │   │   ├── products.ts
│   │   │   ├── inventories.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── ai/                     # Anthropic SDK wrapper
│   │   │   ├── claude.ts
│   │   │   └── prompts/
│   │   │
│   │   ├── db/                     # Repository Pattern
│   │   │   ├── product.repository.ts
│   │   │   ├── job.repository.ts
│   │   │   └── prisma.ts           # singleton Prisma client
│   │   │
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── validators.ts
│   │
│   └── types/                      # TypeScript global types
│       ├── crawler.types.ts
│       ├── product.types.ts
│       └── api.types.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── worker/                         # Entry point مجزا برای BullMQ workers
│   └── index.ts
│
├── docs/                           # مستندات (این پوشه)
├── logs/                           # gitignored
├── .env.example
├── .env.local                      # gitignored
├── package.json
├── tsconfig.json
└── README.md
```

---

## الگوهای طراحی

### 1. Adapter Pattern — کرالرها

هر سایت یک کلاس جداگانه دارد که از `CrawlerAdapter` extends می‌کند:

```typescript
// src/lib/crawlers/base.crawler.ts
export abstract class CrawlerAdapter {
  abstract readonly siteName: string;
  abstract readonly baseUrl: string;

  abstract canHandle(url: string): boolean;
  abstract crawlProduct(url: string): Promise<RawProduct>;
  abstract crawlCategory(url: string): Promise<RawProduct[]>;
}
```

Factory function تشخیص می‌دهد کدام adapter را استفاده کند:

```typescript
// src/lib/crawlers/index.ts
export function getCrawler(url: string): CrawlerAdapter {
  const crawlers = [new DigikalaCrawler(), new TorobCrawler()];
  const crawler = crawlers.find(c => c.canHandle(url));
  if (!crawler) throw new UnsupportedSiteError(url);
  return crawler;
}
```

### 2. Repository Pattern — دیتابیس

هیچ‌جا مستقیم با Prisma client کار نکنید. همیشه از Repository استفاده کنید:

```typescript
// استفاده صحیح
const product = await productRepository.findByUrl(url);

// استفاده غلط - ممنوع
const product = await prisma.product.findFirst({ where: { url } });
```

### 3. Queue Pattern — عملیات async

هر عملیات طولانی‌مدت باید از طریق BullMQ queue انجام شود. هیچ‌گاه مستقیم در request handler کرال نکنید.

---

## قوانین کدنویسی

### TypeScript
- `strict: true` در `tsconfig.json` — هیچ exception نمی‌پذیریم
- `any` ممنوع — از `unknown` استفاده کنید و type guard بنویسید
- همه function های public باید return type صریح داشته باشند
- `interface` برای object shapes، `type` برای unions و utility types

### Naming Conventions
- فایل‌ها: `kebab-case.ts` (مثال: `crawl.worker.ts`)
- Class ها: `PascalCase` (مثال: `DigikalaCrawler`)
- Function ها و متغیرها: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Prisma models: `PascalCase` در schema، `camelCase` در کد
- Environment variables: `UPPER_SNAKE_CASE`

### Error Handling
- همه خطاهای قابل پیش‌بینی را با custom error class مدیریت کنید
- در API routes، خطاها را با `NextResponse.json({ error: ... }, { status: ... })` برگردانید
- در workers، خطاها را log کنید و job را با مشخص کردن دلیل fail کنید
- هرگز `console.log` در کد نهایی نگذارید — از `logger.ts` استفاده کنید

```typescript
// src/lib/utils/logger.ts را ایجاد کنید با winston یا pino
import { logger } from '@/lib/utils/logger';

logger.info('Crawl started', { url, jobId });
logger.error('Crawl failed', { url, error: err.message });
```

### Import Order
1. Node.js built-ins
2. Third-party packages
3. Internal packages (`@/...`)
4. Relative imports (`./...`)

---

## محیط و Environment Variables

همه متغیرهای محیطی در `.env.example` تعریف شده‌اند.
- در development از `.env.local` استفاده کنید
- هرگز `.env.local` را commit نکنید
- هر متغیر جدید باید در `.env.example` با مقدار نمونه اضافه شود

---

## Commit Convention

از Conventional Commits استفاده کنید:

```
<type>(<scope>): <description>

feat(crawler): add Torob adapter
fix(queue): handle Redis connection retry
docs(api): add inventory endpoints
refactor(db): extract product repository
test(crawler): add Digikala unit tests
chore(deps): upgrade Playwright to 1.45
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`
**Scopes:** `crawler`, `queue`, `db`, `api`, `ai`, `ui`, `auth`, `deps`

---

## چک‌لیست قبل از اتمام هر تسک

- [ ] تایپ‌اسکریپت خطا نمی‌دهد (`tsc --noEmit`)
- [ ] Linter پاس می‌شود (`eslint src/`)
- [ ] تست‌های مربوط به تسک نوشته و پاس شده‌اند
- [ ] هیچ `console.log` باقی نمانده
- [ ] هیچ `any` type اضافه نشده
- [ ] `.env.example` برای متغیرهای جدید آپدیت شده
- [ ] `docs/TASKS.md` آپدیت شده
- [ ] `docs/PROGRESS.md` آپدیت شده
- [ ] اگر تصمیم معماری گرفتید: `docs/DECISIONS.md` آپدیت شده

---

## نکات مهم قطعه‌لاین API

- Auth header: `X-API-KEY: <key>` — نه Bearer token
- همه UUID ها باید در قالب `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` باشند
- `GHATELINE_ADMIN_USER_ID` برای انتساب محصولات به کاربر admin استفاده می‌شود
- `GHATELINE_DEFAULT_STORAGE_UUID` انبار پیش‌فرض برای موجودی است
- مستندات کامل API در `docs/API_CONTRACTS.md` است

---

## اجرای محلی

```bash
# نصب وابستگی‌ها
npm install

# راه‌اندازی دیتابیس
npx prisma migrate dev

# اجرای dev server
npm run dev

# اجرای workers (ترمینال جداگانه)
npm run worker

# اجرای تست‌ها
npm test
```

---

*آخرین به‌روزرسانی: فاز 0 — راه‌اندازی اولیه*
