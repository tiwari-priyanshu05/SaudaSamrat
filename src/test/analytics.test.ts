import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addProduct,
  recordSale,
  adjustStock,
  undoSale,
  getDailySummary,
} from '../services';

describe('Phase 6 — Daily Summary & Sales Trends Integration Tests', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
  });

  describe('1. Daily Overview Metrics Calculation', () => {
    it('accurately computes daily sales transactions, unit breakdown, and top products', async () => {
      const p1 = await addProduct({
        name: 'Amul Butter 100g',
        quantity: 50,
        unit: 'packet',
        lowStockThreshold: 10,
      });

      const p2 = await addProduct({
        name: 'Madhur Sugar',
        quantity: 30,
        unit: 'kg',
        lowStockThreshold: 5,
      });

      // Record 2 sales for p1
      await recordSale({ productId: p1.id, quantity: 4 });
      await recordSale({ productId: p1.id, quantity: 6 });

      // Record 1 sale for p2
      await recordSale({ productId: p2.id, quantity: 2.5 });

      // Record 1 restock
      await adjustStock({ productId: p1.id, delta: 20, reason: 'restock' });

      const summary = await getDailySummary();

      expect(summary.salesTransactionCount).toBe(3);

      // Verify unit breakdown
      const packetSummary = summary.unitsSold.find((u) => u.unit === 'packet');
      expect(packetSummary?.totalQuantity).toBe(10); // 4 + 6

      const kgSummary = summary.unitsSold.find((u) => u.unit === 'kg');
      expect(kgSummary?.totalQuantity).toBe(2.5);

      // Verify top products
      expect(summary.topSoldProducts.length).toBe(2);
      expect(summary.topSoldProducts[0].productName).toBe('Amul Butter 100g');
      expect(summary.topSoldProducts[0].quantity).toBe(10);
      expect(summary.topSoldProducts[0].transactionCount).toBe(2);

      // Verify restocks
      expect(summary.restockTransactionsCount).toBe(1);
    });

    it('excludes reversed sales from daily summary counts and unit totals', async () => {
      const p = await addProduct({
        name: 'Tata Tea 250g',
        quantity: 20,
        unit: 'packet',
        lowStockThreshold: 4,
      });

      await recordSale({ productId: p.id, quantity: 3 });
      const { sale: cancelledSale } = await recordSale({ productId: p.id, quantity: 2 });

      // Undo the second sale
      await undoSale(cancelledSale.id);

      const summary = await getDailySummary();

      // Only 1 active sale should be reported
      expect(summary.salesTransactionCount).toBe(1);

      const packetSold = summary.unitsSold.find((u) => u.unit === 'packet');
      expect(packetSold?.totalQuantity).toBe(3); // 2 was returned
    });

    it('computes comparison with yesterday transactions accurately', async () => {
      const p = await addProduct({
        name: 'Parle-G',
        quantity: 50,
        unit: 'packet',
        lowStockThreshold: 5,
      });

      // Backdate 2 sales to yesterday
      const yesterdayMs = Date.now() - 24 * 60 * 60 * 1000;
      await db.sales.add({
        id: 'sale-yest-1',
        productId: p.id,
        productName: p.name,
        quantity: 2,
        unit: p.unit,
        soldAt: yesterdayMs,
      });
      await db.sales.add({
        id: 'sale-yest-2',
        productId: p.id,
        productName: p.name,
        quantity: 3,
        unit: p.unit,
        soldAt: yesterdayMs,
      });

      // Today: 3 sales
      await recordSale({ productId: p.id, quantity: 1 });
      await recordSale({ productId: p.id, quantity: 1 });
      await recordSale({ productId: p.id, quantity: 1 });

      const summary = await getDailySummary();

      expect(summary.previousDayComparison.hasPreviousData).toBe(true);
      expect(summary.previousDayComparison.yesterdayTransactionCount).toBe(2);
      expect(summary.previousDayComparison.salesCountDelta).toBe(1); // 3 today - 2 yesterday = +1
    });
  });
});
