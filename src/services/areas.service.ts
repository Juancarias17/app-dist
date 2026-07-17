import api from './api'
import type { AreaResponse, AreaCreateRequest, AreaUpdateRequest } from '../types'

export const areasService = {
  getAll: (params?: { name?: string }) =>
    api.get<AreaResponse[]>('/api/areas', { params }).then((r) => r.data),

  getById: (id: number) =>
    api.get<AreaResponse>(`/api/areas/${id}`).then((r) => r.data),

  create: (data: AreaCreateRequest) =>
    api.post<AreaResponse>('/api/areas', data).then((r) => r.data),

  update: (id: number, data: AreaUpdateRequest) =>
    api.put<AreaResponse>(`/api/areas/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/api/areas/${id}`),
}
