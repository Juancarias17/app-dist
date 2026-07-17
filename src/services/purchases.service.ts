import api from './api'
import type { PurchaseResponse, PurchaseCreateRequest } from '../types'

export const purchasesService = {
  getAll: (params?: { distributorId?: number; desde?: string; hasta?: string }) =>
    api.get<PurchaseResponse[]>('/api/purchases', { params }).then((r) => r.data),

  getById: (id: number) =>
    api.get<PurchaseResponse>(`/api/purchases/${id}`).then((r) => r.data),

  create: (data: PurchaseCreateRequest) =>
    api.post<PurchaseResponse>('/api/purchases', data).then((r) => r.data),
}
