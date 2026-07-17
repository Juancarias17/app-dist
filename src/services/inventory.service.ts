import api from './api'
import type {
  InventoryResponse,
  InventoryBatchResponse,
  InventoryAdjustmentRequest,
} from '../types'

export const inventoryService = {
  getAll: () =>
    api.get<InventoryResponse[]>('/api/inventory').then((r) => r.data),

  getByProduct: (productId: number) =>
    api.get<InventoryResponse>(`/api/inventory/product/${productId}`).then((r) => r.data),

  getLowStock: () =>
    api.get<InventoryResponse[]>('/api/inventory/low-stock').then((r) => r.data),

  getAvailableBatches: (productId: number) =>
    api.get<InventoryBatchResponse[]>(
      `/api/inventory/product/${productId}/batches/available`,
    ).then((r) => r.data),

  getAllBatches: (productId: number) =>
    api.get<InventoryBatchResponse[]>(
      `/api/inventory/product/${productId}/batches`,
    ).then((r) => r.data),

  adjustBatch: (data: InventoryAdjustmentRequest) =>
    api.patch<InventoryBatchResponse>('/api/inventory/batches/adjust', data).then((r) => r.data),

  archiveBatch: (id: number) =>
    api.patch<InventoryBatchResponse>(`/api/inventory/batches/${id}/archive`).then((r) => r.data),
}
