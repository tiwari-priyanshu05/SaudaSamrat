// =============================================================================
// SaudaSamrat — Bulk Stock Receiving Service
// Atomic multi-product stock receiving with validation and movement history.
// =============================================================================

import { db } from '../db';
import { nanoid } from './nanoid';
import {
  createAppError,
  type BulkReceiveInput,
  type BulkReceiveResult,
  type Product,
  type StockAdjustment,
} from '../types';

/**
 * Atomically receives multiple stock items into the store inventory.
 * Validates non-zero positive quantities, product existence, and active status.
 */
export async function bulkReceiveStock(
  input: BulkReceiveInput,
): Promise<BulkReceiveResult> {
  if (!input || !Array.isArray(input.items) || input.items.length === 0) {
    throw createAppError(
      'INVALID_QUANTITY',
      'At least one item must be selected for stock receiving',
    );
  }

  // Aggregate quantities by product ID to prevent partial or duplicate conflicting updates
  const aggregated = new Map<string, number>();
  for (const item of input.items) {
    if (!item.productId || typeof item.productId !== 'string') {
      throw createAppError('PRODUCT_NOT_FOUND', 'Product ID is required');
    }
    const qty = typeof item.quantity === 'number' ? item.quantity : Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw createAppError(
        'INVALID_QUANTITY',
        'Received quantity must be a positive number',
      );
    }
    aggregated.set(item.productId, +( (aggregated.get(item.productId) ?? 0) + qty ).toFixed(6));
  }

  const updatedProducts: Product[] = [];
  const adjustments: StockAdjustment[] = [];
  const timestamp = Date.now();
  const note = input.note?.trim() || 'Bulk stock receiving';

  await db.transaction('rw', db.products, db.stockAdjustments, async () => {
    for (const [productId, receivedQty] of aggregated.entries()) {
      const product = await db.products.get(productId);
      if (!product) {
        throw createAppError(
          'PRODUCT_NOT_FOUND',
          `Product ${productId} was not found`,
        );
      }

      if (product.status === 'archived') {
        throw createAppError(
          'PRODUCT_ARCHIVED',
          `Cannot receive stock for archived product "${product.name}"`,
        );
      }

      const newQty = +(product.quantity + receivedQty).toFixed(6);

      const updated: Product = {
        ...product,
        quantity: newQty,
        updatedAt: timestamp,
      };

      const adjustment: StockAdjustment = {
        id: nanoid(),
        productId: product.id,
        delta: receivedQty,
        reason: 'restock',
        note,
        adjustedAt: timestamp,
      };

      updatedProducts.push(updated);
      adjustments.push(adjustment);

      await db.products.put(updated);
      await db.stockAdjustments.add(adjustment);
    }
  });

  return {
    success: true,
    updatedProducts,
    adjustments,
    totalItemsReceived: updatedProducts.length,
    timestamp,
  };
}
