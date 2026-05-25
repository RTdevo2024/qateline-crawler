/**
 * workers/index.ts — نقطه ورود اجرای همه Worker ها
 *
 * اجرا:
 *   npm run worker          # production
 *   npm run worker:dev      # development (hot-reload)
 *
 * این فایل مستقل از Next.js اجرا می‌شود.
 * باید همزمان با Next.js dev server در یک terminal جداگانه اجرا شود.
 *
 * معماری:
 *   ┌──────────────────────────────────────────────────────┐
 *   │  Terminal 1: npm run dev   → Next.js + API Routes    │
 *   │  Terminal 2: npm run worker:dev → BullMQ Workers     │
 *   │  (هر دو به Redis و PostgreSQL متصل می‌شوند)          │
 *   └──────────────────────────────────────────────────────┘
 */

import { createCrawlWorker } from './crawl-worker';
import { createAIWorker } from './ai-worker';
import { createPublishWorker } from './publish-worker';
import { closeAllQueues } from '@/lib/queue/queues';

async function startWorkers(): Promise<void> {
  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  🚀 qateline-crawler — BullMQ Workers');
  console.log('══════════════════════════════════════════════════');
  console.log('');

  // بررسی متغیرهای محیطی ضروری
  const requiredEnvVars = ['DATABASE_URL', 'REDIS_URL'];
  const missing = requiredEnvVars.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('✗ متغیرهای محیطی زیر تنظیم نشده‌اند:');
    missing.forEach((k) => console.error(`    ${k}`));
    console.error('  در .env.local تنظیم کنید.\n');
    process.exit(1);
  }

  // راه‌اندازی worker ها
  const crawlWorker = createCrawlWorker();
  const aiWorker = createAIWorker();
  const publishWorker = createPublishWorker();

  console.log('');
  console.log('✅ همه worker ها شروع به کار کردند.');
  console.log('   منتظر job های جدید در صف‌های crawl | ai | publish');
  console.log('   برای توقف Ctrl+C را فشار دهید.');
  console.log('');

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────

  let isShuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n⏹  سیگنال ${signal} دریافت شد — در حال توقف graceful...`);
    console.log('   لطفاً صبر کنید تا job های در حال اجرا تمام شوند.\n');

    try {
      // بستن worker ها — job های فعلی تا اتمام ادامه می‌یابند
      await Promise.all([
        crawlWorker.close(),
        aiWorker.close(),
        publishWorker.close(),
      ]);

      // بستن اتصالات صف‌ها
      await closeAllQueues();

      console.log('✅ همه worker ها متوقف شدند.\n');
      process.exit(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗ خطا در shutdown: ${message}`);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // نگه داشتن process در حال اجرا
  // (Worker ها event listener دارند و process را alive نگه می‌دارند)
}

void startWorkers().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('✗ خطا در راه‌اندازی worker ها:', message);
  process.exit(1);
});
