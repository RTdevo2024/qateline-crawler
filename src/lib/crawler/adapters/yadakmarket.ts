import * as cheerio from 'cheerio';
import type { CrawledProductData } from '@/types/crawler';
import { BaseAdapter } from '../core/base-adapter';

// نگاشت ارقام فارسی/عربی به ASCII
const PERSIAN_DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/**
 * parsePersianPrice — رشته قیمت فارسی را به عدد صحیح تبدیل می‌کند.
 * مثال: "۸۵۰,۰۰۰ تومان" → 850000
 */
export function parsePersianPrice(text: string): number {
  const normalized = text.replace(/[۰-۹٠-٩]/g, (d) => PERSIAN_DIGIT_MAP[d] ?? d);
  const digitsOnly = normalized.replace(/[^\d]/g, '');
  const num = parseInt(digitsOnly, 10);
  return isNaN(num) ? 0 : num;
}

export class YadakMarketAdapter extends BaseAdapter {
  readonly name = 'YadakMarket';
  readonly baseUrl = 'https://www.yadakmarket.com';
  // بخاطر bot detection نیاز به browser داریم
  readonly requiresBrowser = true;

  canHandle(url: string): boolean {
    try {
      return new URL(url).hostname.includes('yadakmarket.com');
    } catch {
      return false;
    }
  }

  async extract(html: string, url: string): Promise<CrawledProductData> {
    const $ = cheerio.load(html);

    // ─── عنوان ────────────────────────────────────────────────────────────────
    const title =
      $('h1.product_title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      '';

    // ─── تصاویر ───────────────────────────────────────────────────────────────
    // WooCommerce: data-large_image یا href لینک حاوی تصویر اصلی است، نه thumbnail
    const images: string[] = [];
    $('.woocommerce-product-gallery__image').each((_, el) => {
      const largeImg =
        $(el).attr('data-large_image') ??
        $(el).find('a').attr('href') ??
        $(el).find('img').attr('data-large_image') ??
        $(el).find('img').attr('data-src') ??
        $(el).find('img').attr('src');
      if (largeImg != null && largeImg.startsWith('http')) {
        images.push(largeImg);
      }
    });

    // ─── قیمت ────────────────────────────────────────────────────────────────
    let price = 0;
    let originalPrice: number | undefined;
    const $price = $('.price').first();

    // WooCommerce: ins = قیمت حراج، del = قیمت اصلی
    const saleText =
      $price.find('ins .woocommerce-Price-amount').text().trim() ||
      $price.find('ins').text().trim();
    const origText =
      $price.find('del .woocommerce-Price-amount').text().trim() ||
      $price.find('del').text().trim();
    const regularText =
      $price.find('.woocommerce-Price-amount').last().text().trim() ||
      $price.text().trim();

    if (saleText) {
      price = parsePersianPrice(saleText);
      const origNum = parsePersianPrice(origText);
      if (origNum > 0) originalPrice = origNum;
    } else {
      price = parsePersianPrice(regularText);
    }

    // ─── توضیحات ──────────────────────────────────────────────────────────────
    const descHtml =
      $('#tab-description').html()?.trim() ||
      $('.woocommerce-product-details__short-description').html()?.trim();
    const description = descHtml != null && descHtml.length > 0 ? descHtml : undefined;

    // ─── مشخصات فنی ──────────────────────────────────────────────────────────
    const attributes: Record<string, string> = {};
    $('.shop_attributes tr').each((_, row) => {
      const key = $(row).find('th').text().trim();
      const value = $(row).find('td').text().trim().replace(/\s+/g, ' ');
      if (key && value) {
        attributes[key] = value;
      }
    });

    // ─── دسته‌بندی از breadcrumb ──────────────────────────────────────────────
    const breadcrumbs: string[] = [];
    $('.woocommerce-breadcrumb a, .breadcrumb a, nav[aria-label="breadcrumb"] a').each(
      (_, el) => {
        const text = $(el).text().trim();
        if (text && text !== 'خانه' && text !== 'Home') {
          breadcrumbs.push(text);
        }
      },
    );
    const category = breadcrumbs.length > 0 ? breadcrumbs.join(' › ') : undefined;

    // ─── برند ─────────────────────────────────────────────────────────────────
    const brand =
      attributes['برند'] ??
      attributes['سازنده'] ??
      attributes['مارک'] ??
      attributes['Brand'] ??
      undefined;

    // ─── موجودی ──────────────────────────────────────────────────────────────
    const stockEl = $('.stock').first();
    const stockText = stockEl.text().trim();
    const inStock =
      stockEl.hasClass('in-stock') ||
      stockText.includes('موجود') ||
      html.includes('موجود در انبار') ||
      // اگر المنت stock وجود ندارد اما قیمت داریم، موجود فرض می‌کنیم
      (!stockEl.length && price > 0);

    if (!title) {
      throw new Error('عنوان محصول در صفحه یافت نشد');
    }

    return {
      source: {
        siteSlug: 'yadak-market',
        url,
        crawledAt: new Date().toISOString(),
      },
      product: {
        title,
        description,
        images,
        attributes,
        category,
        brand,
      },
      inventory: {
        price,
        originalPrice,
        inStock,
      },
    };
  }
}
