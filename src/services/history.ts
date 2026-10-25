// =============================================================================
// SaudaSamrat — Stock Movement History & Safe Undo Service
// Provides atomic movement history tracking and reversible operations.
// =============================================================================

import { db } from '../db';
import { nanoid } from './nanoid';
import {
  createAppError,
  type StockMovement,
  type StockAdjustment,
  type Product,
  type MovementType,
} from '../types';

/**
 * Retrieves a unified, chronological ledger of all inventory movements
 * combining sales, restocks, manual corrections, damages, returns, and reversals.
 */
export async function getStockMovements(options?: {
  productId?: string;
  limit?: number;
  type?: MovementType;
}): Promise<StockMovement[]> {
  const [sales, adjustments, allProducts] = await Promise.all([
    options?.productId
      ? db.sales.where('productId').equals(options.productId).toArray()
      : db.sales.toArray(),
    options?.productId
      ? db.stockAdjustments.where('productId').equals(options.productId).toArray()
      : db.stockAdjustments.toArray(),
    db.products.toArray(),
  ]);

  // Index products for fast name and unit lookup
  const productMap = new Map<string, Product>();
  for (const p of allProducts) {
    productMap.set(p.id, p);
  }

  // Set of reversed sale IDs and reversed adjustment IDs
  const reversedSaleIds = new Set<string>();
  const reversedAdjustmentIds = new Set<string>();

  for (const adj of adjustments) {
    if (adj.reversedSaleId) {
      reversedSaleIds.add(adj.reversedSaleId);
    }
    if (adj.reversedAdjustmentId) {
      reversedAdjustmentIds.add(adj.reversedAdjustmentId);
    }
  }

  const movements: StockMovement[] = [];

  // Map Sales
  for (const s of sales) {
    const isReversed = reversedSaleIds.has(s.id);
    const prod = productMap.get(s.productId);
    movements.push({
      id: `mov-sale-${s.id}`,
      type: 'sale',
      productId: s.productId,
      productName: s.productName || prod?.name || 'Unknown Item',
      delta: -s.quantity,
      unit: s.unit || prod?.unit || 'piece',
      timestamp: s.soldAt,
      canUndo: !isReversed,
      isReversed,
      sourceType: 'sale',
      sourceId: s.id,
    });
  }

  // Map Stock Adjustments
  for (const adj of adjustments) {
    const isReversed = reversedAdjustmentIds.has(adj.id);
    const prod = productMap.get(adj.productId);
    const type: MovementType = adj.reason === 'reversal' ? 'reversal' : adj.reason;
    const canUndo = !adj.isReversal && !isReversed;

    movements.push({
      id: `mov-adj-${adj.id}`,
      type,
      productId: adj.productId,
      productName: prod?.name || 'Unknown Item',
      delta: adj.delta,
      unit: prod?.unit || 'piece',
      timestamp: adj.adjustedAt,
      reason: adj.reason,
      note: adj.note,
      canUndo,
      isReversed,
      sourceType: 'adjustment',
      sourceId: adj.id,
    });
  }

  // Sort descending by timestamp
  movements.sort((a, b) => b.timestamp - a.timestamp);

  // Apply optional filtering
  let filtered = movements;
  if (options?.type) {
    filtered = filtered.filter((m) => m.type === options.type);
  }

  if (options?.limit && options.limit > 0) {
    return filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Safely undos an eligible StockAdjustment by logging an atomic compensating reversal record.
 * Validates that available stock will not drop below zero upon reversal.
 */
export async function undoStockAdjustment(
  adjustmentId: string,
  reasonNote?: string,
): Promise<{ product: Product; reversal: StockAdjustment }> {
  let updatedProduct: Product;
  let reversalAdjustment: StockAdjustment;

  await db.transaction('rw', db.products, db.stockAdjustments, async () => {
    const original = await db.stockAdjustments.get(adjustmentId);
    if (!original) {
      throw createAppError('PRODUCT_NOT_FOUND', `Stock adjustment ${adjustmentId} not found`);
    }

    if (original.isReversal || original.reason === 'reversal') {
      throw createAppError(
        'OPERATION_NOT_ELIGIBLE',
        'Cannot undo a reversal transaction',
      );
    }

    // Guard against duplicate reversals
    const alreadyReversed = await db.stockAdjustments
      .filter((a) => a.reversedAdjustmentId === adjustmentId)
      .first();
    if (alreadyReversed) {
      throw createAppError(
        'ALREADY_REVERSED',
        'This adjustment has already been reversed',
      );
    }

    const product = await db.products.get(original.productId);
    if (!product) {
      throw createAppError(
        'PRODUCT_NOT_FOUND',
        `Product for adjustment ${adjustmentId} was not found`,
      );
    }

    // Inverse delta
    const compensatingDelta = -original.delta;
    const newQty = +(product.quantity + compensatingDelta).toFixed(6);

    if (newQty < 0) {
      throw createAppError(
        'INSUFFICIENT_STOCK',
        `Cannot undo this adjustment. It would reduce current stock (${product.quantity} ${product.unit}) to ${newQty}`,
      );
    }

    const note = reasonNote?.trim()
      ? reasonNote.trim()
      : `Reversal of adjustment #${adjustmentId.slice(0, 8)}`;

    reversalAdjustment = {
      id: nanoid(),
      productId: product.id,
      delta: compensatingDelta,
      reason: 'reversal',
      note,
      adjustedAt: Date.now(),
      reversedAdjustmentId: original.id,
      isReversal: true,
    };

    updatedProduct = {
      ...product,
      quantity: newQty,
      updatedAt: Date.now(),
    };

    await db.products.put(updatedProduct);
    await db.stockAdjustments.add(reversalAdjustment);
  });

  return { product: updatedProduct!, reversal: reversalAdjustment! };
}

/**
 * Safely undos an eligible Sale by returning sold items to store inventory
 * and recording an atomic compensating reversal in the stock adjustments ledger.
 */
export async function undoSale(
  saleId: string,
  reasonNote?: string,
): Promise<{ product: Product; reversal: StockAdjustment }> {
  let updatedProduct: Product;
  let reversalAdjustment: StockAdjustment;

  await db.transaction('rw', db.products, db.sales, db.stockAdjustments, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale) {
      throw createAppError('PRODUCT_NOT_FOUND', `Sale ${saleId} not found`);
    }

    // Guard against duplicate reversals
    const alreadyReversed = await db.stockAdjustments
      .filter((a) => a.reversedSaleId === saleId)
      .first();
    if (alreadyReversed) {
      throw createAppError(
        'ALREADY_REVERSED',
        'This sale has already been reversed',
      );
    }

    const product = await db.products.get(sale.productId);
    if (!product) {
      throw createAppError(
        'PRODUCT_NOT_FOUND',
        `Product ${sale.productId} not found`,
      );
    }

    const newQty = +(product.quantity + sale.quantity).toFixed(6);

    const note = reasonNote?.trim()
      ? reasonNote.trim()
      : `Customer return / sale reversal for ${sale.productName}`;

    reversalAdjustment = {
      id: nanoid(),
      productId: product.id,
      delta: sale.quantity,
      reason: 'return',
      note,
      adjustedAt: Date.now(),
      reversedSaleId: sale.id,
      isReversal: true,
    };

    updatedProduct = {
      ...product,
      quantity: newQty,
      updatedAt: Date.now(),
    };

    await db.products.put(updatedProduct);
    await db.stockAdjustments.add(reversalAdjustment);
  });

  return { product: updatedProduct!, reversal: reversalAdjustment! };
}

/**
 * Dispatches an undo action based on movement sourceType ('sale' | 'adjustment').
 */
export async function undoMovement(
  movement: StockMovement,
  reasonNote?: string,
): Promise<{ product: Product; reversal: StockAdjustment }> {
  if (!movement.canUndo || movement.isReversed) {
    throw createAppError(
      'OPERATION_NOT_ELIGIBLE',
      'This movement cannot be reversed',
    );
  }

  if (movement.sourceType === 'sale') {
    return undoSale(movement.sourceId, reasonNote);
  } else {
    return undoStockAdjustment(movement.sourceId, reasonNote);
  }
}
