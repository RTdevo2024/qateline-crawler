import type { AIProcessingOutput } from '@/types/ai';
import { GhatelineApiError } from './client';
import type { InventoriesApi } from './inventories';
import type { ProductsApi } from './products';
import type { CreateInventoryRequest, CreateProductRequest } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CategoryMapping — نگاشت دسته‌بندی AI به category_id قطعه‌لاین
// ─────────────────────────────────────────────────────────────────────────────

/** نگاشت عنوان دسته‌بندی فارسی به category_id عددی قطعه‌لاین */
export type CategoryMapping = Record<string, number>;

// ─────────────────────────────────────────────────────────────────────────────
// PublishInput
// ─────────────────────────────────────────────────────────────────────────────

export interface PublishInventoryData {
  /** قیمت فروش — ریال */
  price: number;
  /** تعداد موجودی */
  count: number;
  /** قیمت با تخفیف */
  discount_price?: number;
  /** وزن — گرم */
  weight?: number;
  /** آیا محصول اصل است */
  original?: boolean;
}

export interface PublishInput {
  /** خروجی پردازش AI */
  aiOutput: AIProcessingOutput;
  /** اطلاعات موجودی */
  inventory: PublishInventoryData;
  /** نگاشت دسته‌بندی — اگر داده نشود از env پیش‌فرض استفاده می‌شود */
  categoryMapping?: CategoryMapping;
  /** تصاویر محصول — آرایه‌ای از URL */
  images?: string[];
}

export interface PublishResult {
  productUuid: string;
  inventoryUuid: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Publisher
// ─────────────────────────────────────────────────────────────────────────────

export class Publisher {
  private readonly adminUserId: number;
  private readonly defaultStorageUuid: string;
  private readonly defaultCategoryId: number;

  constructor(
    private readonly products: ProductsApi,
    private readonly inventories: InventoriesApi,
  ) {
    const rawUserId = process.env.GHATELINE_ADMIN_USER_ID ?? '';
    const parsed = parseInt(rawUserId, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error(
        'GHATELINE_ADMIN_USER_ID is not set or invalid — must be a positive integer',
      );
    }
    this.adminUserId = parsed;

    const storageUuid = process.env.GHATELINE_DEFAULT_STORAGE_UUID ?? '';
    if (!storageUuid) {
      throw new Error('GHATELINE_DEFAULT_STORAGE_UUID is not set');
    }
    this.defaultStorageUuid = storageUuid;

    const rawCategoryId = process.env.GHATELINE_DEFAULT_CATEGORY_ID ?? '';
    const parsedCategory = parseInt(rawCategoryId, 10);
    this.defaultCategoryId = isNaN(parsedCategory) || parsedCategory <= 0 ? 1 : parsedCategory;
  }

  /**
   * publishProduct — محصول را در قطعه‌لاین منتشر می‌کند.
   *
   * ترتیب عملیات:
   * 1. category_id را از mapping یا env پیدا می‌کند
   * 2. محصول را ایجاد می‌کند
   * 3. اگر محصول variables دارد، جزئیات محصول را می‌گیرد
   * 4. موجودی را ایجاد می‌کند
   * 5. در صورت خطا، محصول را rollback می‌کند
   */
  async publishProduct(input: PublishInput): Promise<PublishResult> {
    const { aiOutput, inventory, categoryMapping, images } = input;

    // --- ۱. تعیین category_id ---
    const categoryId = this.resolveCategoryId(aiOutput.category, categoryMapping);

    // --- ۲. ایجاد محصول ---
    const productData: CreateProductRequest = {
      user_id: this.adminUserId,
      category_id: categoryId,
      title: aiOutput.title,
      title_en: aiOutput.title_en,
      slug: aiOutput.slug,
      content: aiOutput.description,
      attrs: aiOutput.attrs,
      seo_title: aiOutput.seo_title,
      seo_description: aiOutput.seo_description,
      status: 'draft',
      images: images?.map((url, i) => ({
        url,
        is_main: i === 0,
        sort: i + 1,
      })),
    };

    let productUuid: string;
    try {
      const result = await this.products.create(productData);
      productUuid = result.product_uuid;
    } catch (err) {
      throw this.wrapError('ایجاد محصول', err);
    }

    // --- ۳. بررسی variables (اگر price_model دارد) ---
    let variables: Record<string, string> | undefined;
    try {
      const productDetail = await this.products.get(productUuid);
      if (productDetail.price_model !== undefined && productDetail.price_model.length > 0) {
        // اولین variant به عنوان پیش‌فرض
        const firstVariant = productDetail.price_model[0];
        if (firstVariant !== undefined) {
          variables = { variant: firstVariant.title };
        }
      }
    } catch {
      // اگر نتوانستیم جزئیات بگیریم، بدون variables ادامه می‌دهیم
    }

    // --- ۴. ایجاد موجودی ---
    const inventoryData: CreateInventoryRequest = {
      user_id: this.adminUserId,
      storage_uuid: this.defaultStorageUuid,
      price: inventory.price,
      count: inventory.count,
      discount_price: inventory.discount_price,
      weight: inventory.weight,
      original: inventory.original,
      variables,
    };

    let inventoryUuid: string;
    try {
      const result = await this.inventories.create(productUuid, inventoryData);
      inventoryUuid = result.inventory_uuid;
    } catch (err) {
      // rollback — محصول را حذف می‌کنیم
      try {
        await this.products.delete(productUuid);
      } catch (rollbackErr) {
        const rollbackMsg =
          rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
        console.error(
          `[Publisher] rollback failed for product ${productUuid}: ${rollbackMsg}`,
        );
      }
      throw this.wrapError('ایجاد موجودی (rollback انجام شد)', err);
    }

    return { productUuid, inventoryUuid };
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private resolveCategoryId(
    aiCategory: string | undefined,
    mapping: CategoryMapping | undefined,
  ): number {
    if (aiCategory !== undefined && mapping !== undefined) {
      const mapped = mapping[aiCategory];
      if (mapped !== undefined) return mapped;
    }
    return this.defaultCategoryId;
  }

  private wrapError(step: string, err: unknown): Error {
    if (err instanceof GhatelineApiError) {
      return new Error(`Publisher: خطا در ${step} [${err.status}]: ${err.message}`);
    }
    if (err instanceof Error) return new Error(`Publisher: خطا در ${step}: ${err.message}`);
    return new Error(`Publisher: خطای ناشناخته در ${step}`);
  }
}
