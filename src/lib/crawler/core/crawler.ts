import type { CrawledProductData } from '@/types/crawler';
import { adapterRegistry } from './adapter-registry';
import { AdapterNotFoundError } from './errors';

export class Crawler {
  async crawl(url: string): Promise<CrawledProductData> {
    const adapter = adapterRegistry.findByUrl(url);
    if (!adapter) {
      throw new AdapterNotFoundError(`No adapter registered for URL: ${url}`, { url });
    }
    return adapter.crawl(url);
  }
}
