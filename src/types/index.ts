export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  expiresIn: number
}

export interface AreaResponse {
  id: number
  name: string
  margen: number
}

export interface AreaCreateRequest {
  name: string
  margen: number
}

export interface AreaUpdateRequest {
  name?: string
  margen?: number
}

export interface DistributorResponse {
  id: number
  name: string
  contact: string
}

export interface DistributorCreateRequest {
  name: string
  contact?: string
}

export interface DistributorUpdateRequest {
  name?: string
  contact?: string
}

export interface DistributorPriceResponse {
  id: number
  productName: string
  distributorName: string
  price: number
  date: string
}

export interface DistributorPriceCreateRequest {
  productId: number
  distributorId: number
  price: number
}

export interface DistributorPriceUpdateRequest {
  price: number
}

export interface ProductResponse {
  id: number
  areaName: string
  name: string
  sellingPrice: number
  priceRecomendation: number | null
  iva: boolean
  totalStock: number
  threshold: number
}

export interface ProductCreateRequest {
  areaId: number
  name: string
  sellingPrice: number
  iva: boolean
  threshold: number
}

export interface ProductUpdateRequest {
  areaId?: number
  name?: string
  sellingPrice?: number
  iva?: boolean
  threshold?: number
}

export interface InventoryResponse {
  id: number
  productName: string
  totalQuantity: number
  threshold: number
  batches: InventoryBatchResponse[]
}

export interface InventoryBatchResponse {
  id: number
  productName: string
  quantity: number
  unitCost: number
  sellingPrice: number
  purchaseDate: string
  archived: boolean
}

export interface InventoryAdjustmentRequest {
  inventoryBatchId: number
  adjustment: number
  reason: string
}

export interface PurchaseResponse {
  id: number
  distributorName: string
  purchaseDate: string
  description: string
  items: PurchaseItemResponse[]
  total: number
}

export interface PurchaseItemResponse {
  id: number
  productName: string
  quantity: number
  price: number
  total: number
}

export interface PurchaseItemRequest {
  productId: number
  quantity: number
  price: number
}

export interface PurchaseCreateRequest {
  distributorId: number
  purchaseDate: string
  description?: string
  items: PurchaseItemRequest[]
}

export interface SaleResponse {
  id: number
  clientName: string
  saleDate: string
  description: string
  items: SaleItemResponse[]
  total: number
}

export interface SaleItemResponse {
  id: number
  productName: string
  inventoryBatchId: number
  quantity: number
  price: number
  total: number
  costoLote: number
  utilidad: number
}

export interface SaleItemRequest {
  inventoryBatchId: number
  quantity: number
  price: number
}

export interface SaleCreateRequest {
  clientName: string
  saleDate: string
  description?: string
  items: SaleItemRequest[]
}

export enum TypeTransaction {
  INCOME = 'INCOME',
  OUTCOME = 'OUTCOME',
  INVESTMENT = 'INVESTMENT',
}

export interface TransactionResponse {
  id: number
  type: TypeTransaction
  date: string
  counterpart: string
  amount: number
  description: string
  purchaseId: number | null
  saleId: number | null
}

export interface TransactionCreateRequest {
  type: TypeTransaction
  date: string
  counterpart: string
  amount: number
  description?: string
}

export interface TransactionUpdateRequest {
  description?: string
}

export interface ApiError {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  violations: FieldViolation[]
}

export interface FieldViolation {
  field: string
  message: string
}
