import api from './api'
import type { SaleResponse, SaleCreateRequest } from '../types'

export const salesService = {
  getAll: (params?: { clientName?: string; desde?: string; hasta?: string }) =>
    api.get<SaleResponse[]>('/api/sales', { params }).then((r) => r.data),

  getById: (id: number) =>
    api.get<SaleResponse>(`/api/sales/${id}`).then((r) => r.data),

  create: (data: SaleCreateRequest) =>
    api.post<SaleResponse>('/api/sales', data).then((r) => r.data),
}
