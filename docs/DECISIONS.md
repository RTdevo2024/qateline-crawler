# DECISIONS.md — Architecture Decision Records (ADR)

> هر تصمیم معماری مهم باید اینجا ثبت شود.
> فرمت: شماره، عنوان، تاریخ، وضعیت، context، تصمیم، پیامدها.

---

## ADR-001: Next.js App Router به عنوان Framework اصلی

**تاریخ:** 2026-05-23
**وضعیت:** ✅ تصویب‌شده
**تصمیم‌گیرنده:** تیم قطعه‌لاین

### Context
نیاز به یک framework داریم که هم API backend و هم UI پنل مدیریت را پوشش دهد. تیم آشنایی با TypeScript دارد.

### تصمیم
استفاده از Next.js 14 با App Router به عنوان تنها framework.

### دلایل
- API Routes + Server Components در یک codebase
- یک دیپلوی به جای دو سرویس جداگانه
- Shared types بین backend و frontend
- اکوسیستم بالغ و مستندات قوی

### پیامدها
- **مثبت:** کاهش پیچیدگی ops، type safety کامل end-to-end
- **منفی:** Workers باید در process جداگانه اجرا شوند (Next.js برای long-running processes مناسب نیست)
- **راه حل منفی:** `worker/index.ts` به عنوان entry point مجزا

---

## ADR-002: PostgreSQL با jsonb برای داده نیمه‌ساختاریافته

**تاریخ:** 2026-05-23
**وضعیت:** ✅ تصویب‌شده
**تصمیم‌گیرنده:** تیم قطعه‌لاین

### Context
داده محصولات از سایت‌های مختلف schema های متفاوتی دارند. هر سایت مشخصات فنی متفاوتی ارائه می‌دهد.

### تصمیم
PostgreSQL با ستون‌های `jsonb` برای داده‌های variable-schema.

### دلایل
- `rawData: jsonb` برای داده خام کرالر (هر سایت متفاوت)
- Relational برای روابط Job/Product/Log
- ACID transactions برای consistency
- Prisma support کامل برای PostgreSQL

### پیامدها
- **مثبت:** انعطاف برای داده خام + integrity برای روابط
- **منفی:** نیاز به PostgreSQL 16+ (در Docker قابل حل)

---

## ADR-003: Adapter Pattern برای کرالرها

**تاریخ:** 2026-05-23
**وضعیت:** ✅ تصویب‌شده
**تصمیم‌گیرنده:** تیم قطعه‌لاین

### Context
پروژه در آینده باید سایت‌های مختلفی را پشتیبانی کند. هر سایت scraping logic کاملاً متفاوتی دارد.

### تصمیم
`CrawlerAdapter` abstract class + یک implementation به ازای هر سایت + factory function.

### دلایل
- Open/Closed Principle: اضافه کردن سایت جدید بدون تغییر کد موجود
- تست مستقل هر سایت
- یکسان‌سازی output format با وجود input های متفاوت

### پیامدها
- **مثبت:** scalability آسان، isolation خوب
- **منفی:** boilerplate بیشتر برای هر سایت جدید

---

## ADR-004: BullMQ برای پردازش async

**تاریخ:** 2026-05-23
**وضعیت:** ✅ تصویب‌شده
**تصمیم‌گیرنده:** تیم قطعه‌لاین

### Context
عملیات کرال (۳-۳۰ ثانیه) و آپلود (۱-۵ ثانیه) نمی‌توانند در HTTP request انجام شوند. نیاز به retry mechanism و visibility هم داریم.

### تصمیم
BullMQ با Redis که از قبل در stack بود.

### دلایل
- Redis در stack بود (نه dependency جدید)
- Built-in retry با backoff
- Job priority و delay
- Bull Board برای visibility

### پیامدها
- **مثبت:** retry خودکار، concurrency control، monitoring
- **منفی:** وابستگی به Redis — اگر Redis down شود queue متوقف می‌شود
- **راه حل:** Redis persistence با AOF + health checks

---

## ADR-005: Repository Pattern برای دسترسی به DB

**تاریخ:** 2026-05-23
**وضعیت:** ✅ تصویب‌شده
**تصمیم‌گیرنده:** تیم قطعه‌لاین

### Context
اگر مستقیم با Prisma client در همه جای کد کار کنیم، تغییر schema یا ORM مشکل‌ساز می‌شود.

### تصمیم
همه دسترسی به DB از طریق Repository classes.

### دلایل
- تست با mock repository آسان‌تر
- تغییر ORM در آینده بدون تغییر business logic
- یکجا شدن logic دسترسی به DB

### پیامدها
- **مثبت:** testability و maintainability بهتر
- **منفی:** یک لایه abstraction اضافه

---

## الگوی ADR جدید

برای ثبت تصمیم جدید از این template استفاده کنید:

```markdown
## ADR-XXX: عنوان تصمیم

**تاریخ:** YYYY-MM-DD
**وضعیت:** ✅ تصویب‌شده | 🔄 در بررسی | ❌ رد شده | ⚠️ منسوخ
**تصمیم‌گیرنده:** نام/تیم

### Context
چرا این تصمیم لازم بود؟

### تصمیم
چه تصمیمی گرفته شد؟

### دلایل
- دلیل ۱
- دلیل ۲

### پیامدها
- **مثبت:** ...
- **منفی:** ...
- **راه حل منفی:** (اگر راه حل دارید)
```

---

*آخرین به‌روزرسانی: 2026-05-23*
