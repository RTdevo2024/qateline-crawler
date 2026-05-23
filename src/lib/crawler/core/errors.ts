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
