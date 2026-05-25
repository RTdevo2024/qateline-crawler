export interface FetchResult {
  html: string;
  finalUrl: string;
  statusCode: number;
  headers: Record<string, string>;
}

export interface FetchOptions {
  timeout?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  /** فقط BrowserFetcher از این استفاده می‌کند — اولین attempt */
  waitUntil?: 'domcontentloaded' | 'networkidle' | 'load';
  /** حداکثر retry ها برای BrowserFetcher — پیش‌فرض: 2 */
  maxRetries?: number;
}

export interface Fetcher {
  fetch(url: string, options?: FetchOptions): Promise<FetchResult>;
}
