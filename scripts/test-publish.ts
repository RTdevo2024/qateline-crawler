#!/usr/bin/env tsx
/**
 * test-publish.ts — تست دستی انتشار محصول در قطعه‌لاین
 *
 * استفاده:
 *   npx tsx scripts/test-publish.ts
 *
 * پیش‌نیاز:
 *   GHATELINE_API_KEY، GHATELINE_API_BASE_URL،
 *   GHATELINE_ADMIN_USER_ID، GHATELINE_DEFAULT_STORAGE_UUID در .env.local
 */

import { GhatelineApiError, getPublisher } from '../src/lib/ghateline';
import type { PublishInput } from '../src/lib/ghateline';

// ─────────────────────────────────────────────────────────────────────────────
// Sample product data — شبیه‌سازی خروجی AIProcessor
// ─────────────────────────────────────────────────────────────────────────────

const sampleInput: PublishInput = {
  aiOutput: {
    title: 'فیلتر روغن بوش مناسب پراید ۱۳۱ و ساینا — کیفیت اروپایی',
    description: `<p>فیلتر روغن بوش (Bosch) یکی از بهترین گزینه‌ها برای
نگهداری موتور خودروهای پراید ۱۳۱ و ساینا است.</p>
<ul>
  <li>ساخت شرکت بوش آلمان</li>
  <li>مناسب موتورهای M13 و B13</li>
  <li>گواهینامه اروپایی E-Mark</li>
  <li>مقاومت بالا در برابر فشار و حرارت</li>
</ul>
<p>این فیلتر با استفاده از فناوری پیشرفته تولید شده و عمر موتور را افزایش می‌دهد.</p>`,
    category: 'فیلترها',
    attrs: [
      { key: 'برند', value: 'بوش' },
      { key: 'مناسب برای', value: 'پراید ۱۳۱، ساینا' },
      { key: 'نوع موتور', value: 'M13، B13' },
      { key: 'گواهینامه', value: 'E-Mark اروپایی' },
      { key: 'کشور ساخت', value: 'آلمان' },
    ],
    title_en: 'Bosch Oil Filter for Pride 131 and Saina',
    slug: 'فیلتر-روغن-بوش-پراید-۱۳۱-ساینا',
    seo_title: 'فیلتر روغن بوش پراید ۱۳۱ و ساینا | قطعه‌لاین',
    seo_description:
      'خرید فیلتر روغن اصل بوش مناسب پراید ۱۳۱ و ساینا با گارانتی اصالت کالا از قطعه‌لاین',
  },
  inventory: {
    price: 450_000,
    count: 10,
    original: true,
    weight: 350,
  },
  categoryMapping: {
    'فیلترها': 5,
    'لوازم جانبی خودرو': 3,
    'قطعات موتور': 4,
  },
  images: [
    'https://example.com/images/bosch-oil-filter-1.jpg',
    'https://example.com/images/bosch-oil-filter-2.jpg',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function printSep(label: string): void {
  const line = '─'.repeat(55);
  console.log(`\n${line}`);
  console.log(` ${label}`);
  console.log(line);
}

function checkEnv(): void {
  const required = [
    'GHATELINE_API_KEY',
    'GHATELINE_ADMIN_USER_ID',
    'GHATELINE_DEFAULT_STORAGE_UUID',
  ];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error('\n✗ متغیرهای محیطی زیر تنظیم نشده‌اند:');
    missing.forEach(k => console.error(`    ${k}`));
    console.error('\nدر .env.local تنظیم کنید و دوباره اجرا کنید.');
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  checkEnv();

  const baseUrl = process.env.GHATELINE_API_BASE_URL ?? 'https://ghateline.com';
  const apiKey = process.env.GHATELINE_API_KEY ?? '';
  console.log(`\n[test-publish] base: ${baseUrl}`);
  console.log(`[test-publish] key : ${apiKey.slice(0, 6)}...`);

  printSep('اطلاعات محصول نمونه');
  console.log(`  عنوان  : ${sampleInput.aiOutput.title}`);
  console.log(`  دسته   : ${sampleInput.aiOutput.category ?? '—'}`);
  console.log(`  قیمت   : ${sampleInput.inventory.price.toLocaleString('fa-IR')} ریال`);
  console.log(`  موجودی : ${sampleInput.inventory.count} عدد`);

  printSep('انتشار...');

  let publisher;
  try {
    publisher = getPublisher();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n✗ خطا در ساخت Publisher: ${msg}`);
    process.exit(1);
  }

  try {
    const result = await publisher.publishProduct(sampleInput);

    printSep('نتیجه — موفق');
    console.log(`\n  product_uuid  : ${result.productUuid}`);
    console.log(`  inventory_uuid: ${result.inventoryUuid}`);
    console.log('\n✓ محصول با موفقیت در قطعه‌لاین منتشر شد (وضعیت: draft)\n');
  } catch (err) {
    printSep('نتیجه — شکست');

    if (err instanceof GhatelineApiError) {
      console.error(`\n✗ GhatelineApiError [HTTP ${err.status}]: ${err.message}`);
      if (err.data !== undefined) {
        console.error('\n  جزئیات خطا:');
        console.error(JSON.stringify(err.data, null, 2));
      }
    } else if (err instanceof Error) {
      console.error(`\n✗ ${err.name}: ${err.message}`);
    } else {
      console.error('\n✗ خطای ناشناخته:', err);
    }

    console.error('\n  راهنمای رفع خطا:');
    console.error('    ۱. GHATELINE_ADMIN_USER_ID باید عدد صحیح باشد (نه UUID)');
    console.error('    ۲. GHATELINE_DEFAULT_STORAGE_UUID باید UUID معتبر انبار باشد');
    console.error('    ۳. category_id مورد استفاده باید در سیستم قطعه‌لاین وجود داشته باشد');
    console.error('    ۴. تعداد در inventory.count باید بزرگتر از صفر باشد\n');

    process.exit(1);
  }
}

void main();
