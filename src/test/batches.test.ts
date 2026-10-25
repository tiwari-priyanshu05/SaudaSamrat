import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addProduct,
  recordSale,
  addBatch,
  getBatchesForProduct,
  calculateExpiryStatus,
  getDaysToExpiry,
  writeOffBatch,
  getProductExpiryOverview,
  generateBackupPayload,
  restoreShopData,
} from '../services';
import type { ProductInput } from '../types';

describe('Phase 8 — Expiry & Batch Tracking', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
    await db.batches.clear();
  });

  const baseInput: ProductInput = {
    name: 'Amul Gold Milk 500ml',
    category: 'dairy',
    quantity: 10,
    unit: 'packet',
    lowStockThreshold: 3,
  };

  describe('1. Calendar Date & Expiry Status Logic', () => {
    it('calculates days to expiry and status deterministically', () => {
      const fixedToday = new Date(2026, 4, 15); // May 15, 2026

      // Expired yesterday
      const resExpired = calculateExpiryStatus('2026-05-14', 30, fixedToday);
      expect(resExpired.status).toBe('expired');
      expect(resExpired.daysRemaining).toBe(-1);

      // Expiring today
      const resToday = calculateExpiryStatus('2026-05-15', 30, fixedToday);
      expect(resToday.status).toBe('expiring_soon');
      expect(resToday.daysRemaining).toBe(0);

      // Expiring in 10 days
      const resSoon = calculateExpiryStatus('2026-05-25', 30, fixedToday);
      expect(resSoon.status).toBe('expiring_soon');
      expect(resSoon.daysRemaining).toBe(10);

      // Fresh, good stock in 60 days
      const resGood = calculateExpiryStatus('2026-07-15', 30, fixedToday);
      expect(resGood.status).toBe('good');
      expect(resGood.daysRemaining).toBe(61);
    });

    it('remains stable across timezone offsets using UTC calculation', () => {
      const today = new Date('2026-10-24T12:00:00Z');
      const days = getDaysToExpiry('2026-10-26', today);
      expect(days).toBe(2);
    });
  });

  describe('2. Batch Addition & Overview', () => {
    it('adds batch and increases product stock atomically', async () => {
      const product = await addProduct(baseInput); // initial 10

      const batch = await addBatch({
        productId: product.id,
        batchNumber: 'B-001',
        expiryDate: '2026-11-20',
        quantity: 5,
      });

      expect(batch.batchNumber).toBe('B-001');
      expect(batch.quantity).toBe(5);

      const updatedProduct = await db.products.get(product.id);
      expect(updatedProduct?.quantity).toBe(15); // 10 + 5

      const batches = await getBatchesForProduct(product.id);
      expect(batches.length).toBe(1);
      expect(batches[0].batchNumber).toBe('B-001');
    });

    it('rejects invalid batch quantities or empty batch numbers', async () => {
      const product = await addProduct(baseInput);

      await expect(
        addBatch({
          productId: product.id,
          batchNumber: '',
          expiryDate: '2026-12-01',
          quantity: 5,
        })
      ).rejects.toThrow();

      await expect(
        addBatch({
          productId: product.id,
          batchNumber: 'B-002',
          expiryDate: 'invalid-date',
          quantity: 5,
        })
      ).rejects.toThrow();

      await expect(
        addBatch({
          productId: product.id,
          batchNumber: 'B-002',
          expiryDate: '2026-12-01',
          quantity: -3,
        })
      ).rejects.toThrow();
    });
  });

  describe('3. Strict FIFO Batch Depletion on Sale', () => {
    it('depletes the earliest expiring batch first when recording a sale', async () => {
      // Create product with 0 initial quantity, then add two batches
      const product = await addProduct({ ...baseInput, quantity: 0 });

      // Batch 1: Expiring earlier (2026-06-01), quantity: 5
      await addBatch({
        productId: product.id,
        batchNumber: 'EARLY-BATCH',
        expiryDate: '2026-06-01',
        quantity: 5,
      });

      // Batch 2: Expiring later (2026-08-01), quantity: 10
      await addBatch({
        productId: product.id,
        batchNumber: 'LATE-BATCH',
        expiryDate: '2026-08-01',
        quantity: 10,
      });

      // Product quantity is now 15
      const checkProd = await db.products.get(product.id);
      expect(checkProd?.quantity).toBe(15);

      // Sell 3 units -> should deplete 3 from EARLY-BATCH (remaining: 2)
      await recordSale({
        productId: product.id,
        quantity: 3,
      });

      let batches = await getBatchesForProduct(product.id);
      expect(batches.length).toBe(2);
      expect(batches.find((b) => b.batchNumber === 'EARLY-BATCH')?.quantity).toBe(2);
      expect(batches.find((b) => b.batchNumber === 'LATE-BATCH')?.quantity).toBe(10);

      // Sell 4 units -> depletes remaining 2 from EARLY-BATCH and 2 from LATE-BATCH
      await recordSale({
        productId: product.id,
        quantity: 4,
      });

      batches = await getBatchesForProduct(product.id);
      expect(batches.length).toBe(1); // EARLY-BATCH fully depleted and removed
      expect(batches[0].batchNumber).toBe('LATE-BATCH');
      expect(batches[0].quantity).toBe(8); // 10 - 2

      const finalProd = await db.products.get(product.id);
      expect(finalProd?.quantity).toBe(8);
    });
  });

  describe('4. Batch Write-Off & Safeguards', () => {
    it('writes off an expired batch, decreasing product stock and logging adjustment', async () => {
      const product = await addProduct({ ...baseInput, quantity: 0 });

      const batch = await addBatch({
        productId: product.id,
        batchNumber: 'EXPIRED-BATCH',
        expiryDate: '2025-01-01',
        quantity: 6,
      });

      const res = await writeOffBatch(batch.id, 'expired');
      expect(res.product.quantity).toBe(0);
      expect(res.adjustment.reason).toBe('expired');
      expect(res.adjustment.delta).toBe(-6);

      const batches = await getBatchesForProduct(product.id);
      expect(batches.length).toBe(0);
    });

    it('summarizes expiry overview with expired quantity', async () => {
      const product = await addProduct({ ...baseInput, quantity: 0 });

      await addBatch({
        productId: product.id,
        batchNumber: 'EXP-1',
        expiryDate: '2020-01-01', // long expired
        quantity: 4,
      });

      await addBatch({
        productId: product.id,
        batchNumber: 'FRESH-1',
        expiryDate: '2099-01-01', // far future
        quantity: 10,
      });

      const overview = await getProductExpiryOverview(product.id);
      expect(overview.hasBatches).toBe(true);
      expect(overview.status).toBe('expired');
      expect(overview.expiredQty).toBe(4);
      expect(overview.goodQty).toBe(10);
    });
  });

  describe('5. Backup & Restore Persistence', () => {
    it('preserves all batches across backup export and transactional restore', async () => {
      const product = await addProduct({ ...baseInput, quantity: 0 });

      await addBatch({
        productId: product.id,
        batchNumber: 'BACKUP-BATCH',
        expiryDate: '2027-05-10',
        quantity: 12,
      });

      const payload = await generateBackupPayload();
      expect(payload.data.batches?.length).toBe(1);

      await db.products.clear();
      await db.batches.clear();

      const result = await restoreShopData(payload, 'replace');
      expect(result.restoredCounts.batches).toBe(1);

      const restoredBatches = await getBatchesForProduct(product.id);
      expect(restoredBatches.length).toBe(1);
      expect(restoredBatches[0].batchNumber).toBe('BACKUP-BATCH');
      expect(restoredBatches[0].quantity).toBe(12);
    });
  });
});
