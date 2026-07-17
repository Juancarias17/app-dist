import api from './api'
import type {
  ProductResponse,
  ProductCreateRequest,
  ProductUpdateRequest,
  DistributorPriceResponse,
} from '../types'

export const productsService = {
  getAll: (params?: { areaId?: number; name?: string }) =>
    api.get<ProductResponse[]>('/api/products', { params }).then((r) => r.data),

  getById: (id: number) =>
    api.get<ProductResponse>(`/api/products/${id}`).then((r) => r.data),

  create: (data: ProductCreateRequest) =>
    api.post<ProductResponse>('/api/products', data).then((r) => r.data),

  update: (id: number, data: ProductUpdateRequest) =>
    api.put<ProductResponse>(`/api/products/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/api/products/${id}`),

  comparePrices: (id: number) =>
    api.get<DistributorPriceResponse[]>(`/api/products/${id}/compare-prices`).then((r) => r.data),

  bestPrice: (id: number) =>
    api.get<DistributorPriceResponse>(`/api/products/${id}/best-price`).then((r) => r.data),

  recalculatePrice: (id: number) =>
    api.post<ProductResponse>(`/api/products/${id}/recalculate-recommended-price`).then((r) => r.data),
}
