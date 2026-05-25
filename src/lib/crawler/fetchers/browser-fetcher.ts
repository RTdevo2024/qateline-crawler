/**
 * browser-fetcher.ts — کرال با Playwright، production-grade anti-detection
 *
 * ─── استراتژی retry ──────────────────────────────────────────────────────────
 *
 *   Attempt 1  waitUntil: 'load', timeout: 60s
 *     ✓ موفق         → FetchResult برمی‌گردد
 *     ⏱ retryable    → partial HTML ذخیره، رفتن به attempt 2
 *     ✗ non-retryable → فوری throw (bad URL, DNS permanent fail, ...)
 *
 *   Attempt 2  waitUntil: 'domcontentloaded', timeout: 90s
 *     ✓ موفق         → FetchResult برمی‌گردد
 *     ⏱ retryable + HTML کافی  → PartialFetchError(bestHtml)
 *     ⏱ retryable + HTML ناکافی → FetchError
 *
 * ─── خطاهای retryable ────────────────────────────────────────────────────────
 *
 *   playwright TimeoutError           — صفحه در زمان مقرر لود نشد
 *   net::ERR_CONNECTION_TIMED_OUT     — سرور پاسخ نداد (مهم‌ترین case ایرانی)
 *   net::ERR_CONNECTION_RESET         — اتصال قطع شد
 *   net::ERR_CONNECTION_REFUSED       — سرور reject کرد
 *   net::ERR_FAILED                   — خطای شبکه عمومی
 *   net::ERR_ADDRESS_UNREACHABLE      — مسیر دسترسی ندارد
 *   net::ERR_NETWORK_CHANGED          — شبکه تغییر کرد
 *   net::ERR_SOCKET_NOT_CONNECTED     — socket بسته است
 *   net::ERR_INTERNET_DISCONNECTED    — اینترنت قطع است
 *
 * ─── جریان anti-detection ────────────────────────────────────────────────────
 *
 *   launch args: AutomationControlled disabled, sandbox disabled
 *   context:     userAgent + viewport + locale + Accept-Language header
 *   initScript:  webdriver=false, plugins mock, chrome obj, permissions mock
 *   page:        setExtraHTTPHeaders (User-Agent + پیام‌های browser واقعی)
 */

import { chromium } from 'playwright';
import type { Browser, Page, BrowserContext } from 'playwright';
import type { Fetcher, FetchOptions, FetchResult } from './types';
import { FetchError, PartialFetchError } from '../core/errors';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User-Agent یک مرورگر Chrome واقعی بر Windows.
 * عدد نسخه باید نزدیک به آخرین نسخه Chrome باشد تا bot-detector ها رد نکنند.
 */
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const PRIMARY_TIMEOUT_MS = 60_000;   // attempt 1
const FALLBACK_TIMEOUT_MS = 90_000;  // attempt 2
const PARTIAL_CONTENT_MIN_CHARS = 3_000; // HTML کمتر از این → بی‌فایده است
const RETRY_BASE_DELAY_MS = 2_000;       // تأخیر اولیه بین retry ها

// ─────────────────────────────────────────────────────────────────────────────
// Chrome network error codes — خطاهایی که retry می‌کنیم
//
// این خطاها معمولاً موقتی هستند (سرور کند، شبکه ناپایدار، ...).
// ─────────────────────────────────────────────────────────────────────────────

