export interface CrawlerErrorMetadata {
  url?: string;
  adapter?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export class CrawlerError extends Error {
  readonly code: string;
  readonly metadata: CrawlerErrorMetadata;

  constructor(message: string, code: string, metadata: CrawlerErrorMetadata = {}) {
    super(message);
    this.name = 'CrawlerError';
    this.code = code;
    this.metadata = metadata;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AdapterNotFoundError extends CrawlerError {
  constructor(message: string, metadata: CrawlerErrorMetadata = {}) {
    super(message, 'ADAPTER_NOT_FOUND', metadata);
    this.name = 'AdapterNotFoundError';
  }
}

export class FetchError extends CrawlerError {
  constructor(message: string, metadata: CrawlerErrorMetadata = {}) {
    super(message, 'FETCH_ERROR', metadata);
    this.name = 'FetchError';
  }
}

export class ParseError extends CrawlerError {
  constructor(message: string, metadata: CrawlerErrorMetadata = {}) {
    super(message, 'PARSE_ERROR', metadata);
    this.name = 'ParseError';
  }
}

/**
 * PartialFetchError — صفحه پس از همه retry ها timeout خورد، اما HTML جزئی دریافت شد.
 *
 * با FetchError فرق دارد: اینجا حداقل بخشی از صفحه لود شده.
 * BaseAdapter.crawl() این خطا را catch می‌کند و تلاش می‌کند از HTML جزئی extract کند.
 * اگر extraction موفق شد → CrawledProductData برمی‌گرداند (RAW status).
 * اگر extraction هم شکست خورد → error را re-throw می‌کند → crawl-worker به status=PARTIAL ست می‌کند.
 */
export class PartialFetchError extends CrawlerError {
  constructor(
    message: string,
    /** HTML جزئی که قبل از timeout آخر دریافت شد */
    public readonly partialHtml: string,
    metadata: CrawlerErrorMetadata = {},
  ) {
    super(message, 'PARTIAL_FETCH', metadata);
    this.name = 'PartialFetchError';
  }
}
