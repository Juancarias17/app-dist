import api from './api'
import type { DebtResponse, DebtCreateRequest, DebtPaymentRequest, DebtSummary } from '../types'

export const debtsService = {
  getAll: (params?: { clientName?: string; status?: string }) =>
    api.get<DebtResponse[]>('/api/debts', { params }).then((r) => r.data),

  getById: (id: number) =>
    api.get<DebtResponse>(`/api/debts/${id}`).then((r) => r.data),

  create: (data: DebtCreateRequest) =>
    api.post<DebtResponse>('/api/debts', data).then((r) => r.data),

  recordPayment: (id: number, data: DebtPaymentRequest) =>
    api.post<DebtResponse>(`/api/debts/${id}/payments`, data).then((r) => r.data),

  getSummary: () =>
    api.get<DebtSummary>('/api/debts/summary').then((r) => r.data),
}
