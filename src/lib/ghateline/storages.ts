import { z } from 'zod';
import type { PaginatedResponse } from '@/types/common';
import { GhatelineClient } from './client';
import type {
  GhatelineListApiResponse,
  GhatelineStorage,
  GhatelineStorageProduct,
  ListStorageProductsParams,
  ListStoragesParams,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

const ListParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  per_page: z.number().int().min(1).max(100).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// StoragesApi
// ─────────────────────────────────────────────────────────────────────────────

export class StoragesApi {
  constructor(private readonly client: GhatelineClient) {}

  /**
   * list — لیست انبارهای موجود.
   *
   * GET /api/v1/storages
   */
  async list(params?: ListStoragesParams): Promise<PaginatedResponse<GhatelineStorage>> {
    if (params !== undefined) {
      ListParamsSchema.parse(params);
    }

    const response = await this.client.request<GhatelineListApiResponse<GhatelineStorage>>(
      'GET',
      '/api/v1/storages',
      params !== undefined
        ? { params: params as Record<string, unknown> }
        : undefined,
    );

    const meta = response.meta;
    const perPage = meta?.per_page ?? 20;
    const total = meta?.total ?? response.data.length;

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
   * listProducts — لیست محصولات موجود در یک انبار.
   *
   * GET /api/v1/storages/products/{storage_uuid}
   */
  async listProducts(
    storageUuid: string,
    params?: ListStorageProductsParams,
  ): Promise<PaginatedResponse<GhatelineStorageProduct>> {
    z.string().uuid().parse(storageUuid);
    if (params !== undefined) {
      ListParamsSchema.parse(params);
    }

    const response = await this.client.request<GhatelineListApiResponse<GhatelineStorageProduct>>(
      'GET',
      `/api/v1/storages/products/${storageUuid}`,
      params !== undefined
        ? { params: params as Record<string, unknown> }
        : undefined,
    );

    const meta = response.meta;
    const perPage = meta?.per_page ?? 20;
    const total = meta?.total ?? response.data.length;

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
}
