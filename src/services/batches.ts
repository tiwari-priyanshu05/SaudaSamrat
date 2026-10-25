// =============================================================================
// SaudaSamrat — Batch & Expiry Management Service (Phase 8)
// Timezone-safe calendar calculations, FIFO depletion, and batch write-offs.
// =============================================================================

import { nanoid } from 'nanoid';
import { db } from '../db';
import type {
  ProductBatch,
  BatchInput,
  ExpiryStatus,
  Product,
  StockAdjustment,
} from '../types';
import { createAppError } from '../types';

function now(): number {
  return Date.now();
}

/**
 * Parses YYYY-MM-DD calendar dates strictly without timezone shift.
 */
export function parseIsoDateParts(
  isoDate: string
): { year: number; month: number; day: number } | null {
  if (!isoDate || typeof isoDate !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * Calculates whole days remaining until expiry using UTC midnight timestamps.
 * Prevents local client DST or UTC offset shifts from moving the date by a day.
 */
export function getDaysToExpiry(
  expiryDate: string,
  fromDate = new Date()
): number {
  const parts = parseIsoDateParts(expiryDate);
  if (!parts) return 0;

  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  const todayUtc = Date.UTC(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );

  const msPerDay = 86400000;
  return Math.round((targetUtc - todayUtc) / msPerDay);
}

/**
 * Evaluates expiry status:
 * - 'expired': daysRemaining < 0
 * - 'expiring_soon': 0 <= daysRemaining <= thresholdDays (default 30)
 * - 'good': daysRemaining > thresholdDays
 */
export function calculateExpiryStatus(
  expiryDate: string,
  thresholdDays = 30,
  fromDate = new Date()
): { status: ExpiryStatus; daysRemaining: number } {
  const days = getDaysToExpiry(expiryDate, fromDate);
  if (days < 0) {
    return { status: 'expired', daysRemaining: days };
  }
  if (days <= thresholdDays) {
    return { status: 'expiring_soon', daysRemaining: days };
  }
  return { status: 'good', daysRemaining: days };
}

/**
 * Fetch all batches for a specific product, sorted by earliest expiry date.
 */
export async function getBatchesForProduct(
  productId: string
): Promise<ProductBatch[]> {
  const list = await db.batches.where('productId').equals(productId).toArray();
  return list.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

/**
 * Fetch all batches in the entire inventory.
 */
export async function getAllBatches(): Promise<ProductBatch[]> {
  const list = await db.batches.toArray();
  return list.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

/**
 * Add a new batch to a product and increase overall product quantity atomically.
 */
export async function addBatch(input: BatchInput): Promise<ProductBatch> {
  const batchNumber = input.batchNumber?.trim();
  if (!batchNumber) {
    throw createAppError('INVALID_QUANTITY', 'Batch number is required');
  }

  const parts = parseIsoDateParts(input.expiryDate);
  if (!parts) {
    throw createAppError(
      'INVALID_QUANTITY',
      'Valid expiry date (YYYY-MM-DD) is required'
    );
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw createAppError(
      'INVALID_QUANTITY',
      'Batch quantity must be greater than zero'
    );
  }

  let createdBatch: ProductBatch;

  await db.transaction(
    'rw',
    db.products,
    db.batches,
    db.stockAdjustments,
    async () => {
      const product = await db.products.get(input.productId);
      if (!product) {
        throw createAppError('PRODUCT_NOT_FOUND', 'Product not found');
      }

      createdBatch = {
        id: nanoid(),
        productId: input.productId,
        batchNumber,
        expiryDate: input.expiryDate.trim(),
        quantity: input.quantity,
        receivedAt: now(),
        note: input.note?.trim(),
      };

      const newQty = +(product.quantity + input.quantity).toFixed(6);
      const updatedProduct: Product = {
        ...product,
        quantity: newQty,
        updatedAt: now(),
      };

      const adjustment: StockAdjustment = {
        id: nanoid(),
        productId: product.id,
        delta: input.quantity,
        reason: 'restock',
        note: `Batch ${batchNumber} (Exp: ${createdBatch.expiryDate})`,
        adjustedAt: now(),
      };

      await db.batches.add(createdBatch);
      await db.products.put(updatedProduct);
      await db.stockAdjustments.add(adjustment);
    }
  );

  return createdBatch!;
}

/**
 * Depletes batches in FIFO order by earliest expiry date.
 * Automatically called during sales recording.
 */
export async function depleteBatchesFIFOInternal(
  productId: string,
  quantityToDeplete: number
): Promise<{
  depletedBatches: Array<{ batchId: string; batchNumber: string; quantity: number }>;
}> {
  if (quantityToDeplete <= 0) return { depletedBatches: [] };

  const batches = await db.batches.where('productId').equals(productId).toArray();
  batches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  let remaining = quantityToDeplete;
  const depletedBatches: Array<{ batchId: string; batchNumber: string; quantity: number }> = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    if (batch.quantity <= remaining) {
      depletedBatches.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: batch.quantity,
      });
      remaining = +(remaining - batch.quantity).toFixed(6);
      await db.batches.delete(batch.id);
    } else {
      depletedBatches.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: remaining,
      });
      batch.quantity = +(batch.quantity - remaining).toFixed(6);
      remaining = 0;
      await db.batches.put(batch);
    }
  }

  return { depletedBatches };
}

