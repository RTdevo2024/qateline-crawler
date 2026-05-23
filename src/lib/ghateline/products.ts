import { z } from 'zod';
import type { PaginatedResponse } from '@/types/common';
import { GhatelineClient } from './client';
import type {
  CreateProductApiResponse,
  CreateProductRequest,
  GhatelineListApiResponse,
  GhatelineProduct,
  ListProductsParams,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas — runtime validation پیش از ارسال به API
// ─────────────────────────────────────────────────────────────────────────────

const TabSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  sort: z.number().int().optional(),
});

const AttrSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const ImageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional(),
  title: z.string().optional(),
  sort: z.number().int().optional(),
  is_main: z.boolean().optional(),
});

const VideosSchema = z.object({
  main: z.string().optional(),
  preview: z.string().optional(),
});

const PriceModelItemSchema = z.object({
  title: z.string().min(1),
  price: z.number().int().nonnegative(),
  compare_price: z.number().int().nonnegative().optional(),
  in_stock: z.boolean().optional(),
  quantity: z.number().int().nonnegative().optional(),
});

const InquiryOptionsSchema = z.object({
  enabled: z.boolean().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

const ProductStatusSchema = z.enum(['publish', 'draft']);

/** schema کامل برای CreateProductRequest — با strict input validation */
const CreateProductSchema = z.object({
  user_id: z.number().int().positive(),
  category_id: z.number().int().positive(),
  title: z.string().min(1).max(500),
  brand: z.string().optional(),
  title_en: z.string().optional(),
  slug: z.string().optional(),
  content: z.string().optional(),
  warnings: z.string().optional(),
  guide: z.string().optional(),
  tabs: z.array(TabSchema).optional(),
  attrs: z.array(AttrSchema).optional(),
  images: z.array(ImageSchema).optional(),
  videos: VideosSchema.optional(),
  model_3d: z.string().optional(),
  price_model: z.array(PriceModelItemSchema).optional(),
  commission: z.number().int().min(0).max(100).optional(),
  in_stock_status: z.boolean().optional(),
  inquiry_options: InquiryOptionsSchema.optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_canonical: z.string().optional(),
  is_vip: z.boolean().optional(),
  comment_status: z.boolean().optional(),
  question_status: z.boolean().optional(),
  status: ProductStatusSchema.optional(),
  sub_categories: z.array(z.number().int().positive()).optional(),
  uuid: z.string().uuid().optional(),
});

const ListParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  per_page: z.number().int().min(1).max(100).optional(),
  status: ProductStatusSchema.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Internal response types (raw API shapes)
// ─────────────────────────────────────────────────────────────────────────────

type GetProductRaw = {
  success?: boolean;
  data?: GhatelineProduct;
  response?: GhatelineProduct;
};

type MutationResponse = {
  success: boolean;
  message?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// ProductsApi
// ─────────────────────────────────────────────────────────────────────────────

export class ProductsApi {
  constructor(private readonly client: GhatelineClient) {}

  /**
   * list — لیست محصولات با pagination اختیاری.
   *
   * GET /api/v1/products
   */
  async list(params?: ListProductsParams): Promise<PaginatedResponse<GhatelineProduct>> {
    if (params !== undefined) {
      ListParamsSchema.parse(params);
    }

    const response = await this.client.request<GhatelineListApiResponse<GhatelineProduct>>(
      'GET',
      '/api/v1/products',
      params !== undefined
        ? { params: params as Record<string, unknown> }
        : undefined,
    );

    const meta = response.meta;
    const perPage = meta?.per_page ?? 20;
    const total = meta?.total ?? 0;

    return {
      data: response.data,
      pagination: {
        page: meta?.current_page ?? 1,
        limit: perPage,
        total,
        totalPages: meta?.last_page ?? Math.ceil(total / perPage),
      },
    };
  }

  /**
   * get — جزئیات کامل یک محصول با UUID.
   *
   * GET /api/v1/products/{uuid}
   */
  async get(uuid: string): Promise<GhatelineProduct> {
    z.string().uuid().parse(uuid);

    const raw = await this.client.request<GetProductRaw>(
      'GET',
      `/api/v1/products/${uuid}`,
    );

    const product = raw.data ?? raw.response;
    if (product === undefined) {
      throw new Error(`Product not found in response for uuid: ${uuid}`);
    }
    return product;
  }

  /**
   * create — ایجاد محصول جدید در قطعه‌لاین.
   *
   * POST /api/v1/products/create
   * پاسخ: { product_uuid } که باید در DB ذخیره شود
   */
  async create(data: CreateProductRequest): Promise<{ product_uuid: string }> {
    CreateProductSchema.parse(data);

    const response = await this.client.request<CreateProductApiResponse>(
      'POST',
      '/api/v1/products/create',
      { data },
    );

    return { product_uuid: response.product_uuid };
  }

  /**
   * update — ویرایش فیلدهای دلخواه یک محصول.
   *
   * PUT /api/v1/products/{uuid}
   */
  async update(uuid: string, data: Partial<CreateProductRequest>): Promise<void> {
    z.string().uuid().parse(uuid);
    CreateProductSchema.partial().parse(data);

    await this.client.request<MutationResponse>(
      'PUT',
      `/api/v1/products/${uuid}`,
      { data },
    );
  }

  /**
   * delete — حذف یک محصول از قطعه‌لاین.
   *
   * DELETE /api/v1/products/{uuid}
   */
  async delete(uuid: string): Promise<void> {
    z.string().uuid().parse(uuid);

    await this.client.request<MutationResponse>(
      'DELETE',
      `/api/v1/products/${uuid}`,
    );
  }
}
