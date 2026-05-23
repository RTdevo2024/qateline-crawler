import { z } from 'zod';
import type { PaginatedResponse } from '@/types/common';
import { GhatelineClient } from './client';
import type {
  CreateInventoryApiResponse,
  CreateInventoryRequest,
  GhatelineInventory,
  GhatelineListApiResponse,
  ListInventoriesParams,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

const InventoryImageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional(),
});

const CreateInventorySchema = z.object({
  user_id: z.number().int().positive(),
  storage_uuid: z.string().uuid(),
  variables: z.record(z.string(), z.string()).optional(),
  price: z.number().int().nonnegative(),
  discount_price: z.number().int().nonnegative().optional(),
  discount_expire: z.string().optional(),
  discount_tree: z.array(z.number().int()).optional(),
  count: z.number().int().nonnegative(),
  min_sale: z.number().int().positive().optional(),
  max_sale: z.number().int().positive().optional(),
  original: z.boolean().optional(),
  used: z.boolean().optional(),
  weight: z.number().int().positive().optional(),
  purchase_price: z.number().int().nonnegative().optional(),
  image: InventoryImageSchema.optional(),
  send_time: z.string().optional(),
});

const ListInventoriesParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  per_page: z.number().int().min(1).max(100).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Internal response types
// ─────────────────────────────────────────────────────────────────────────────

type GetInventoryRaw = {
  success?: boolean;
  data?: GhatelineInventory;
  response?: GhatelineInventory;
};

type MutationResponse = {
  success: boolean;
  message?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// InventoriesApi
// ─────────────────────────────────────────────────────────────────────────────

export class InventoriesApi {
  constructor(private readonly client: GhatelineClient) {}

  /**
   * listByProduct — لیست موجودی‌های یک محصول با pagination اختیاری.
   *
   * GET /api/v1/inventories/product/{product_uuid}
   */
  async listByProduct(
    productUuid: string,
    params?: ListInventoriesParams,
  ): Promise<PaginatedResponse<GhatelineInventory>> {
    z.string().uuid().parse(productUuid);
    if (params !== undefined) {
      ListInventoriesParamsSchema.parse(params);
    }

    const response = await this.client.request<GhatelineListApiResponse<GhatelineInventory>>(
      'GET',
      `/api/v1/inventories/product/${productUuid}`,
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
   * get — جزئیات یک موجودی با UUID.
   *
   * GET /api/v1/inventories/show/{inventory_uuid}
   */
  async get(inventoryUuid: string): Promise<GhatelineInventory> {
    z.string().uuid().parse(inventoryUuid);

    const raw = await this.client.request<GetInventoryRaw>(
      'GET',
      `/api/v1/inventories/show/${inventoryUuid}`,
    );

    const inventory = raw.data ?? raw.response;
    if (inventory === undefined) {
      throw new Error(`Inventory not found in response for uuid: ${inventoryUuid}`);
    }
    return inventory;
  }

  /**
   * create — ایجاد موجودی برای یک محصول.
   *
   * POST /api/v1/inventories/product/{product_uuid}/create
   * پاسخ: { inventory_uuid } که باید در DB ذخیره شود
   */
  async create(
    productUuid: string,
    data: CreateInventoryRequest,
  ): Promise<{ inventory_uuid: string }> {
    z.string().uuid().parse(productUuid);
    CreateInventorySchema.parse(data);

    const response = await this.client.request<CreateInventoryApiResponse>(
      'POST',
      `/api/v1/inventories/product/${productUuid}/create`,
      { data },
    );

    return { inventory_uuid: response.inventory_uuid };
  }

  /**
   * update — ویرایش یک موجودی.
   *
   * PUT /api/v1/inventories/{inventory_uuid}
   */
  async update(
    inventoryUuid: string,
    data: Partial<CreateInventoryRequest>,
  ): Promise<void> {
    z.string().uuid().parse(inventoryUuid);
    CreateInventorySchema.partial().parse(data);

    await this.client.request<MutationResponse>(
      'PUT',
      `/api/v1/inventories/${inventoryUuid}`,
      { data },
    );
  }

  /**
   * delete — حذف یک موجودی.
   *
   * DELETE /api/v1/inventories/{inventory_uuid}
   */
  async delete(inventoryUuid: string): Promise<void> {
    z.string().uuid().parse(inventoryUuid);

    await this.client.request<MutationResponse>(
      'DELETE',
      `/api/v1/inventories/${inventoryUuid}`,
    );
  }
}