const RETRYABLE_NETWORK_ERRORS: readonly string[] = [
  'ERR_CONNECTION_TIMED_OUT',   // ←←← مهم‌ترین case سایت‌های ایرانی
  'ERR_CONNECTION_RESET',
  'ERR_CONNECTION_REFUSED',
  'ERR_FAILED',
  'ERR_ADDRESS_UNREACHABLE',
  'ERR_NETWORK_CHANGED',
  'ERR_SOCKET_NOT_CONNECTED',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_EMPTY_RESPONSE',         // سرور بدون محتوا قطع کرد
  'ERR_TUNNEL_CONNECTION_FAILED',
  'ERR_PROXY_CONNECTION_FAILED',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Retry Strategies
// ─────────────────────────────────────────────────────────────────────────────

interface FetchStrategy {
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle';
  timeoutMs: number;
  label: string;
}

function buildStrategies(options?: FetchOptions): [FetchStrategy, FetchStrategy] {
  return [
    {
      waitUntil: options?.waitUntil ?? 'load',
      timeoutMs: options?.timeout ?? PRIMARY_TIMEOUT_MS,
      label: `load/${(options?.timeout ?? PRIMARY_TIMEOUT_MS) / 1_000}s`,
    },
    {
      waitUntil: 'domcontentloaded',
      timeoutMs: FALLBACK_TIMEOUT_MS,
      label: `domcontentloaded/${FALLBACK_TIMEOUT_MS / 1_000}s`,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function log(msg: string): void {
  const ts = new Date().toISOString().substring(11, 19); // HH:MM:SS
  console.log(`[BrowserFetcher ${ts}] ${msg}`);
}

/**
 * isRetryableError — آیا این خطا قابل retry است؟
 *
 * ✅ retryable: timeout های Playwright، خطاهای شبکه موقتی
 * ❌ non-retryable: URL نامعتبر، DNS دائمی، ERR_ABORTED
 */
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const msg = err.message;

  // ۱. Playwright TimeoutError
  if (
    msg.includes('Timeout') ||
    msg.includes('timeout') ||
    err.constructor.name === 'TimeoutError'
  ) {
    return true;
  }

  // ۲. خطاهای شبکه Chrome که retry ارزش دارند
  if (RETRYABLE_NETWORK_ERRORS.some((code) => msg.includes(code))) {
    return true;
  }

  return false;
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message.split('\n')[0] ?? err.message : String(err);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Anti-Detection Init Script
//
// این script قبل از هر navigation در صفحه اجرا می‌شود.
// هدف: پنهان کردن نشانه‌های automation از سایت‌ها.
// ─────────────────────────────────────────────────────────────────────────────

function buildInitScript(userAgent: string): string {
  // نکته: این string به صورت JS در مرورگر اجرا می‌شود — TypeScript نیست!
  return `
    (() => {
      // ۱. webdriver flag را پنهان کن
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true,
      });

      // ۲. User-Agent را با مقدار واقعی override کن
      Object.defineProperty(navigator, 'userAgent', {
        get: () => '${userAgent.replace(/'/g, "\\'")}',
        configurable: true,
      });

      // ۳. chrome object — بدون این، بعضی fingerprinting‌ها bot رو شناسایی می‌کنند
      window.chrome = {
        app: {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        },
        csi:        function() { return { startE: Date.now(), onloadT: Date.now(), pageT: 1.0, tran: 15 }; },
        loadTimes:  function() { return { commitLoadTime: Date.now() / 1000, connectionInfo: 'h2', finishDocumentLoadTime: 0, finishLoadTime: 0, firstPaintAfterLoadTime: 0, firstPaintTime: 0, navigationType: 'Other', npnNegotiatedProtocol: 'h2', requestTime: Date.now() / 1000, startLoadTime: Date.now() / 1000, wasAlternateProtocolAvailable: false, wasFetchedViaSpdy: true, wasNpnNegotiated: true }; },
        runtime: {},
      };

      // ۴. Plugins — مرورگر واقعی plugins دارد
      const PLUGINS = [
        { name: 'Chrome PDF Plugin',  filename: 'internal-pdf-viewer', description: 'Portable Document Format', suffixes: 'pdf' },
        { name: 'Chrome PDF Viewer',  filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '', suffixes: 'pdf' },
        { name: 'Native Client',      filename: 'internal-nacl-plugin', description: '', suffixes: '' },
      ];
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const arr = PLUGINS.map(p => Object.assign(Object.create(Plugin.prototype), p));
          Object.defineProperty(arr, 'item', { value: (i) => arr[i] });
          Object.defineProperty(arr, 'namedItem', { value: (n) => arr.find(p => p.name === n) ?? null });
          Object.defineProperty(arr, 'refresh', { value: () => {} });
          return arr;
        },
        configurable: true,
      });

      // ۵. Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en', 'fa'],
        configurable: true,
      });

      // ۶. permissions — برای ممانعت از تشخیص headless
      try {
        const origQuery = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (params) => {
          if (params && params.name === 'notifications') {
            return Promise.resolve(Object.assign(Object.create(PermissionStatus.prototype), {
              state: 'default', name: 'notifications',
            }));
          }
          return origQuery(params);
        };
      } catch {}

      // ۷. مخفی کردن Playwright automation signals در document
      Object.defineProperty(document, 'hidden', { get: () => false });
      Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
    })();
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// BrowserFetcher
// ─────────────────────────────────────────────────────────────────────────────

export class BrowserFetcher implements Fetcher {
  private static browser: Browser | null = null;
  private static launchingPromise: Promise<Browser> | null = null;

  // ─── Browser Launch ────────────────────────────────────────────────────────

  private static async launchBrowser(): Promise<Browser> {
    log('launching Chromium...');
    return chromium.launch({
      headless: true,
      args: [
        // ── Anti-detection (CRITICAL) ──────────────────────────────────────
        '--disable-blink-features=AutomationControlled',

        // ── Sandbox / Container compatibility ─────────────────────────────
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',

        // ── Performance & Stability ───────────────────────────────────────
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--no-first-run',
        '--no-default-browser-check',
        '--password-store=basic',
        '--safebrowsing-disable-auto-update',
        '--use-mock-keychain',

        // ── Viewport & Language ───────────────────────────────────────────
        '--window-size=1366,768',
        '--lang=en-US',

        // ── SSL / Certificate ─────────────────────────────────────────────
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
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
        log('✓ Chromium ready');
        return b;
      });
    }
    return BrowserFetcher.launchingPromise;
  }

  // ─── Context Builder ───────────────────────────────────────────────────────

  private async buildContext(
    browser: Browser,
    userAgent: string,
    options?: FetchOptions,
  ): Promise<BrowserContext> {
    const context = await browser.newContext({
      userAgent,
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'Asia/Tehran',
      // Context-level headers: ارسال می‌شوند برای هر request
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        ...(options?.headers ?? {}),
      },
    });

    // Init script قبل از هر navigation اجرا می‌شود
    await context.addInitScript(buildInitScript(userAgent));

    return context;
  }

  // ─── Page Setup ───────────────────────────────────────────────────────────

  private async setupPage(context: BrowserContext, userAgent: string): Promise<Page> {
    const page = await context.newPage();

    // Page-level headers — مهم برای fingerprinting
    // این headers با context-level headers ادغام می‌شوند
    await page.setExtraHTTPHeaders({
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    });

    return page;
  }

  // ─── Public fetch ──────────────────────────────────────────────────────────

  async fetch(url: string, options?: FetchOptions): Promise<FetchResult> {
    const browser = await BrowserFetcher.ensureBrowser();
    const strategies = buildStrategies(options);
    const userAgent = options?.userAgent ?? DEFAULT_USER_AGENT;

    log(`→ fetch: ${url}`);

    let bestPartialHtml: string | undefined;
    let attemptNum = 0;

    for (const strategy of strategies) {
      attemptNum++;
      const isLastAttempt = attemptNum === strategies.length;

      // هر attempt context جدید — fresh state، بدون cookie از attempt قبل
      const context = await this.buildContext(browser, userAgent, options);
      const page = await this.setupPage(context, userAgent);

      log(`attempt ${attemptNum}/${strategies.length} [${strategy.label}] → ${url}`);

      try {
        const response = await page.goto(url, {
          waitUntil: strategy.waitUntil,
          timeout: strategy.timeoutMs,
        });

        const html = await page.content();
        const finalUrl = page.url();
        const statusCode = response?.status() ?? 200;
        const headers: Record<string, string> = response?.headers() ?? {};

        await context.close();

        log(`✓ attempt ${attemptNum}: HTTP ${statusCode}, ${html.length.toLocaleString()} chars, url=${finalUrl}`);
        return { html, finalUrl, statusCode, headers };

      } catch (err) {
        const errMsg = toErrorMessage(err);

        // ─── تشخیص نوع خطا ────────────────────────────────────────────────

        if (!isRetryableError(err)) {
          // خطای دائمی: بلافاصله fail می‌کنیم (no retry)
          await context.close().catch(() => undefined);
          log(`✗ attempt ${attemptNum}: non-retryable — ${errMsg}`);
          throw new FetchError(
            `[attempt ${attemptNum}] خطای غیرقابل retry: ${errMsg}`,
            { url },
          );
        }

        // ─── خطای retryable (timeout / connection) ────────────────────────

        const isTimeout = errMsg.includes('Timeout') || errMsg.includes('timeout');
        const isConnErr = RETRYABLE_NETWORK_ERRORS.some((c) => errMsg.includes(c));
        const errKind = isTimeout ? '⏱ timeout' : isConnErr ? '🔌 connection error' : '⚠ network error';
        log(`${errKind} attempt ${attemptNum}: ${errMsg.substring(0, 120)}`);

        // بررسی partial content (فقط برای timeout — connection error ها معمولاً HTML ندارند)
        if (isTimeout) {
          const partialHtml = await this.tryGetPartialContent(page, attemptNum);
          if (
            partialHtml !== undefined &&
            (bestPartialHtml === undefined || partialHtml.length > bestPartialHtml.length)
          ) {
            bestPartialHtml = partialHtml;
            log(`📄 partial HTML ذخیره شد: ${partialHtml.length.toLocaleString()} chars`);
          }
        }

        await context.close().catch(() => undefined);

        // ─── آخرین attempt: تصمیم نهایی ──────────────────────────────────
        if (isLastAttempt) {
          if (bestPartialHtml !== undefined) {
            log(`⚠ همه attempts شکست — PartialFetchError (${bestPartialHtml.length.toLocaleString()} chars)`);
            throw new PartialFetchError(
              `همه ${strategies.length} attempt ها شکست خوردند — partial HTML موجود است`,
              bestPartialHtml,
              { url },
            );
          }
          log(`✗ همه attempts شکست — هیچ partial HTML مفیدی نیست`);
          throw new FetchError(
            `همه ${strategies.length} attempt ها شکست خوردند: ${errMsg}`,
            { url },
          );
        }

        // ─── retry با تأخیر exponential ───────────────────────────────────
        const delay = RETRY_BASE_DELAY_MS * attemptNum;
        log(`⏳ retry در ${delay / 1_000}s...`);
        await sleep(delay);
      }
    }

    // unreachable — TypeScript را راضی می‌کند
    throw new FetchError('fetch ناموفق (unreachable)', { url });
  }

  // ─── tryGetPartialContent ─────────────────────────────────────────────────

  private async tryGetPartialContent(
    page: Page,
    attemptNum: number,
  ): Promise<string | undefined> {
    try {
      const html = await page.content();
      if (html.length >= PARTIAL_CONTENT_MIN_CHARS) {
        log(`[partial] attempt ${attemptNum}: ${html.length.toLocaleString()} chars — کافی`);
        return html;
      }
      log(`[partial] attempt ${attemptNum}: ${html.length} chars — خیلی کم (min: ${PARTIAL_CONTENT_MIN_CHARS})`);
      return undefined;
    } catch (err) {
      log(`[partial] attempt ${attemptNum}: page.content() شکست — ${toErrorMessage(err)}`);
      return undefined;
    }
  }

  // ─── close ────────────────────────────────────────────────────────────────

  async close(): Promise<void> {
    if (BrowserFetcher.browser) {
      await BrowserFetcher.browser.close();
      BrowserFetcher.browser = null;
      log('Chromium closed');
    }
  }
}
