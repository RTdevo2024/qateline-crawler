#!/usr/bin/env tsx
/**
 * test-crawl.ts — CLI برای تست دستی کرالر
 *
 * استفاده:
 *   npx tsx scripts/test-crawl.ts <url>
 *   npm run test:crawl -- <url>
 *
 * مثال:
 *   npx tsx scripts/test-crawl.ts https://www.yadakmarket.com/product/some-product/
 */

import { Crawler } from '../src/lib/crawler/core/crawler';
// این import به عنوان side-effect همه adapter ها را ثبت می‌کند
import '../src/lib/crawler/adapters/index';

async function main(): Promise<void> {
  const url = process.argv[2];

  if (!url) {
    console.error('خطا: آدرس URL ارائه نشده است.');
    console.error('استفاده: npx tsx scripts/test-crawl.ts <url>');
    process.exit(1);
  }

  console.log(`\n🔍 شروع کرال: ${url}\n`);

  const crawler = new Crawler();

  try {
    const result = await crawler.crawl(url);

    console.log('✅ کرال موفق:\n');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n─── خلاصه ───────────────────────────────────');
    console.log(`عنوان:    ${result.product.title}`);
    console.log(`قیمت:     ${result.inventory.price.toLocaleString('fa-IR')}`);
    console.log(`موجودی:   ${result.inventory.inStock ? 'موجود' : 'ناموجود'}`);
    console.log(`تصاویر:   ${result.product.images.length} عکس`);
    console.log(`مشخصات:   ${Object.keys(result.product.attributes).length} ردیف`);
    if (result.product.brand) console.log(`برند:     ${result.product.brand}`);
    if (result.product.category) console.log(`دسته:     ${result.product.category}`);
    console.log('─────────────────────────────────────────────\n');
  } catch (error) {
    console.error('❌ کرال ناموفق:');
    if (error instanceof Error) {
      console.error(`  ${error.name}: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

void main();
