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
  getProductById,
  getSales,
  getLowStockProducts,
  getSlowMovingProducts,
} from '../services';

describe('Business Logic Audit — Inventory, Sales, Low Stock & Slow Moving', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
  });

  // ===========================================================================
  // 1. INVENTORY & PRODUCT MANAGEMENT
  // ===========================================================================
  describe('Product Creation & Validation', () => {
    it('creates product with valid inputs and active status', async () => {
      const p = await addProduct({
        name: 'Basmati Rice 1kg',
        quantity: 50,
        unit: 'packet',
        lowStockThreshold: 10,
        category: 'Grains',
      });
      expect(p.id).toBeDefined();
      expect(p.name).toBe('Basmati Rice 1kg');
      expect(p.quantity).toBe(50);
      expect(p.unit).toBe('packet');
      expect(p.status).toBe('active');
    });

    it('rejects adding product with empty or whitespace-only name', async () => {
      await expect(
        addProduct({ name: '   ', quantity: 10, unit: 'kg', lowStockThreshold: 2 }),
      ).rejects.toThrow();
    });

    it('rejects adding product with negative quantity', async () => {
      await expect(
        addProduct({ name: 'Toor Dal', quantity: -5, unit: 'kg', lowStockThreshold: 2 }),
      ).rejects.toThrow();
    });

    it('rejects adding product with negative low-stock threshold', async () => {
      await expect(
        addProduct({ name: 'Moong Dal', quantity: 10, unit: 'kg', lowStockThreshold: -1 }),
      ).rejects.toThrow();
    });

    it('rejects duplicate product names (case-insensitive and trimmed)', async () => {
      await addProduct({ name: 'Tata Salt 1kg', quantity: 20, unit: 'packet', lowStockThreshold: 5 });
      await expect(
        addProduct({ name: '  tata salt 1kg  ', quantity: 10, unit: 'packet', lowStockThreshold: 5 }),
      ).rejects.toThrow(/already exists/i);
    });
  });

  describe('Product Updates & Renaming', () => {
    it('updates product category, unit, and threshold correctly', async () => {
      const p = await addProduct({ name: 'Chana Dal', quantity: 15, unit: 'kg', lowStockThreshold: 3 });
      const updated = await updateProduct(p.id, {
        category: 'Pulses',
        lowStockThreshold: 5,
        unit: 'kg',
      });
      expect(updated.category).toBe('Pulses');
      expect(updated.lowStockThreshold).toBe(5);
    });

    it('rejects updating name to empty string', async () => {
      const p = await addProduct({ name: 'Sugar 1kg', quantity: 10, unit: 'kg', lowStockThreshold: 2 });
      await expect(
        updateProduct(p.id, { name: '   ' }),
      ).rejects.toThrow(/required/i);
    });

    it('rejects updating name to an existing active product name', async () => {
      await addProduct({ name: 'Wheat Flour 5kg', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      const p2 = await addProduct({ name: 'Rice Flour 1kg', quantity: 5, unit: 'packet', lowStockThreshold: 1 });

      await expect(
        updateProduct(p2.id, { name: '  wheat flour 5kg  ' }),
      ).rejects.toThrow(/already exists/i);
    });

    it('allows updating product with its own existing name', async () => {
      const p = await addProduct({ name: 'Patanjali Ghee 1L', quantity: 8, unit: 'litre', lowStockThreshold: 2 });
      const updated = await updateProduct(p.id, { name: 'Patanjali Ghee 1L', lowStockThreshold: 4 });
      expect(updated.name).toBe('Patanjali Ghee 1L');
      expect(updated.lowStockThreshold).toBe(4);
    });

    it('rejects updating threshold to negative', async () => {
      const p = await addProduct({ name: 'Refined Oil 1L', quantity: 12, unit: 'litre', lowStockThreshold: 3 });
      await expect(
        updateProduct(p.id, { lowStockThreshold: -3 }),
      ).rejects.toThrow(/negative/i);
    });
  });

  describe('Archiving & Historical Integrity', () => {
    it('marks product archived and excludes it from active products list', async () => {
      const p = await addProduct({ name: 'Old Detergent', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      await archiveProduct(p.id);

      const active = await getProducts();
      expect(active.some((item) => item.id === p.id)).toBe(false);

      const all = await getAllProducts();
      const archived = all.find((item) => item.id === p.id);
      expect(archived?.status).toBe('archived');
    });

    it('rejects selling an archived product', async () => {
      const p = await addProduct({ name: 'Seasonal Sweets', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      await archiveProduct(p.id);

      await expect(
        recordSale({ productId: p.id, quantity: 1 }),
      ).rejects.toThrow(/archived/i);
    });

    it('rejects adjusting stock on an archived product', async () => {
      const p = await addProduct({ name: 'Discontinued Tea', quantity: 5, unit: 'packet', lowStockThreshold: 2 });
      await archiveProduct(p.id);

      await expect(
        adjustStock({ productId: p.id, delta: 2, reason: 'restock' }),
      ).rejects.toThrow(/archived/i);
    });

    it('preserves historical sales records when a product is archived', async () => {
      const p = await addProduct({ name: 'Good Day Biscuits', quantity: 20, unit: 'packet', lowStockThreshold: 5 });
      await recordSale({ productId: p.id, quantity: 4 });

      // Archive product
      await archiveProduct(p.id);

      // Verify sales history still contains the record with product name and quantity
      const sales = await getSales({ productId: p.id });
      expect(sales.length).toBe(1);
      expect(sales[0].productName).toBe('Good Day Biscuits');
      expect(sales[0].quantity).toBe(4);
      expect(sales[0].unit).toBe('packet');
    });
  });

  // ===========================================================================
  // 2. STOCK ADJUSTMENTS
  // ===========================================================================
  describe('Stock Adjustments Correctness', () => {
    it('adds stock correctly on positive delta and records adjustment', async () => {
      const p = await addProduct({ name: 'Atta 10kg', quantity: 5, unit: 'packet', lowStockThreshold: 3 });
      const result = await adjustStock({
        productId: p.id,
        delta: 15,
        reason: 'restock',
        note: 'Fresh shipment from miller',
      });

      expect(result.product.quantity).toBe(20);
      expect(result.adjustment.delta).toBe(15);
      expect(result.adjustment.reason).toBe('restock');
      expect(result.adjustment.note).toBe('Fresh shipment from miller');

      const adjustments = await db.stockAdjustments.where('productId').equals(p.id).toArray();
      expect(adjustments.length).toBe(1);
    });

    it('decreases stock correctly on negative delta and records adjustment', async () => {
      const p = await addProduct({ name: 'Eggs Tray', quantity: 30, unit: 'piece', lowStockThreshold: 10 });
      const result = await adjustStock({
        productId: p.id,
        delta: -3,
        reason: 'damage',
        note: 'Broken in transit',
      });

      expect(result.product.quantity).toBe(27);
      expect(result.adjustment.delta).toBe(-3);
      expect(result.adjustment.reason).toBe('damage');
    });

    it('handles fractional delta adjustments accurately without float artifacts', async () => {
      const p = await addProduct({ name: 'Loose Sugar', quantity: 10.5, unit: 'kg', lowStockThreshold: 2 });
      const result = await adjustStock({
        productId: p.id,
        delta: -0.25,
        reason: 'manual_correction',
      });
      expect(result.product.quantity).toBe(10.25);
    });

    it('rejects zero delta adjustment', async () => {
      const p = await addProduct({ name: 'Salt', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      await expect(
        adjustStock({ productId: p.id, delta: 0, reason: 'manual_correction' }),
      ).rejects.toThrow(/non-zero/i);
    });

    it('rejects NaN or non-finite delta adjustments', async () => {
      const p = await addProduct({ name: 'Salt 2', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      await expect(
        adjustStock({ productId: p.id, delta: NaN, reason: 'manual_correction' }),
      ).rejects.toThrow(/non-zero/i);
    });

    it('rejects negative adjustment that exceeds available stock', async () => {
      const p = await addProduct({ name: 'Spices Packet', quantity: 4, unit: 'packet', lowStockThreshold: 1 });
      await expect(
        adjustStock({ productId: p.id, delta: -5, reason: 'damage' }),
      ).rejects.toThrow(/not enough stock/i);
    });
  });

  // ===========================================================================
  // 3. SALES CORRECTNESS & OVERSELLING
  // ===========================================================================
  describe('Sales Recording & Overselling Protection', () => {
    it('recording a sale decreases stock by exactly the sold quantity', async () => {
      const p = await addProduct({ name: 'Amul Butter 100g', quantity: 20, unit: 'packet', lowStockThreshold: 5 });
      const { product, sale } = await recordSale({ productId: p.id, quantity: 7 });

      expect(product.quantity).toBe(13);
      expect(sale.quantity).toBe(7);
      expect(sale.productName).toBe('Amul Butter 100g');

      const reloaded = await getProductById(p.id);
      expect(reloaded.quantity).toBe(13);
    });

    it('allows selling exact available stock, leaving stock at 0', async () => {
      const p = await addProduct({ name: 'Milk Pouch', quantity: 12, unit: 'packet', lowStockThreshold: 2 });
      const { product } = await recordSale({ productId: p.id, quantity: 12 });
      expect(product.quantity).toBe(0);
    });

    it('rejects overselling when sale quantity exceeds available stock', async () => {
      const p = await addProduct({ name: 'Maggi 70g', quantity: 5, unit: 'packet', lowStockThreshold: 2 });
      await expect(
        recordSale({ productId: p.id, quantity: 6 }),
      ).rejects.toThrow(/insufficient_stock|only 5/i);

      // Verify stock was untouched
      const reloaded = await getProductById(p.id);
      expect(reloaded.quantity).toBe(5);
    });

    it('rejects fractional overselling (e.g. 5.001 when stock is 5.0)', async () => {
      const p = await addProduct({ name: 'Turmeric 500g', quantity: 5.0, unit: 'packet', lowStockThreshold: 1 });
      await expect(
        recordSale({ productId: p.id, quantity: 5.001 }),
      ).rejects.toThrow(/cannot sell|available/i);
    });

    it('handles fractional sales (kg, litre) accurately without float drift', async () => {
      const p = await addProduct({ name: 'Mustard Oil', quantity: 5.0, unit: 'litre', lowStockThreshold: 1 });
      const sale1 = await recordSale({ productId: p.id, quantity: 0.25 });
      expect(sale1.product.quantity).toBe(4.75);

      const sale2 = await recordSale({ productId: p.id, quantity: 0.5 });
      expect(sale2.product.quantity).toBe(4.25);
    });

    it('rejects zero, negative, or invalid quantities', async () => {
      const p = await addProduct({ name: 'Soap Bar', quantity: 10, unit: 'piece', lowStockThreshold: 2 });

      await expect(recordSale({ productId: p.id, quantity: 0 })).rejects.toThrow(/positive/i);
      await expect(recordSale({ productId: p.id, quantity: -2 })).rejects.toThrow(/positive/i);
      await expect(recordSale({ productId: p.id, quantity: NaN })).rejects.toThrow(/positive/i);
      await expect(recordSale({ productId: p.id, quantity: Infinity })).rejects.toThrow(/positive/i);
    });

    it('concurrent sales are serialized in transactions without race-condition overselling', async () => {
      const p = await addProduct({ name: 'Limited Ghee', quantity: 5, unit: 'packet', lowStockThreshold: 1 });

      // Attempt 2 concurrent sales of 3 packets each (total 6 > 5 available)
      const results = await Promise.allSettled([
        recordSale({ productId: p.id, quantity: 3 }),
        recordSale({ productId: p.id, quantity: 3 }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      // Exactly one should succeed, and one should fail with insufficient stock
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const reloaded = await getProductById(p.id);
      expect(reloaded.quantity).toBe(2);
    });
  });

  // ===========================================================================
  // 4. LOW-STOCK LOGIC & REORDER DEFICIT
  // ===========================================================================
  describe('Low-Stock Threshold & Deficit Logic', () => {
    it('classifies stock strictly below threshold as low stock', async () => {
      const p = await addProduct({ name: 'Detergent 500g', quantity: 4, unit: 'packet', lowStockThreshold: 5 });
      const lowStock = await getLowStockProducts();

      expect(lowStock.length).toBe(1);
      expect(lowStock[0].product.id).toBe(p.id);
      expect(lowStock[0].deficit).toBe(1); // 5 - 4
    });

    it('does NOT classify stock equal to threshold as low stock', async () => {
      await addProduct({ name: 'Matchbox', quantity: 10, unit: 'packet', lowStockThreshold: 10 });
      const lowStock = await getLowStockProducts();
      expect(lowStock.length).toBe(0);
    });

    it('does NOT classify stock above threshold as low stock', async () => {
      await addProduct({ name: 'Toothpaste', quantity: 15, unit: 'piece', lowStockThreshold: 5 });
      const lowStock = await getLowStockProducts();
      expect(lowStock.length).toBe(0);
    });

    it('classifies out-of-stock (quantity = 0) as low stock with deficit equal to threshold', async () => {
      await addProduct({ name: 'Shampoo 180ml', quantity: 0, unit: 'piece', lowStockThreshold: 6 });
      const lowStock = await getLowStockProducts();
      expect(lowStock.length).toBe(1);
      expect(lowStock[0].deficit).toBe(6);
    });

    it('sorts low stock items by highest deficit first', async () => {
      await addProduct({ name: 'Item A', quantity: 4, unit: 'piece', lowStockThreshold: 5 }); // deficit 1
      await addProduct({ name: 'Item B', quantity: 2, unit: 'piece', lowStockThreshold: 10 }); // deficit 8
      await addProduct({ name: 'Item C', quantity: 1, unit: 'piece', lowStockThreshold: 5 }); // deficit 4

      const lowStock = await getLowStockProducts();
      expect(lowStock.map((l) => l.product.name)).toEqual(['Item B', 'Item C', 'Item A']);
    });

    it('accurately computes fractional deficit without IEEE float issues', async () => {
      await addProduct({ name: 'Loose Rice', quantity: 4.7, unit: 'kg', lowStockThreshold: 5 });
      const lowStock = await getLowStockProducts();
      expect(lowStock.length).toBe(1);
      expect(lowStock[0].deficit).toBe(0.3); // Exactly 0.3, not 0.2999999999999998
    });
  });

  // ===========================================================================
  // 5. SLOW-MOVING LOGIC
  // ===========================================================================
  describe('Slow-Moving Inventory Logic', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;

    it('excludes products created within the 3-day grace period', async () => {
      // Product created 2 days ago (within grace period) with 0 sales
      const p = await addProduct({ name: 'New Brand Biscuits', quantity: 20, unit: 'packet', lowStockThreshold: 5 });
      await db.products.update(p.id, { createdAt: Date.now() - 2 * DAY_MS });

      const slowMoving = await getSlowMovingProducts({ lookbackDays: 30 });
      expect(slowMoving.some((item) => item.product.id === p.id)).toBe(false);
    });

    it('includes products created >= 3 days ago with 0 sales in last 30 days', async () => {
      const p = await addProduct({ name: 'Special Masala', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      await db.products.update(p.id, { createdAt: Date.now() - 10 * DAY_MS });

      const slowMoving = await getSlowMovingProducts({ lookbackDays: 30 });
      expect(slowMoving.some((item) => item.product.id === p.id)).toBe(true);
      const item = slowMoving.find((i) => i.product.id === p.id);
      expect(item?.lastSoldAt).toBeNull(); // Never sold
    });

    it('excludes products that had sales within the 30-day window', async () => {
      const p = await addProduct({ name: 'Fast Moving Soap', quantity: 25, unit: 'piece', lowStockThreshold: 5 });
      await db.products.update(p.id, { createdAt: Date.now() - 40 * DAY_MS });

      // Sale happened 5 days ago (inside 30d window)
      await recordSale({ productId: p.id, quantity: 2 });

      const slowMoving = await getSlowMovingProducts({ lookbackDays: 30 });
      expect(slowMoving.some((item) => item.product.id === p.id)).toBe(false);
    });

    it('includes products whose only sale was outside the 30-day window (e.g. 35 days ago)', async () => {
      const p = await addProduct({ name: 'Old Hair Oil', quantity: 8, unit: 'piece', lowStockThreshold: 2 });
      const createdTime = Date.now() - 50 * DAY_MS;
      const saleTime = Date.now() - 35 * DAY_MS;

      await db.products.update(p.id, { createdAt: createdTime });

      // Inject sale from 35 days ago
      await db.sales.add({
        id: 'sale-old-1',
        productId: p.id,
        productName: p.name,
        quantity: 1,
        unit: p.unit,
        soldAt: saleTime,
      });

      const slowMoving = await getSlowMovingProducts({ lookbackDays: 30 });
      expect(slowMoving.some((item) => item.product.id === p.id)).toBe(true);

      const item = slowMoving.find((i) => i.product.id === p.id);
      expect(item?.lastSoldAt).toBe(saleTime);
    });

    it('excludes archived products from slow-moving recommendations', async () => {
      const p = await addProduct({ name: 'Archived Dead Item', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      await db.products.update(p.id, { createdAt: Date.now() - 20 * DAY_MS });
      await archiveProduct(p.id);

      const slowMoving = await getSlowMovingProducts({ lookbackDays: 30 });
      expect(slowMoving.some((item) => item.product.id === p.id)).toBe(false);
    });

    it('sorts never-sold items first, then items sold longest ago', async () => {
      const p1 = await addProduct({ name: 'Item Sold 35d ago', quantity: 5, unit: 'packet', lowStockThreshold: 1 });
      const p2 = await addProduct({ name: 'Item Never Sold', quantity: 5, unit: 'packet', lowStockThreshold: 1 });
      const p3 = await addProduct({ name: 'Item Sold 45d ago', quantity: 5, unit: 'packet', lowStockThreshold: 1 });

      await db.products.update(p1.id, { createdAt: Date.now() - 60 * DAY_MS });
      await db.products.update(p2.id, { createdAt: Date.now() - 60 * DAY_MS });
      await db.products.update(p3.id, { createdAt: Date.now() - 60 * DAY_MS });

      await db.sales.add({
        id: 'sale-p1',
        productId: p1.id,
        productName: p1.name,
        quantity: 1,
        unit: p1.unit,
        soldAt: Date.now() - 35 * DAY_MS,
      });

      await db.sales.add({
        id: 'sale-p3',
        productId: p3.id,
        productName: p3.name,
        quantity: 1,
        unit: p3.unit,
        soldAt: Date.now() - 45 * DAY_MS,
      });

      const slowMoving = await getSlowMovingProducts({ lookbackDays: 30 });
      const names = slowMoving.map((s) => s.product.name);

      // p2 (never sold) first, then p3 (sold 45d ago), then p1 (sold 35d ago)
      expect(names).toEqual(['Item Never Sold', 'Item Sold 45d ago', 'Item Sold 35d ago']);
    });
  });
});
