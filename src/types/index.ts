// =============================================================================
// SaudaSamrat — Shared Domain Types
// All modules must import types from here. Do not duplicate these.
// =============================================================================

// --------------- Enumerations ------------------------------------------------

export type Unit =
  | 'piece'
  | 'packet'
  | 'bottle'
  | 'kg'
  | 'g'
  | 'litre'
  | 'ml'
  | 'dozen';

export type ProductStatus = 'active' | 'archived';

export type StockAdjustmentReason =
  | 'manual_correction'
  | 'restock'
  | 'damage'
  | 'return'
  | 'reversal'
  | 'expired';

// --------------- Core domain models ------------------------------------------

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;         // current stock (supports decimals)
  unit: Unit;
  lowStockThreshold: number; // alert when quantity falls below this
  status: ProductStatus;
  barcode?: string;         // optional barcode identifier (EAN-13, UPC, Code128, etc.)
  createdAt: number;        // Unix epoch ms
  updatedAt: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;      // denormalized snapshot at time of sale
  quantity: number;
  unit: Unit;               // snapshot of product unit at time of sale
  soldAt: number;           // Unix epoch ms
}

export interface StockAdjustment {
  id: string;
  productId: string;
  delta: number;            // positive = add stock, negative = remove
  reason: StockAdjustmentReason;
  note?: string;
  adjustedAt: number;
  reversedAdjustmentId?: string;
  reversedSaleId?: string;
  isReversal?: boolean;
}

// Unified inventory movement record for timeline and safe reversal
export type MovementType =
  | 'sale'
  | 'restock'
  | 'manual_correction'
  | 'damage'
  | 'return'
  | 'reversal'
  | 'expired';

export interface StockMovement {
  id: string;
  type: MovementType;
  productId: string;
  productName: string;
  delta: number;
  unit: Unit;
  timestamp: number;
  reason?: StockAdjustmentReason;
  note?: string;
  canUndo: boolean;
  isReversed?: boolean;
  sourceType: 'sale' | 'adjustment';
  sourceId: string;
}


// --------------- Batch & Expiry models ---------------------------------------

export type ExpiryStatus = 'good' | 'expiring_soon' | 'expired';

export interface ProductBatch {
  id: string;              // uuid
  productId: string;       // foreign key to Product.id
  batchNumber: string;     // e.g. "B-04" or lot code
  expiryDate: string;      // ISO calendar string "YYYY-MM-DD"
  quantity: number;        // remaining quantity in this batch
  receivedAt: number;      // Unix epoch ms
  note?: string;
}

export interface BatchInput {
  productId: string;
  batchNumber: string;
  expiryDate: string;      // "YYYY-MM-DD"
  quantity: number;
  note?: string;
}

// --------------- Input / output shapes ---------------------------------------

export interface ProductInput {
  name: string;
  category?: string;
  quantity: number;
  unit: Unit;
  lowStockThreshold: number;
  barcode?: string;
  batchNumber?: string;
  expiryDate?: string;
}

export interface ProductUpdateInput {
  name?: string;
  category?: string;
  unit?: Unit;
  lowStockThreshold?: number;
  status?: ProductStatus;
  barcode?: string;
}

export interface StockAdjustmentInput {
  productId: string;
  delta: number;
  reason: StockAdjustmentReason;
  note?: string;
}

export interface SaleInput {
  productId: string;
  quantity: number;
}

export interface BulkReceiveItemInput {
  productId: string;
  quantity: number;
}

export interface BulkReceiveInput {
  items: BulkReceiveItemInput[];
  note?: string;
}

export interface BulkReceiveResult {
  success: boolean;
  updatedProducts: Product[];
  adjustments: StockAdjustment[];
  totalItemsReceived: number;
  timestamp: number;
}

// --------------- Derived / computed types ------------------------------------

export interface LowStockItem {
  product: Product;
  deficit: number; // threshold - quantity (always > 0)
}

export interface SlowMovingItem {
  product: Product;
  lastSoldAt: number | null;  // null = never sold
  totalSoldInPeriod: number;
  lookbackDays: number;
}

export interface SalesVelocity {
  productId: string;
  averageDailySales: number;
  lookbackDays: number;
  totalSold: number;
}

export interface SmartReorderRecommendation {
  product: Product;
  classification: 'low_stock' | 'reorder_suggested';
  currentStock: number;
  lowStockThreshold: number;
  unit: Unit;
  observationDays: number;
  totalSoldInWindow: number;
  averageDailySales: number;
  daysOfStockRemaining: number | null;
  hasSufficientHistory: boolean;
  suggestedOrderQuantity: number;
  calculationReason: string;
  targetDaysCoverage: number;
  isDismissed?: boolean;
}

export interface OrderListItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: Unit;
  supplierName?: string;
}

export interface SupplierOrderList {
  id: string;
  supplierName?: string;
  items: OrderListItem[];
  createdAt: number;
  notes?: string;
}

// --------------- Profile models ----------------------------------------------

export interface ShopProfile {
  id: 'profile';
  ownerName: string;
  shopName: string;
  updatedAt: number;
}

export interface ShopProfileInput {
  ownerName: string;
  shopName: string;
}

// --------------- Error handling ----------------------------------------------

export type AppErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_ARCHIVED'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_QUANTITY'
  | 'INVALID_THRESHOLD'
  | 'DUPLICATE_PRODUCT'
  | 'DUPLICATE_BARCODE'
  | 'INVALID_PROFILE'
  | 'ALREADY_REVERSED'
  | 'OPERATION_NOT_ELIGIBLE'
  | 'DB_ERROR'
  | 'UNKNOWN';

export interface AppError extends Error {
  code: AppErrorCode;
  details?: unknown;
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  details?: unknown,
): AppError {
  const err = new Error(message) as AppError;
  err.name = 'AppError';
  err.code = code;
  err.details = details;
  return err;
}

// Convenience alias used throughout the codebase
export const AppError = { create: createAppError };

export function isAppError(err: unknown): err is AppError {
  return err instanceof Error && (err as AppError).code !== undefined;
}

// Backup & restore types
export * from './backup';

