import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addProduct,
  updateProduct,
  recordSale,
  DEFAULT_CATEGORIES,
  getCustomCategories,
  addCustomCategory,
  removeCustomCategory,
  getCategoryOptions,
  formatCategory,
  subscribeCategories,
} from '../services';
import { unitLabel, formatQty } from '../utils/format';
import type { Unit } from '../types';

describe('Product Categories & Usability Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.open();
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
  });

  // ===========================================================================
  // 1. Default Categories & Localization
  // ===========================================================================
  describe('Default Categories', () => {
    it('provides all sensible default categories', () => {
      const keys = DEFAULT_CATEGORIES.map((c) => c.key);
      expect(keys).toContain('grocery');
      expect(keys).toContain('dairy');
      expect(keys).toContain('snacks');
      expect(keys).toContain('beverages');
      expect(keys).toContain('personal_care');
      expect(keys).toContain('household');
      expect(keys).toContain('stationery');
      expect(keys).toContain('medicines');
      expect(keys).toContain('other');
    });

    it('formats default categories in English and Hindi accurately', () => {
      expect(formatCategory('grocery', 'en')).toBe('Grocery');
      expect(formatCategory('grocery', 'hi')).toBe('किराना व राशन');

      expect(formatCategory('stationery', 'en')).toBe('Stationery');
      expect(formatCategory('stationery', 'hi')).toBe('स्टेशनरी व पुस्तकें');

      expect(formatCategory('medicines', 'en')).toBe('Medicines');
      expect(formatCategory('medicines', 'hi')).toBe('दवाइयाँ व स्वास्थ्य');

      expect(formatCategory('dairy', 'en')).toBe('Dairy');
      expect(formatCategory('dairy', 'hi')).toBe('डेयरी व दूध');
    });

    it('falls back to "Other" / "अन्य सामान" for empty or undefined categories', () => {
      expect(formatCategory('', 'en')).toBe('Other');
      expect(formatCategory('   ', 'en')).toBe('Other');
      expect(formatCategory(undefined, 'hi')).toBe('अन्य सामान');
      expect(formatCategory(null, 'hi')).toBe('अन्य सामान');
    });
  });

  // ===========================================================================
  // 2. Custom Categories Management for Different Shop Types
  // ===========================================================================
  describe('Custom Categories for Different Retail Shops', () => {
    it('starts with empty custom categories array', () => {
      expect(getCustomCategories()).toEqual([]);
    });

    it('allows adding custom categories for stationery, gifts, puja stores', () => {
      const res1 = addCustomCategory('Pens & Notebooks');
      expect(res1.success).toBe(true);
      expect(res1.categories).toContain('Pens & Notebooks');

      const res2 = addCustomCategory('Puja Samagri');
      expect(res2.success).toBe(true);
      expect(res2.categories).toContain('Puja Samagri');

      expect(getCustomCategories()).toEqual(['Pens & Notebooks', 'Puja Samagri']);
    });

    it('rejects empty or whitespace-only custom category name', () => {
      const res = addCustomCategory('   ');
      expect(res.success).toBe(false);
      expect(res.error).toBe('EMPTY');
    });

    it('rejects category name exceeding 40 characters', () => {
      const res = addCustomCategory('A'.repeat(41));
      expect(res.success).toBe(false);
      expect(res.error).toBe('TOO_LONG');
    });

    it('rejects duplicate custom categories (case-insensitive)', () => {
      addCustomCategory('Electricals');
      const dup = addCustomCategory('  electricals  ');
      expect(dup.success).toBe(false);
      expect(dup.error).toBe('EXISTS');
    });

    it('rejects category names that match default categories', () => {
      const matchKey = addCustomCategory('Grocery');
      expect(matchKey.success).toBe(false);
      expect(matchKey.error).toBe('MATCHES_DEFAULT');

      const matchStationery = addCustomCategory('stationery');
      expect(matchStationery.success).toBe(false);
      expect(matchStationery.error).toBe('MATCHES_DEFAULT');
    });

    it('allows removing custom categories', () => {
      addCustomCategory('Gifts & Toys');
      addCustomCategory('Hardware');
      expect(getCustomCategories().length).toBe(2);

      const afterRemove = removeCustomCategory('Gifts & Toys');
      expect(afterRemove).toEqual(['Hardware']);
      expect(getCustomCategories()).toEqual(['Hardware']);
    });

    it('notifies subscribers when custom categories change', () => {
      const updates: string[][] = [];
      const unsub = subscribeCategories((cats) => {
        updates.push(cats);
      });

      addCustomCategory('Footwear');
      expect(updates.length).toBe(1);
      expect(updates[0]).toEqual(['Footwear']);

      unsub();
      addCustomCategory('Cosmetics');
      expect(updates.length).toBe(1); // No new update after unsubscribe
    });
  });

  // ===========================================================================
  // 3. Category Preservation & Legacy Product Compatibility
  // ===========================================================================
  describe('Preservation of Existing & Legacy Categories', () => {
    it('preserves legacy and custom categories on existing products during retrieval and display', async () => {
      // Product created with legacy category string (e.g. from previous version of app)
      const legacyProd = await addProduct({
        name: 'Everest Turmeric Powder 100g',
        category: 'Spices & Condiments',
        quantity: 20,
        unit: 'packet',
        lowStockThreshold: 5,
      });

      expect(legacyProd.category).toBe('Spices & Condiments');

      const options = getCategoryOptions([legacyProd], 'en');
      // Must include default categories AND the legacy category
      expect(options.some((o) => o.value === 'grocery')).toBe(true);
      expect(options.some((o) => o.value === 'Spices & Condiments')).toBe(true);

      // formatCategory must preserve the legacy name
      expect(formatCategory(legacyProd.category, 'en')).toBe('Spices & Condiments');
      expect(formatCategory(legacyProd.category, 'hi')).toBe('Spices & Condiments');
    });

    it('does not overwrite or discard existing product categories upon editing other fields', async () => {
      const p = await addProduct({
        name: 'Camlin Geometry Box',
        category: 'Geometry Sets',
        quantity: 15,
        unit: 'piece',
        lowStockThreshold: 3,
      });

      const updated = await updateProduct(p.id, {
        lowStockThreshold: 5,
      });

      expect(updated.category).toBe('Geometry Sets');
      expect(updated.lowStockThreshold).toBe(5);

      const retrieved = await db.products.get(p.id);
      expect(retrieved?.category).toBe('Geometry Sets');
    });
  });

  // ===========================================================================
  // 4. Units & Usability (8 Units, Presets & Fractions)
  // ===========================================================================
  describe('Expanded Units & Form Usability', () => {
    const allUnits: Unit[] = [
      'piece',
      'packet',
      'bottle',
      'kg',
      'g',
      'litre',
      'ml',
      'dozen',
    ];

    it('supports all 8 units with distinct labels', () => {
      for (const u of allUnits) {
        const label = unitLabel(u);
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      }
      expect(unitLabel('bottle')).toBe('btl');
      expect(unitLabel('ml')).toBe('ml');
    });

    it('creates products and records sales across new units (bottle, ml) with fractional quantities', async () => {
      // Bottle product
      const oilBottle = await addProduct({
        name: 'Dabur Honey 500g Bottle',
        category: 'grocery',
        quantity: 10,
        unit: 'bottle',
        lowStockThreshold: 2,
      });
      expect(oilBottle.unit).toBe('bottle');

      // Sale of bottles
      const { sale, product: afterSale } = await recordSale({
        productId: oilBottle.id,
        quantity: 2,
      });
      expect(sale.quantity).toBe(2);
      expect(afterSale.quantity).toBe(8);

      // Fractional quantity with ml
      const syrup = await addProduct({
        name: 'Cough Syrup 100ml',
        category: 'medicines',
        quantity: 500,
        unit: 'ml',
        lowStockThreshold: 100,
      });

      const { sale: fracSale, product: afterFrac } = await recordSale({
        productId: syrup.id,
        quantity: 50.5,
      });
      expect(fracSale.quantity).toBe(50.5);
      expect(afterFrac.quantity).toBe(449.5);
    });

    it('formats quantities with correct unit labels and precision', () => {
      expect(formatQty(5, 'bottle')).toBe('5 btl');
      expect(formatQty(250, 'ml')).toBe('250 ml');
      expect(formatQty(1.25, 'kg')).toBe('1.25 kg');
    });
  });
});
