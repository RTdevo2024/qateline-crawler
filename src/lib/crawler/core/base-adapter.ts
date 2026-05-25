/**
 * base-adapter.ts — کلاس پایه برای همه کرالر adapters
 *
 * جریان crawl():
 *   fetch(url) →
 *     OK:                extract(html) → CrawledProductData
 *     PartialFetchError: extract(partialHtml) → CrawledProductData  ← اگر موفق
 *                        re-throw PartialFetchError                 ← اگر extraction هم شکست
 *     FetchError:        re-throw
 *   extract() throws ParseError → re-throw
 *   extract() throws other   → wrap in ParseError
 */

import type { CrawledProductData } from '@/types/crawler';
import { HttpFetcher } from '../fetchers/http-fetcher';
import { BrowserFetcher } from '../fetchers/browser-fetcher';
import { FetchError, ParseError, PartialFetchError } from './errors';

const httpFetcher = new HttpFetcher();
const browserFetcher = new BrowserFetcher();

export abstract class BaseAdapter {
  abstract readonly name: string;
  abstract readonly baseUrl: string;
  abstract readonly requiresBrowser: boolean;

  abstract canHandle(url: string): boolean;
  abstract extract(html: string, url: string): Promise<CrawledProductData>;

  async crawl(url: string): Promise<CrawledProductData> {
    const fetcher = this.requiresBrowser ? browserFetcher : httpFetcher;

    // ─── Fetch ──────────────────────────────────────────────────────────────
    let html: string;
    let finalUrl: string;
    let statusCode: number;

    try {
      const result = await fetcher.fetch(url);
      html = result.html;
      finalUrl = result.finalUrl;
      statusCode = result.statusCode;
    } catch (error) {
      // PartialFetchError: صفحه کاملاً لود نشد ولی HTML جزئی داریم
      if (error instanceof PartialFetchError) {
        return this.crawlFromPartialHtml(error, url);
      }

      // سایر خطاها (FetchError، شبکه، ...)
      throw new FetchError(
        `Failed to fetch "${url}": ${error instanceof Error ? error.message : String(error)}`,
        { url, adapter: this.name },
      );
    }

    // ─── Extract ────────────────────────────────────────────────────────────
    try {
      return await this.extract(html, finalUrl);
    } catch (error) {
      if (error instanceof ParseError) throw error;
      throw new ParseError(
        `Failed to parse "${url}": ${error instanceof Error ? error.message : String(error)}`,
        { url, adapter: this.name, statusCode },
      );
    }
  }

  /**
   * crawlFromPartialHtml — تلاش برای extract از HTML جزئی.
   *
   * اگر موفق: CrawledProductData برمی‌گرداند (crawl-worker → RAW)
   * اگر شکست: PartialFetchError را re-throw می‌کند (crawl-worker → PARTIAL)
   */
  private async crawlFromPartialHtml(
    error: PartialFetchError,
    originalUrl: string,
  ): Promise<CrawledProductData> {
    const chars = error.partialHtml.length;
    console.log(
      `[${this.name}] ⚡ partial fetch (${chars} chars) — تلاش برای extraction`,
    );

    try {
      const result = await this.extract(error.partialHtml, originalUrl);
      console.log(
        `[${this.name}] ✓ extraction از partial HTML موفق بود — داده کامل دریافت شد`,
      );
      return result;
    } catch (extractErr) {
      const extractMsg =
        extractErr instanceof Error ? extractErr.message : String(extractErr);
      console.warn(
        `[${this.name}] ✗ extraction از partial HTML ناموفق (${extractMsg}) — re-throw PartialFetchError`,
      );
      // PartialFetchError را re-throw می‌کنیم تا crawl-worker بتواند PARTIAL status ست کند
      throw error;
    }
  }
}
