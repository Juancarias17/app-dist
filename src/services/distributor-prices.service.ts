import api from './api'
import type {
  DistributorPriceResponse,
  DistributorPriceCreateRequest,
  DistributorPriceUpdateRequest,
} from '../types'

export const distributorPricesService = {
  getAll: (params?: { productId?: number; distributorId?: number }) =>
    api.get<DistributorPriceResponse[]>('/api/distributor-prices', { params }).then((r) => r.data),

  create: (data: DistributorPriceCreateRequest) =>
    api.post<DistributorPriceResponse>('/api/distributor-prices', data).then((r) => r.data),

  update: (id: number, data: DistributorPriceUpdateRequest) =>
    api.put<DistributorPriceResponse>(`/api/distributor-prices/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/api/distributor-prices/${id}`),
}
