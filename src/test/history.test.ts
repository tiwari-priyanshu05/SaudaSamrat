import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addProduct,
  recordSale,
  adjustStock,
  archiveProduct,
  getStockMovements,
  undoSale,
  undoStockAdjustment,
  undoMovement,
  getProductById,
} from '../services';

describe('Phase 2 — Stock Movement History & Safe Undo Integration Tests', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
  });

  describe('1. Movement Ledger Aggregation', () => {
    it('aggregates sales and stock adjustments in reverse chronological order', async () => {
      const p = await addProduct({
        name: 'Amul Taaza Milk 500ml',
        quantity: 20,
        unit: 'packet',
        lowStockThreshold: 5,
      });

      // 1. Adjustment
      await adjustStock({
        productId: p.id,
        delta: 10,
        reason: 'restock',
        note: 'Morning delivery',
      });

      // 2. Sale
      await recordSale({
        productId: p.id,
        quantity: 4,
      });

      const movements = await getStockMovements();
      expect(movements.length).toBe(2);

      // Latest first (Sale was recorded after Restock)
      expect(movements[0].type).toBe('sale');
      expect(movements[0].delta).toBe(-4);
      expect(movements[0].productName).toBe('Amul Taaza Milk 500ml');
      expect(movements[0].canUndo).toBe(true);

      expect(movements[1].type).toBe('restock');
      expect(movements[1].delta).toBe(10);
      expect(movements[1].note).toBe('Morning delivery');
      expect(movements[1].canUndo).toBe(true);
    });

    it('filters movements by product ID', async () => {
      const p1 = await addProduct({ name: 'Product A', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      const p2 = await addProduct({ name: 'Product B', quantity: 10, unit: 'packet', lowStockThreshold: 2 });

      await recordSale({ productId: p1.id, quantity: 2 });
      await recordSale({ productId: p2.id, quantity: 3 });

      const p1Movements = await getStockMovements({ productId: p1.id });
      expect(p1Movements.length).toBe(1);
      expect(p1Movements[0].productName).toBe('Product A');
    });

    it('preserves history when a product is archived', async () => {
      const p = await addProduct({ name: 'Seasonal Sweets', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      await recordSale({ productId: p.id, quantity: 2 });
      await archiveProduct(p.id);

      const movements = await getStockMovements();
      expect(movements.length).toBe(1);
      expect(movements[0].productName).toBe('Seasonal Sweets');
    });
  });

  describe('2. Safe Undo of Sales', () => {
    it('returns sold stock to inventory and adds an audit return adjustment atomically', async () => {
      const p = await addProduct({
        name: 'Dettol Soap 75g',
        quantity: 10,
        unit: 'piece',
        lowStockThreshold: 2,
      });

      const { sale } = await recordSale({
        productId: p.id,
        quantity: 3,
      });

      // Stock should now be 7
      let current = await getProductById(p.id);
      expect(current.quantity).toBe(7);

      // Undo the sale
      const { product: updated, reversal } = await undoSale(sale.id, 'Wrong item scanned by error');

      expect(updated.quantity).toBe(10);
      expect(reversal.delta).toBe(3);
      expect(reversal.reason).toBe('return');
      expect(reversal.reversedSaleId).toBe(sale.id);

      // Verify the original sale was preserved in DB (not deleted)
      const salesInDb = await db.sales.toArray();
      expect(salesInDb.length).toBe(1);
      expect(salesInDb[0].id).toBe(sale.id);

      // Verify movement timeline now marks sale as reversed and ineligible for double undo
      const movements = await getStockMovements();
      const saleMov = movements.find((m) => m.sourceId === sale.id);
      expect(saleMov?.isReversed).toBe(true);
      expect(saleMov?.canUndo).toBe(false);
    });

    it('rejects duplicate reversal attempts on the same sale', async () => {
      const p = await addProduct({
        name: 'Good Day Butter 100g',
        quantity: 15,
        unit: 'packet',
        lowStockThreshold: 3,
      });

      const { sale } = await recordSale({
        productId: p.id,
        quantity: 2,
      });

      // First undo succeeds
      await undoSale(sale.id);

      // Second undo MUST fail
      await expect(undoSale(sale.id)).rejects.toThrow(/already been reversed/i);
    });
  });

  describe('3. Safe Undo of Stock Adjustments', () => {
    it('safely reverses a restock adjustment', async () => {
      const p = await addProduct({
        name: 'Tata Salt 1kg',
        quantity: 10,
        unit: 'packet',
        lowStockThreshold: 2,
      });

      const { adjustment } = await adjustStock({
        productId: p.id,
        delta: 20,
        reason: 'restock',
      });

      // Stock is 30
      expect((await getProductById(p.id)).quantity).toBe(30);

      // Undo restock
      const { product: updated, reversal } = await undoStockAdjustment(adjustment.id);

      // Stock back to 10
      expect(updated.quantity).toBe(10);
      expect(reversal.delta).toBe(-20);
      expect(reversal.reason).toBe('reversal');
      expect(reversal.reversedAdjustmentId).toBe(adjustment.id);

      // Cannot undo the reversal itself
      await expect(undoStockAdjustment(reversal.id)).rejects.toThrow(/cannot undo a reversal/i);
    });

    it('rejects reversal if remaining inventory is insufficient', async () => {
      const p = await addProduct({
        name: 'Chana 1kg',
        quantity: 5,
        unit: 'kg',
        lowStockThreshold: 2,
      });

      // Restock +10 -> total 15
      const { adjustment } = await adjustStock({
        productId: p.id,
        delta: 10,
        reason: 'restock',
      });

      // Sell 12 -> remaining 3
      await recordSale({
        productId: p.id,
        quantity: 12,
      });

      // Attempting to undo the +10 restock would require subtracting 10 from 3 -> negative!
      await expect(undoStockAdjustment(adjustment.id)).rejects.toThrow(/insufficient stock|reduce current stock/i);

      // Inventory remains unchanged at 3
      const current = await getProductById(p.id);
      expect(current.quantity).toBe(3);
    });

    it('works seamlessly through undoMovement dispatcher', async () => {
      const p = await addProduct({
        name: 'Kissan Jam 200g',
        quantity: 8,
        unit: 'bottle',
        lowStockThreshold: 2,
      });

      await recordSale({
        productId: p.id,
        quantity: 2,
      });

      const movements = await getStockMovements();
      const saleMov = movements[0];

      const { product: updated } = await undoMovement(saleMov);
      expect(updated.quantity).toBe(8);
    });
  });
});
