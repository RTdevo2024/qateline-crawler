import axios from 'axios';
import type { Fetcher, FetchOptions, FetchResult } from './types';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DEFAULT_TIMEOUT = 30_000;

export class HttpFetcher implements Fetcher {
  async fetch(url: string, options?: FetchOptions): Promise<FetchResult> {
    const response = await axios.get<string>(url, {
      timeout: options?.timeout ?? DEFAULT_TIMEOUT,
      responseType: 'text',
      maxRedirects: 10,
      validateStatus: () => true, // هر status code را برمی‌گردانیم، خطا نمی‌دهیم
      headers: {
        'User-Agent': options?.userAgent ?? DEFAULT_USER_AGENT,
        ...(options?.headers ?? {}),
      },
    });

    // axios در Node.js، URL نهایی بعد از redirect را در request.res.responseUrl نگه می‌دارد
    const req = response.request as unknown as {
      res?: { responseUrl?: string };
    };
    const finalUrl = req.res?.responseUrl ?? url;

    const headers: Record<string, string> = {};
    const rawHeaders = response.headers as Record<string, unknown>;
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = (value as string[]).join(', ');
      } else if (value != null) {
        headers[key] = String(value);
      }
    }

    return {
      html: response.data,
      finalUrl,
      statusCode: response.status,
      headers,
    };
  }
}
