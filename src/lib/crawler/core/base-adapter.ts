import type { CrawledProductData } from '@/types/crawler';
import { HttpFetcher } from '../fetchers/http-fetcher';
import { BrowserFetcher } from '../fetchers/browser-fetcher';
import { FetchError, ParseError } from './errors';

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

    const fetchResult = await fetcher.fetch(url).catch((error: unknown) => {
      throw new FetchError(
        `Failed to fetch "${url}": ${error instanceof Error ? error.message : String(error)}`,
        { url, adapter: this.name },
      );
    });

    try {
      return await this.extract(fetchResult.html, fetchResult.finalUrl);
    } catch (error) {
      if (error instanceof ParseError) throw error;
      throw new ParseError(
        `Failed to parse "${url}": ${error instanceof Error ? error.message : String(error)}`,
        { url, adapter: this.name, statusCode: fetchResult.statusCode },
      );
    }
  }
}
