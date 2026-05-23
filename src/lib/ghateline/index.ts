import { GhatelineClient } from './client';
import { ProductsApi } from './products';

// ─────────────────────────────────────────────────────────────────────────────
// Singleton — ساخته‌شده از env variables هنگام import
// ─────────────────────────────────────────────────────────────────────────────

const apiKey = process.env.GHATELINE_API_KEY ?? '';
const baseUrl = process.env.GHATELINE_API_BASE_URL ?? 'https://ghateline.com';

if (!apiKey && process.env.NODE_ENV !== 'test') {
  console.warn('[Ghateline] GHATELINE_API_KEY is not set — requests will fail with 401');
}

/** singleton client — برای استفاده مستقیم در موارد custom */
export const ghatelineClient = new GhatelineClient(apiKey, baseUrl);

/** singleton products API — برای CRUD عملیات محصول */
export const ghatelineProducts = new ProductsApi(ghatelineClient);

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports — برای import راحت در بقیه لایه‌های پروژه
// ─────────────────────────────────────────────────────────────────────────────

export { GhatelineClient, GhatelineApiError } from './client';
export { ProductsApi } from './products';
export type {
  // Status
  GhatelineProductStatus,
  // Sub-objects
  GhatelineTab,
  GhatelineAttrItem,
  GhatelineImageItem,
  GhatelineVideos,
  GhatelinePriceModelItem,
  GhatelineInquiryOptions,
  // Pagination
  GhatelinePagination,
  // Response wrappers
  GhatelineListApiResponse,
  GhatelineApiResponse,
  // Product
  GhatelineProduct,
  // Request/Response
  CreateProductRequest,
  CreateProductApiResponse,
  UpdateProductRequest,
  ListProductsParams,
  // Error
  GhatelineValidationError,
} from './types';
