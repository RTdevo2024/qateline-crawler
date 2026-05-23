import { GhatelineClient } from './client';
import { InventoriesApi } from './inventories';
import { ProductsApi } from './products';
import { Publisher } from './publisher';
import { StoragesApi } from './storages';

// ─────────────────────────────────────────────────────────────────────────────
// Singleton — ساخته‌شده از env variables هنگام import
// ─────────────────────────────────────────────────────────────────────────────

const apiKey = process.env.GHATELINE_API_KEY ?? '';
const baseUrl = process.env.GHATELINE_API_BASE_URL ?? 'https://ghateline.com';

if (!apiKey && process.env.NODE_ENV !== 'test') {
  console.warn('[Ghateline] GHATELINE_API_KEY is not set — requests will fail with 401');
}

/** singleton HTTP client */
export const ghatelineClient = new GhatelineClient(apiKey, baseUrl);

/** singleton products API */
export const ghatelineProducts = new ProductsApi(ghatelineClient);

/** singleton inventories API */
export const ghatelineInventories = new InventoriesApi(ghatelineClient);

/** singleton storages API */
export const ghatelineStorages = new StoragesApi(ghatelineClient);

/**
 * ghatelinePublisher — singleton Publisher.
 *
 * lazy: فقط وقتی نیاز داریم می‌سازیم چون constructor env vars را validate می‌کند.
 * در محیط test یا وقتی env ها تنظیم نیستند، import این singleton خطا می‌دهد.
 */
let _publisher: Publisher | undefined;
export function getPublisher(): Publisher {
  if (_publisher === undefined) {
    _publisher = new Publisher(ghatelineProducts, ghatelineInventories);
  }
  return _publisher;
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports — برای import راحت در بقیه لایه‌های پروژه
// ─────────────────────────────────────────────────────────────────────────────

export { GhatelineClient, GhatelineApiError } from './client';
export { ProductsApi } from './products';
export { InventoriesApi } from './inventories';
export { StoragesApi } from './storages';
export { Publisher } from './publisher';
export type { PublishInput, PublishResult, PublishInventoryData, CategoryMapping } from './publisher';

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
  // Inventory
  GhatelineInventory,
  GhatelineInventoryImage,
  CreateInventoryRequest,
  CreateInventoryApiResponse,
  ListInventoriesParams,
  // Storage
  GhatelineStorage,
  GhatelineStorageProduct,
  ListStoragesParams,
  ListStorageProductsParams,
  // Error
  GhatelineValidationError,
} from './types';
