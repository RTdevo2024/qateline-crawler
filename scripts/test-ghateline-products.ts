#!/usr/bin/env tsx
/**
 * test-ghateline-products.ts — تست دستی API محصولات قطعه‌لاین
 *
 * استفاده:
 *   npx tsx scripts/test-ghateline-products.ts
 *   npx tsx scripts/test-ghateline-products.ts list
 *   npx tsx scripts/test-ghateline-products.ts get <uuid>
 *
 * پیش‌نیاز: GHATELINE_API_KEY و GHATELINE_API_BASE_URL در .env.local
 */

import { ghatelineProducts, GhatelineApiError } from '../src/lib/ghateline';

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function printSep(label: string): void {
  const line = '─'.repeat(50);
  console.log(`\n${line}`);
  console.log(` ${label}`);
  console.log(line);
}

function printProductSummary(p: {
  uuid: string;
  title: string;
  status: string;
  created_at?: string;
}): void {
  console.log(`  uuid    : ${p.uuid}`);
  console.log(`  title   : ${p.title}`);
  console.log(`  status  : ${p.status}`);
  if (p.created_at) console.log(`  created : ${p.created_at}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// actions
// ─────────────────────────────────────────────────────────────────────────────

async function runList(): Promise<void> {
  printSep('GET /api/v1/products — لیست محصولات (صفحه اول)');

  const result = await ghatelineProducts.list({ page: 1, per_page: 5 });

  console.log(`\ntotal     : ${result.pagination.total}`);
  console.log(`totalPages: ${result.pagination.totalPages}`);
  console.log(`page      : ${result.pagination.page} / ${result.pagination.totalPages}`);
  console.log(`\nمحصولات این صفحه (${result.data.length} مورد):\n`);

  result.data.forEach((product, i) => {
    console.log(`[${i + 1}]`);
    printProductSummary(product);
    console.log();
  });
}

async function runGet(uuid: string): Promise<void> {
  printSep(`GET /api/v1/products/${uuid}`);

  const product = await ghatelineProducts.get(uuid);

  console.log('\nجزئیات محصول:\n');
  console.log(JSON.stringify(product, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'list';
  const arg = process.argv[3];

  const apiKey = process.env.GHATELINE_API_KEY;
  const baseUrl = process.env.GHATELINE_API_BASE_URL ?? 'https://ghateline.com';

  if (!apiKey) {
    console.error('خطا: GHATELINE_API_KEY تنظیم نشده است.');
    console.error('در .env.local تنظیم کنید و دوباره اجرا کنید.');
    process.exit(1);
  }

  console.log(`\n[Ghateline Test] base: ${baseUrl}`);
  console.log(`[Ghateline Test] key : ${apiKey.slice(0, 6)}...`);

  try {
    switch (command) {
      case 'list':
        await runList();
        break;

      case 'get':
        if (!arg) {
          console.error('خطا: UUID محصول را وارد کنید.');
          console.error('مثال: npx tsx scripts/test-ghateline-products.ts get <uuid>');
          process.exit(1);
        }
        await runGet(arg);
        break;

      default:
        console.error(`خطا: دستور ناشناخته: ${command}`);
        console.error('دستورات مجاز: list, get <uuid>');
        process.exit(1);
    }

    console.log('\n✓ تست موفق\n');
  } catch (err) {
    if (err instanceof GhatelineApiError) {
      console.error(`\n✗ GhatelineApiError [${err.status}]: ${err.message}`);
      if (err.data !== undefined) {
        console.error('  data:', JSON.stringify(err.data, null, 2));
      }
    } else if (err instanceof Error) {
      console.error(`\n✗ ${err.name}: ${err.message}`);
    } else {
      console.error('\n✗ خطای ناشناخته:', err);
    }
    process.exit(1);
  }
}

void main();