/**
 * Write off / discard an expired or damaged batch, deducting its remaining quantity from stock.
 */
export async function writeOffBatch(
  batchId: string,
  reason: 'damage' | 'expired' = 'expired'
): Promise<{ product: Product; adjustment: StockAdjustment }> {
  let updatedProduct: Product;
  let adjustment: StockAdjustment;

  await db.transaction(
    'rw',
    db.products,
    db.batches,
    db.stockAdjustments,
    async () => {
      const batch = await db.batches.get(batchId);
      if (!batch) {
        throw createAppError('PRODUCT_NOT_FOUND', 'Batch not found');
      }

      const product = await db.products.get(batch.productId);
      if (!product) {
        throw createAppError('PRODUCT_NOT_FOUND', 'Product not found');
      }

      const deductQty = batch.quantity;
      const newQty = Math.max(0, +(product.quantity - deductQty).toFixed(6));

      updatedProduct = {
        ...product,
        quantity: newQty,
        updatedAt: now(),
      };

      adjustment = {
        id: nanoid(),
        productId: product.id,
        delta: -deductQty,
        reason,
        note: `Write-off batch ${batch.batchNumber} (Exp: ${batch.expiryDate})`,
        adjustedAt: now(),
      };

      await db.batches.delete(batch.id);
      await db.products.put(updatedProduct);
      await db.stockAdjustments.add(adjustment);
    }
  );

  return { product: updatedProduct!, adjustment: adjustment! };
}

/**
 * Returns summary of expiry status for a product.
 */
export async function getProductExpiryOverview(
  productId: string,
  thresholdDays = 30
): Promise<{
  hasBatches: boolean;
  earliestExpiry?: string;
  status: ExpiryStatus;
  totalBatchQty: number;
  expiredQty: number;
  expiringSoonQty: number;
  goodQty: number;
  batches: ProductBatch[];
}> {
  const batches = await getBatchesForProduct(productId);
  if (batches.length === 0) {
    return {
      hasBatches: false,
      status: 'good',
      totalBatchQty: 0,
      expiredQty: 0,
      expiringSoonQty: 0,
      goodQty: 0,
      batches: [],
    };
  }

  let expiredQty = 0;
  let expiringSoonQty = 0;
  let goodQty = 0;
  let overallStatus: ExpiryStatus = 'good';

  for (const b of batches) {
    const { status } = calculateExpiryStatus(b.expiryDate, thresholdDays);
    if (status === 'expired') {
      expiredQty = +(expiredQty + b.quantity).toFixed(6);
      overallStatus = 'expired';
    } else if (status === 'expiring_soon') {
      expiringSoonQty = +(expiringSoonQty + b.quantity).toFixed(6);
      if (overallStatus !== 'expired') {
        overallStatus = 'expiring_soon';
      }
    } else {
      goodQty = +(goodQty + b.quantity).toFixed(6);
    }
  }

  const totalBatchQty = +(expiredQty + expiringSoonQty + goodQty).toFixed(6);

  return {
    hasBatches: true,
    earliestExpiry: batches[0]?.expiryDate,
    status: overallStatus,
    totalBatchQty,
    expiredQty,
    expiringSoonQty,
    goodQty,
    batches,
  };
}
