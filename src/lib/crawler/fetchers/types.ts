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
  /** فقط BrowserFetcher از این استفاده می‌کند */
  waitUntil?: 'domcontentloaded' | 'networkidle' | 'load';
}

export interface Fetcher {
  fetch(url: string, options?: FetchOptions): Promise<FetchResult>;
}
