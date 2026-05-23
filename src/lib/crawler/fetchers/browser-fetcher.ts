import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import type { Fetcher, FetchOptions, FetchResult } from './types';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const DEFAULT_TIMEOUT = 30_000;

export class BrowserFetcher implements Fetcher {
  private static browser: Browser | null = null;
  private static launchingPromise: Promise<Browser> | null = null;

  private static async launchBrowser(): Promise<Browser> {
    return chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }

  private static async ensureBrowser(): Promise<Browser> {
    if (BrowserFetcher.browser?.isConnected()) {
      return BrowserFetcher.browser;
    }
    if (!BrowserFetcher.launchingPromise) {
      BrowserFetcher.launchingPromise = BrowserFetcher.launchBrowser().then((b) => {
        BrowserFetcher.browser = b;
        BrowserFetcher.launchingPromise = null;
        return b;
      });
    }
    return BrowserFetcher.launchingPromise;
  }

  async fetch(url: string, options?: FetchOptions): Promise<FetchResult> {
    const browser = await BrowserFetcher.ensureBrowser();

    const context = await browser.newContext({
      userAgent: options?.userAgent ?? DEFAULT_USER_AGENT,
      viewport: { width: 1366, height: 768 },
    });

    // غیرفعال کردن webdriver flag برای anti-detection
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const page = await context.newPage();

    try {
      const waitUntil = options?.waitUntil === 'networkidle' ? 'networkidle' : 'domcontentloaded';

      const response = await page.goto(url, {
        timeout: options?.timeout ?? DEFAULT_TIMEOUT,
        waitUntil,
      });

      const html = await page.content();
      const finalUrl = page.url();
      const statusCode = response?.status() ?? 200;
      const headers: Record<string, string> = response?.headers() ?? {};

      return { html, finalUrl, statusCode, headers };
    } finally {
      await context.close();
    }
  }

  async close(): Promise<void> {
    if (BrowserFetcher.browser) {
      await BrowserFetcher.browser.close();
      BrowserFetcher.browser = null;
    }
  }
}
