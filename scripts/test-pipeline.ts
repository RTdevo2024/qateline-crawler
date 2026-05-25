#!/usr/bin/env tsx
/**
 * test-pipeline.ts — تست pipeline کامل: URL → کرال → AI → (review دستی) → انتشار
 *
 * استفاده:
 *   npx tsx scripts/test-pipeline.ts <url>
 *   npm run test:pipeline -- <url>
 *
 * مثال:
 *   npx tsx scripts/test-pipeline.ts https://www.yadakmarket.com/product/...
 *
 * پیش‌نیازها:
 *   ۱. Docker سرویس‌ها در حال اجرا:  docker compose up -d
 *   ۲. Migration اعمال شده:           npx prisma migrate dev
 *   ۳. Worker در حال اجرا (terminal دیگر): npm run worker:dev
 *   ۴. متغیرهای DATABASE_URL و REDIS_URL در .env.local تنظیم شده باشند
 *
 * این script:
 *   1. Adapter مناسب برای URL پیدا می‌کند
 *   2. SourceSite مربوطه را در DB پیدا یا ایجاد می‌کند
 *   3. CrawlJob و CrawledProduct در DB می‌سازد
 *   4. job کرال در صف می‌گذارد
 *   5. هر ۳ ثانیه وضعیت را چک و نمایش می‌دهد
 */

// import side-effect: ثبت همه adapter ها
import '../src/lib/crawler/adapters/index';
import { adapterRegistry } from '../src/lib/crawler/core/adapter-registry';
import { prisma } from '../src/lib/db/prisma';
import { getCrawlQueue } from '../src/lib/queue/queues';

const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 30; // حداکثر ۹۰ ثانیه انتظار

// ─────────────────────────────────────────────────────────────────────────────

function checkEnvVars(): void {
  const required = ['DATABASE_URL', 'REDIS_URL'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('\n✗ متغیرهای محیطی زیر تنظیم نشده‌اند:');
    missing.forEach((k) => console.error(`    ${k}`));
    console.error('  در .env.local تنظیم کنید و دوباره اجرا کنید.\n');
    process.exit(1);
  }
}

function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    RAW: '📥',
    PROCESSED: '🤖',
    REVIEWED: '👀',
    PUBLISHED: '🚀',
    REJECTED: '❌',
    FAILED: '💥',
  };
  return map[status] ?? '⏳';
}

// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  checkEnvVars();

  const url = process.argv[2];
  if (!url) {
    console.error('\n✗ URL ارائه نشده است.');
    console.error('  استفاده: npx tsx scripts/test-pipeline.ts <url>\n');
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('  🔬 qateline-crawler — Test Pipeline');
  console.log('══════════════════════════════════════════════════\n');
  console.log(`URL: ${url}\n`);

  // ۱. پیدا کردن adapter مناسب
  const adapter = adapterRegistry.findByUrl(url);
  if (!adapter) {
    console.error(`✗ هیچ adapter ای برای این URL پیدا نشد: ${url}`);
    console.error('  adapters موجود:', adapterRegistry.listAll().map((a) => a.name).join(', '));
    process.exit(1);
  }
  console.log(`✅ Adapter: ${adapter.name}`);

  // ۲. پیدا یا ایجاد SourceSite
  let sourceSite = await prisma.sourceSite.findFirst({
    where: { adapterKey: adapter.name },
  });

  if (!sourceSite) {
    let origin: string;
    try {
      origin = new URL(url).origin;
    } catch {
      origin = url;
    }

    sourceSite = await prisma.sourceSite.create({
      data: {
        name: adapter.name,
        slug: adapter.name,
        baseUrl: origin,
        adapterKey: adapter.name,
      },
    });
    console.log(`✅ SourceSite ایجاد شد: ${sourceSite.id}`);
  } else {
    console.log(`✅ SourceSite یافت شد: ${sourceSite.id}`);
  }

  // ۳. ایجاد CrawlJob در DB
  const crawlJob = await prisma.crawlJob.create({
    data: {
      sourceSiteId: sourceSite.id,
      inputUrls: [url],
      total: 1,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });
  console.log(`✅ CrawlJob ایجاد شد: ${crawlJob.id}`);

  // ۴. ایجاد CrawledProduct در DB
  const crawledProduct = await prisma.crawledProduct.create({
    data: {
      crawlJobId: crawlJob.id,
      sourceUrl: url,
    },
  });
  console.log(`✅ CrawledProduct ایجاد شد: ${crawledProduct.id}`);

  // ۵. enqueue کردن job کرال
  const queue = getCrawlQueue();
  const bullJob = await queue.add('crawl', {
    crawledProductId: crawledProduct.id,
    sourceUrl: url,
  });

  console.log(`\n📨 Job در صف قرار گرفت: ${bullJob.id ?? '?'}`);
  console.log(`\n⏳ نظارت بر وضعیت (هر ${POLL_INTERVAL_MS / 1_000} ثانیه)...\n`);
  console.log('───────────────────────────────────────────────────');

  // ۶. polling وضعیت
  return new Promise((resolve, reject) => {
    let polls = 0;

    const interval = setInterval(() => {
      polls++;

      void (async () => {
        try {
          const product = await prisma.crawledProduct.findUnique({
            where: { id: crawledProduct.id },
            select: {
              status: true,
              errorMessage: true,
              rawAt: true,
              processedAt: true,
              publishedAt: true,
              ghatelineProductUuid: true,
            },
          });

          if (!product) {
            clearInterval(interval);
            reject(new Error('CrawledProduct در DB یافت نشد'));
            return;
          }

          const emoji = statusEmoji(product.status);
          const time = new Date().toLocaleTimeString('fa-IR');
          console.log(`[${time}] ${emoji}  وضعیت: ${product.status}`);

          // اتمام یا خطا
          if (product.status === 'FAILED') {
            console.error(`\n💥 خطا: ${product.errorMessage ?? '(نامشخص)'}`);
            clearInterval(interval);
            await cleanup(queue);
            resolve();
            return;
          }

          if (product.status === 'PROCESSED') {
            console.log('\n─────────────────────────────────────────────────');
            console.log('✅ Pipeline تا مرحله AI کامل شد!');
            console.log('');
            console.log(`   CrawledProduct ID : ${crawledProduct.id}`);
            if (product.rawAt) {
              console.log(
                `   کرال در          : ${product.rawAt.toLocaleString('fa-IR')}`,
              );
            }
            if (product.processedAt) {
              console.log(
                `   پردازش AI در     : ${product.processedAt.toLocaleString('fa-IR')}`,
              );
            }
            console.log('');
            console.log('   📋 مراحل بعدی:');
            console.log('      ۱. محصول را در پنل بررسی کنید');
            console.log('      ۲. وضعیت را به REVIEWED تغییر دهید');
            console.log('      ۳. job publish را enqueue کنید');
            console.log('         (از طریق پنل یا: enqueuePublish({ crawledProductId }))');
            console.log('');
            clearInterval(interval);
            await cleanup(queue);
            resolve();
            return;
          }

          if (product.status === 'PUBLISHED') {
            console.log('\n🎉 Pipeline کامل شد!');
            if (product.ghatelineProductUuid) {
              console.log(
                `   product_uuid: ${product.ghatelineProductUuid}`,
              );
            }
            clearInterval(interval);
            await cleanup(queue);
            resolve();
            return;
          }

          // timeout
          if (polls >= MAX_POLLS) {
            console.log(
              `\n⏰ Timeout — وضعیت هنوز ${product.status} است پس از ${(MAX_POLLS * POLL_INTERVAL_MS) / 1_000} ثانیه.`,
            );
            console.log('   worker را بررسی کنید: npm run worker:dev');
            clearInterval(interval);
            await cleanup(queue);
            resolve();
          }
        } catch (err) {
          clearInterval(interval);
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      })();
    }, POLL_INTERVAL_MS);
  });
}

async function cleanup(queue: Awaited<ReturnType<typeof getCrawlQueue>>): Promise<void> {
  try {
    await queue.close();
    await prisma.$disconnect();
  } catch {
    // ignore cleanup errors
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n✗ خطا: ${message}\n`);
  process.exit(1);
});
