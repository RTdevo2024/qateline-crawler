import axios, { AxiosError, AxiosInstance } from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Error Class
// ─────────────────────────────────────────────────────────────────────────────

export class GhatelineApiError extends Error {
  constructor(
    message: string,
    /** HTTP status code — 0 اگر درخواست اصلاً ارسال نشد */
    public readonly status: number,
    /** raw response body */
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'GhatelineApiError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

export class GhatelineClient {
  private readonly http: AxiosInstance;
  private readonly isDev: boolean;

  constructor(apiKey: string, baseUrl: string) {
    this.isDev = process.env.NODE_ENV !== 'production';
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
    });
  }

  /**
   * request<T> — متد مرکزی ارسال درخواست به API قطعه‌لاین.
   *
   * - header X-API-KEY را خودکار اضافه می‌کند
   * - اگر response.success === false بود، GhatelineApiError پرتاب می‌کند
   * - در dev mode درخواست و پاسخ را log می‌کند
   * - T باید شکل کامل response body را represent کند
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    options?: {
      params?: Record<string, unknown>;
      data?: unknown;
    },
  ): Promise<T> {
    if (this.isDev) {
      const ctx = options?.data ?? options?.params;
      console.log(
        `[Ghateline] → ${method} ${endpoint}`,
        ctx !== undefined ? ctx : '',
      );
    }

    try {
      const response = await this.http.request<unknown>({
        method,
        url: endpoint,
        params: options?.params,
        data: options?.data,
      });

      const raw = response.data;

      if (this.isDev) {
        console.log(`[Ghateline] ← ${response.status}`, raw);
      }

      // بررسی خطای API-level: success: false
      if (
        raw !== null &&
        typeof raw === 'object' &&
        'success' in raw &&
        (raw as { success: unknown }).success === false
      ) {
        const errBody = raw as { success: false; message?: string };
        throw new GhatelineApiError(
          errBody.message ?? 'API returned success: false',
          response.status,
          raw,
        );
      }

      return raw as T;
    } catch (err) {
      if (err instanceof GhatelineApiError) throw err;

      if (axios.isAxiosError(err)) {
        const axErr = err as AxiosError<{ message?: string; success?: boolean }>;
        const message =
          axErr.response?.data?.message ?? axErr.message;
        throw new GhatelineApiError(
          message,
          axErr.response?.status ?? 0,
          axErr.response?.data,
        );
      }

      throw err;
    }
  }
}
