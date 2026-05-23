#!/usr/bin/env tsx
/**
 * test-ai.ts — CLI برای تست دستی پردازش AI
 *
 * استفاده:
 *   npx tsx scripts/test-ai.ts ./sample-product.json
 *   npx tsx scripts/test-ai.ts ./sample-product.json "لوازم جانبی خودرو,ابزار,قطعات موتور"
 *
 * فرمت فایل JSON ورودی: CrawledProductData (خروجی کرالر)
 */

import * as fs from "fs";
import * as path from "path";
import { AIProcessor } from "../src/lib/ai/processor";
import { validateCrawledData } from "../src/lib/crawler/schema";

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("خطا: مسیر فایل JSON ارائه نشده است.");
    console.error(
      "استفاده: npx tsx scripts/test-ai.ts ./sample-product.json"
    );
    process.exit(1);
  }

  const categoriesArg = process.argv[3];
  const categoriesList = categoriesArg
    ? categoriesArg.split(",").map((c) => c.trim())
    : [
        "لوازم جانبی خودرو",
        "قطعات موتور",
        "ابزار و تجهیزات",
        "روغن و مایعات",
        "فیلتر و سیستم تهویه",
        "سیستم برق خودرو",
        "سیستم ترمز",
        "سیستم تعلیق و فرمان",
        "لاستیک و رینگ",
        "لوازم داخل خودرو",
      ];

  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`خطا: فایل یافت نشد: ${absolutePath}`);
    process.exit(1);
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(fs.readFileSync(absolutePath, "utf-8"));
  } catch {
    console.error("خطا: فایل JSON معتبر نیست.");
    process.exit(1);
  }

  const validation = validateCrawledData(rawJson);
  if (!validation.success) {
    console.error("خطا: ساختار CrawledProductData نامعتبر است:");
    console.error(validation.error.message);
    process.exit(1);
  }

  const product = validation.data;

  console.log("\n─── محصول ورودی ────────────────────────────────");
  console.log(`عنوان:  ${product.product.title}`);
  console.log(`قیمت:   ${product.inventory.price.toLocaleString()} ریال`);
  console.log(`سایت:   ${product.source.siteSlug}`);
  console.log(`دسته:   ${product.product.category ?? "(نامشخص)"}`);
  console.log("────────────────────────────────────────────────\n");

  console.log(`مدل: ${process.env.OPENAI_MODEL ?? "gpt-4o"}`);
  console.log("در حال پردازش...\n");

  const processor = new AIProcessor();

  try {
    const result = await processor.processProduct(product, categoriesList);

    console.log("✓ پردازش موفق:\n");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n─── خلاصه ──────────────────────────────────────");
    console.log(`عنوان فارسی:  ${result.output.title}`);
    console.log(`عنوان انگلیسی: ${result.output.title_en ?? "(ندارد)"}`);
    console.log(`دسته پیشنهادی: ${result.output.category ?? "(ندارد)"}`);
    console.log(`slug:         ${result.output.slug ?? "(ندارد)"}`);
    console.log(`تعداد attrs:  ${result.output.attrs.length}`);
    console.log(`مدل:          ${result.meta.model}`);
    console.log(`توکن ورودی:   ${result.meta.inputTokens}`);
    console.log(`توکن خروجی:   ${result.meta.outputTokens}`);
    console.log(`زمان پردازش:  ${result.meta.durationMs}ms`);
    console.log("────────────────────────────────────────────────\n");
  } catch (error) {
    console.error("✗ پردازش ناموفق:");
    if (error instanceof Error) {
      console.error(`  ${error.name}: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

void main();
