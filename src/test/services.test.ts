import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addProduct,
  updateProduct,
  archiveProduct,
  adjustStock,
  recordSale,
  getProducts,
  getAllProducts,
  getLowStockProducts,
  getSlowMovingProducts,
  getSales,
} from '../services';

describe('SaudaSamrat Services Integration Tests', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
    await db.profile.clear();
  });

  describe('Product Management', () => {
    it('creates a new product successfully', async () => {
      const p = await addProduct({
        name: 'Tata Salt 1kg',
        quantity: 20,
        unit: 'packet',
        lowStockThreshold: 5,
        category: 'Spices & Condiments',
      });

      expect(p.id).toBeDefined();
      expect(p.name).toBe('Tata Salt 1kg');
      expect(p.quantity).toBe(20);
      expect(p.unit).toBe('packet');
      expect(p.lowStockThreshold).toBe(5);
      expect(p.status).toBe('active');

      const all = await getProducts();
      expect(all.length).toBe(1);
    });

    it('rejects duplicate product names (case-insensitive & trimmed)', async () => {
      await addProduct({
        name: 'Sugar 1kg',
        quantity: 10,
        unit: 'kg',
        lowStockThreshold: 2,
      });

      await expect(
        addProduct({
          name: '  sugar 1kg  ',
          quantity: 5,
          unit: 'kg',
          lowStockThreshold: 1,
        }),
      ).rejects.toThrow();
    });

    it('updates an existing product', async () => {
      const p = await addProduct({
        name: 'Parle-G Biscuit',
        quantity: 50,
        unit: 'packet',
        lowStockThreshold: 10,
      });

      const updated = await updateProduct(p.id, {
        name: 'Parle-G Gold Biscuit',
        lowStockThreshold: 15,
      });

      expect(updated.name).toBe('Parle-G Gold Biscuit');
      expect(updated.lowStockThreshold).toBe(15);
      expect(updated.quantity).toBe(50);
    });

    it('archives a product so it is excluded from active queries', async () => {
      const p = await addProduct({
        name: 'Maggi 2-Minute Noodles',
        quantity: 30,
        unit: 'packet',
        lowStockThreshold: 5,
      });

      await archiveProduct(p.id);

      const active = await getProducts();
      expect(active.length).toBe(0);

      const all = await getAllProducts();
      expect(all.length).toBe(1);
      expect(all[0].status).toBe('archived');
    });
  });

  describe('Stock Adjustments', () => {
    it('records an audit trail when stock is adjusted', async () => {
      const p = await addProduct({
        name: 'Aashirvaad Atta 5kg',
        quantity: 10,
        unit: 'packet',
        lowStockThreshold: 3,
      });

      const result = await adjustStock({
        productId: p.id,
        delta: 5,
        reason: 'restock',
        note: 'Direct from wholesale mandi',
      });

      expect(result.product.quantity).toBe(15);
      expect(result.adjustment.delta).toBe(5);
      expect(result.adjustment.reason).toBe('restock');

      // Verify audit table entry
      const records = await db.stockAdjustments.where('productId').equals(p.id).toArray();
      expect(records.length).toBe(1);
      expect(records[0].delta).toBe(5);
      expect(records[0].note).toBe('Direct from wholesale mandi');
    });
  });

  describe('Sale Recording & Inventory Decrement', () => {
    it('decrements stock atomically on valid sale', async () => {
      const p = await addProduct({
        name: 'Amul Butter 100g',
        quantity: 12,
        unit: 'packet',
        lowStockThreshold: 3,
      });

      const saleResult = await recordSale({
        productId: p.id,
        quantity: 4,
      });

      expect(saleResult.sale.quantity).toBe(4);
      expect(saleResult.product.quantity).toBe(8);

      const salesList = await getSales();
      expect(salesList.length).toBe(1);
      expect(salesList[0].productName).toBe('Amul Butter 100g');
    });

    it('rejects sale when requested quantity exceeds available stock', async () => {
      const p = await addProduct({
        name: 'Chana Dal 1kg',
        quantity: 2,
        unit: 'kg',
        lowStockThreshold: 1,
      });

      await expect(
        recordSale({
          productId: p.id,
          quantity: 5,
        }),
      ).rejects.toThrow();

      // Ensure stock remained unchanged
      const current = await db.products.get(p.id);
      expect(current?.quantity).toBe(2);
    });
  });

  describe('Reorder & Intelligence Queries', () => {
    it('accurately identifies low stock items and deficit', async () => {
      await addProduct({
        name: 'Fortune Mustard Oil 1L',
        quantity: 2,
        unit: 'litre',
        lowStockThreshold: 5,
      });
      await addProduct({
        name: 'MDH Garam Masala',
        quantity: 10,
        unit: 'packet',
        lowStockThreshold: 2,
      });

      const lowStock = await getLowStockProducts();
      expect(lowStock.length).toBe(1);
      expect(lowStock[0].product.name).toBe('Fortune Mustard Oil 1L');
      expect(lowStock[0].deficit).toBe(3); // 5 - 2 = 3
    });

    it('identifies slow moving products without sales in lookback period', async () => {
      const p = await addProduct({
        name: 'Basmati Rice 5kg',
        quantity: 8,
        unit: 'packet',
        lowStockThreshold: 2,
      });

      // Backdate product createdAt by 10 days so it qualifies for slow moving calculation (>= 3 days old)
      const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
      await db.products.update(p.id, { createdAt: tenDaysAgo });

      const slowItems = await getSlowMovingProducts({ lookbackDays: 30 });
      expect(slowItems.length).toBe(1);
      expect(slowItems[0].product.name).toBe('Basmati Rice 5kg');
      expect(slowItems[0].lastSoldAt).toBeNull();
    });
  });
});
