import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addProduct,
  getSmartReorderRecommendations,
  dismissReorderRecommendation,
  restoreDismissedReorder,
  clearDismissedReorders,
  formatWhatsAppOrderMessage,
} from '../services';
import type { SupplierOrderList } from '../types';

describe('Phases 4 & 5 — Smart Reorder & Supplier Order Integration Tests', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
    clearDismissedReorders();
  });

  describe('1. Smart Reorder Formulas & Velocity Recommendations', () => {
    it('calculates target coverage and suggested quantity based on sales velocity', async () => {
      // Product with 5 packets left, threshold is 10
      const p = await addProduct({
        name: 'Madhur Sugar 1kg',
        quantity: 5,
        unit: 'packet',
        lowStockThreshold: 10,
      });

      // Backdate product creation date so history is considered sufficient
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
      await db.products.update(p.id, { createdAt: tenDaysAgo });

      // Record 14 sales of 2 packets each over last 14 days = 28 packets sold
      // 28 / 14 = 2 packets / day
      await db.sales.add({
        id: 'sale-recent-1',
        productId: p.id,
        productName: p.name,
        quantity: 28,
        unit: p.unit,
        soldAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      });

      const recommendations = await getSmartReorderRecommendations({
        lookbackDays: 14,
        targetDays: 7,
      });

      expect(recommendations.length).toBe(1);
      const rec = recommendations[0];

      expect(rec.product.name).toBe('Madhur Sugar 1kg');
      expect(rec.averageDailySales).toBe(2); // 28 / 14 = 2.0
      expect(rec.daysOfStockRemaining).toBe(2.5); // 5 / 2 = 2.5 days left
      expect(rec.hasSufficientHistory).toBe(true);

      // Target coverage for 7 days: 2 * 7 = 14 packets.
      // Current stock is 5.
      // Suggested order: 14 - 5 = 9 packets.
      expect(rec.suggestedOrderQuantity).toBe(9);
      expect(rec.classification).toBe('low_stock');
    });

    it('flags products newer than 3 days as accumulating history', async () => {
      await addProduct({
        name: 'Brand New Biscuit',
        quantity: 1,
        unit: 'packet',
        lowStockThreshold: 5,
      });

      const recommendations = await getSmartReorderRecommendations({ lookbackDays: 14 });
      expect(recommendations.length).toBe(1);
      expect(recommendations[0].hasSufficientHistory).toBe(false);
    });

    it('recommends deficit for products with zero sales that are below threshold', async () => {
      await addProduct({
        name: 'Slow Spices 100g',
        quantity: 2,
        unit: 'packet',
        lowStockThreshold: 8,
      });

      const recommendations = await getSmartReorderRecommendations({ lookbackDays: 14 });
      expect(recommendations.length).toBe(1);
      expect(recommendations[0].daysOfStockRemaining).toBeNull();
      expect(recommendations[0].suggestedOrderQuantity).toBe(6); // 8 - 2 = 6
    });

    it('prioritizes zero-stock products at top of recommendation list', async () => {
      await addProduct({ name: 'Empty Stock Product', quantity: 0, unit: 'packet', lowStockThreshold: 5 });
      await addProduct({ name: 'Low Stock Product', quantity: 2, unit: 'packet', lowStockThreshold: 5 });

      const recommendations = await getSmartReorderRecommendations({ lookbackDays: 14 });
      expect(recommendations.length).toBe(2);
      expect(recommendations[0].product.name).toBe('Empty Stock Product');
    });
  });

  describe('2. Dismissal & Restoration Workflow', () => {
    it('dismisses a recommendation and restores it when requested', async () => {
      const p = await addProduct({
        name: 'Dismissable Item',
        quantity: 1,
        unit: 'packet',
        lowStockThreshold: 5,
      });

      // Initially present
      let recs = await getSmartReorderRecommendations();
      expect(recs.length).toBe(1);

      // Dismiss
      dismissReorderRecommendation(p.id);

      // Now hidden from default query
      recs = await getSmartReorderRecommendations();
      expect(recs.length).toBe(0);

      // Visible if includeDismissed is true
      recs = await getSmartReorderRecommendations({ includeDismissed: true });
      expect(recs.length).toBe(1);
      expect(recs[0].isDismissed).toBe(true);

      // Restore
      restoreDismissedReorder(p.id);
      recs = await getSmartReorderRecommendations();
      expect(recs.length).toBe(1);
    });
  });

  describe('3. Supplier Order List & WhatsApp Message Formatting (Phase 5)', () => {
    it('formats a clean, localized WhatsApp order message and encoded link', () => {
      const orderList: SupplierOrderList = {
        id: 'order-123',
        supplierName: 'Gupta Wholesale Mandi',
        items: [
          { productId: '1', productName: 'Tata Salt 1kg', quantity: 25, unit: 'packet' },
          { productId: '2', productName: 'Fortune Sunflower Oil 1L', quantity: 12, unit: 'bottle' },
        ],
        createdAt: 1774320000000,
        notes: 'Please dispatch before 10 AM',
      };

      const { rawMessage, encodedUrl } = formatWhatsAppOrderMessage(
        orderList,
        'Shri Ram Kirana Store',
        'en',
      );

      expect(rawMessage).toContain('WHOLESALE REORDER LIST');
      expect(rawMessage).toContain('Shri Ram Kirana Store');
      expect(rawMessage).toContain('Gupta Wholesale Mandi');
      expect(rawMessage).toContain('1. *Tata Salt 1kg* — 25 packet');
      expect(rawMessage).toContain('2. *Fortune Sunflower Oil 1L* — 12 bottle');
      expect(rawMessage).toContain('Please dispatch before 10 AM');

      // Valid WhatsApp URL scheme
      expect(encodedUrl.startsWith('https://wa.me/?text=')).toBe(true);
      expect(encodedUrl).toContain(encodeURIComponent('Tata Salt 1kg'));
    });
  });
});
