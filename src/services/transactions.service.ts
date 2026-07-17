import api from './api'
import type {
  TransactionResponse,
  TransactionCreateRequest,
  TransactionUpdateRequest,
  TypeTransaction,
} from '../types'

export const transactionsService = {
  getAll: (params?: { type?: TypeTransaction; desde?: string; hasta?: string }) =>
    api.get<TransactionResponse[]>('/api/transactions', { params }).then((r) => r.data),

  getById: (id: number) =>
    api.get<TransactionResponse>(`/api/transactions/${id}`).then((r) => r.data),

  createManual: (data: TransactionCreateRequest) =>
    api.post<TransactionResponse>('/api/transactions/manual', data).then((r) => r.data),

  update: (id: number, data: TransactionUpdateRequest) =>
    api.put<TransactionResponse>(`/api/transactions/${id}`, data).then((r) => r.data),

  getSummary: (params: { desde: string; hasta: string }) =>
    api.get<Record<string, number>>('/api/transactions/summary', { params }).then((r) => r.data),
}
