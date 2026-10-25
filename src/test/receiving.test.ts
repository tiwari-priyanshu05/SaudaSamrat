import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addProduct,
  archiveProduct,
  bulkReceiveStock,
  getProductById,
  getStockMovements,
} from '../services';

describe('Phase 3 — Bulk Stock Receiving Integration Tests', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
  });

  describe('1. Normal Atomic Receiving Operations', () => {
    it('receives stock for multiple products atomically with correct deltas', async () => {
      const p1 = await addProduct({
        name: 'Madhur Sugar 1kg',
        quantity: 10,
        unit: 'packet',
        lowStockThreshold: 3,
      });

      const p2 = await addProduct({
        name: 'Fortune Sunflower Oil 1L',
        quantity: 5,
        unit: 'bottle',
        lowStockThreshold: 2,
      });

      const result = await bulkReceiveStock({
        items: [
          { productId: p1.id, quantity: 20 },
          { productId: p2.id, quantity: 15 },
        ],
        note: 'Wholesale Mandi Invoice #5821',
      });

      expect(result.success).toBe(true);
      expect(result.totalItemsReceived).toBe(2);

      // Verify updated quantities
      const updatedP1 = await getProductById(p1.id);
      expect(updatedP1.quantity).toBe(30); // 10 + 20

      const updatedP2 = await getProductById(p2.id);
      expect(updatedP2.quantity).toBe(20); // 5 + 15

      // Verify audit adjustment records
      const adjustments = await db.stockAdjustments.toArray();
      expect(adjustments.length).toBe(2);
      expect(adjustments.every((a) => a.reason === 'restock')).toBe(true);
      expect(adjustments.every((a) => a.note === 'Wholesale Mandi Invoice #5821')).toBe(true);

      // Verify movement timeline
      const movements = await getStockMovements();
      expect(movements.length).toBe(2);
      expect(movements.every((m) => m.type === 'restock')).toBe(true);
    });

    it('handles decimal and fractional quantities accurately', async () => {
      const p = await addProduct({
        name: 'Loose Wheat Flour',
        quantity: 12.25,
        unit: 'kg',
        lowStockThreshold: 5,
      });

      await bulkReceiveStock({
        items: [{ productId: p.id, quantity: 37.75 }],
      });

      const updated = await getProductById(p.id);
      expect(updated.quantity).toBe(50); // 12.25 + 37.75
    });

    it('aggregates repeated entries for the same product in a single receiving batch', async () => {
      const p = await addProduct({
        name: 'Tata Tea 250g',
        quantity: 4,
        unit: 'packet',
        lowStockThreshold: 2,
      });

      await bulkReceiveStock({
        items: [
          { productId: p.id, quantity: 6 },
          { productId: p.id, quantity: 4 },
        ],
      });

      const updated = await getProductById(p.id);
      expect(updated.quantity).toBe(14); // 4 + 6 + 4
    });
  });

  describe('2. Validation & Atomic Rollback Guards', () => {
    it('rejects empty items array', async () => {
      await expect(bulkReceiveStock({ items: [] })).rejects.toThrow(
        /at least one item/i,
      );
    });

    it('rejects zero or negative quantities', async () => {
      const p = await addProduct({
        name: 'Maggi Noodles',
        quantity: 10,
        unit: 'packet',
        lowStockThreshold: 2,
      });

      await expect(
        bulkReceiveStock({
          items: [{ productId: p.id, quantity: 0 }],
        }),
      ).rejects.toThrow(/positive number/i);

      await expect(
        bulkReceiveStock({
          items: [{ productId: p.id, quantity: -5 }],
        }),
      ).rejects.toThrow(/positive number/i);

      // Verify stock remained unchanged
      const current = await getProductById(p.id);
      expect(current.quantity).toBe(10);
    });

    it('rolls back all changes if any single item in the batch fails', async () => {
      const pGood = await addProduct({
        name: 'Good Item',
        quantity: 10,
        unit: 'packet',
        lowStockThreshold: 2,
      });

      const pArchived = await addProduct({
        name: 'Archived Item',
        quantity: 5,
        unit: 'packet',
        lowStockThreshold: 1,
      });
      await archiveProduct(pArchived.id);

      // Attempt receiving both
      await expect(
        bulkReceiveStock({
          items: [
            { productId: pGood.id, quantity: 20 },
            { productId: pArchived.id, quantity: 10 },
          ],
        }),
      ).rejects.toThrow(/archived/i);

      // Verify pGood was NOT modified (all-or-nothing rollback)
      const currentGood = await getProductById(pGood.id);
      expect(currentGood.quantity).toBe(10);

      // No adjustments were created
      const adjustments = await db.stockAdjustments.toArray();
      expect(adjustments.length).toBe(0);
    });
  });
});
