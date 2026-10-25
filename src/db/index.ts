import Dexie, { type Table } from 'dexie';
import type { Product, Sale, StockAdjustment, ShopProfile, ProductBatch } from '../types';

// =============================================================================
// SaudaSamrat — Dexie Database Definition
// Schema version history must be maintained here.
// =============================================================================

class SaudaSamratDB extends Dexie {
  products!: Table<Product, string>;
  sales!: Table<Sale, string>;
  stockAdjustments!: Table<StockAdjustment, string>;
  profile!: Table<ShopProfile, string>;
  batches!: Table<ProductBatch, string>;

  constructor() {
    super('SaudaSamratDB');

    // Version 1 — initial schema
    this.version(1).stores({
      products: 'id, name, category, status, updatedAt',
      sales: 'id, productId, soldAt',
      stockAdjustments: 'id, productId, adjustedAt',
    });

    // Version 2 — persistent shop owner profile
    this.version(2).stores({
      profile: 'id',
    });

    // Version 3 — stock movement history & reversal indices
    this.version(3).stores({
      stockAdjustments: 'id, productId, adjustedAt, reversedAdjustmentId, reversedSaleId',
    });

    // Version 4 — barcode indexed product lookup
    this.version(4).stores({
      products: 'id, name, category, status, barcode, updatedAt',
    });

    // Version 5 — product batches with expiry dates
    this.version(5).stores({
      batches: 'id, productId, batchNumber, expiryDate, quantity',
    });
  }
}

export const db = new SaudaSamratDB();

// Ensure the database opens cleanly on startup.
// Components should not call db.open() directly.
export async function initDB(): Promise<void> {
  try {
    await db.open();
  } catch (err) {
    console.error('[SaudaSamrat] Failed to open IndexedDB:', err);
    throw err;
  }
}
