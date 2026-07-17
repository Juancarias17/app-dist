import api from './api'
import type {
  DistributorResponse,
  DistributorCreateRequest,
  DistributorUpdateRequest,
} from '../types'

export const distributorsService = {
  getAll: (params?: { name?: string }) =>
    api.get<DistributorResponse[]>('/api/distributors', { params }).then((r) => r.data),

  getById: (id: number) =>
    api.get<DistributorResponse>(`/api/distributors/${id}`).then((r) => r.data),

  create: (data: DistributorCreateRequest) =>
    api.post<DistributorResponse>('/api/distributors', data).then((r) => r.data),

  update: (id: number, data: DistributorUpdateRequest) =>
    api.put<DistributorResponse>(`/api/distributors/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/api/distributors/${id}`),
}
