import { describe, it, expect, beforeEach } from 'vitest';
import Dexie, { type Table } from 'dexie';
import type { Product, Sale, StockAdjustment, ShopProfile } from '../types';
import {
  addProduct,
  recordSale,
  adjustStock,
  getLowStockProducts,
} from '../services';
import manifest from '../../public/manifest.webmanifest?raw';

// Recreate the exact schema definition to simulate opening the DB in a fresh browser session/reload
class SessionRestartDB extends Dexie {
  products!: Table<Product, string>;
  sales!: Table<Sale, string>;
  stockAdjustments!: Table<StockAdjustment, string>;
  profile!: Table<ShopProfile, string>;

  constructor() {
    super('SaudaSamratDB');
    this.version(1).stores({
      products: 'id, name, category, status, updatedAt',
      sales: 'id, productId, soldAt',
      stockAdjustments: 'id, productId, adjustedAt',
    });
    this.version(2).stores({
      profile: 'id',
    });
  }
}

describe('Offline Storage & PWA Configuration Verification', () => {
  beforeEach(async () => {
    const tempDB = new SessionRestartDB();
    await tempDB.open();
    await tempDB.products.clear();
    await tempDB.sales.clear();
    await tempDB.stockAdjustments.clear();
    await tempDB.profile.clear();
    tempDB.close();
  });

  describe('PWA Web Manifest & Assets Verification', () => {
    it('has a valid manifest.webmanifest with all required PWA fields', () => {
      const parsed = JSON.parse(manifest);
      expect(parsed.name).toBe('SaudaSamrat — Kirana Inventory');
      expect(parsed.short_name).toBe('SaudaSamrat');
      expect(parsed.theme_color).toBe('#087F5B');
      expect(parsed.background_color).toBe('#F9F7EF');
      expect(parsed.display).toBe('standalone');
      expect(parsed.start_url).toBe('/');
      expect(parsed.scope).toBe('/');
      expect(parsed.icons.length).toBeGreaterThanOrEqual(2);
      expect(parsed.icons.some((i: { sizes: string }) => i.sizes === '192x192')).toBe(true);
      expect(parsed.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
    });
  });

  describe('IndexedDB Persistence Across Browser Session Restarts', () => {
    it('persists products and sales across simulated browser reloads and restarts', async () => {
      // 1. Add product in session 1
      const product = await addProduct({
        name: 'Fortune Mustard Oil 1L',
        quantity: 15,
        unit: 'litre',
        lowStockThreshold: 5,
        category: 'Oils & Ghee',
      });

      // 2. Record a sale in session 1
      const saleResult = await recordSale({
        productId: product.id,
        quantity: 4,
      });

      expect(saleResult.product.quantity).toBe(11);

      // 3. Record a stock adjustment in session 1
      await adjustStock({
        productId: product.id,
        delta: -1,
        reason: 'damage',
        note: 'Leaked bottle',
      });

      // 4. Simulate browser restart by creating a completely separate DB connection
      const reloadedSessionDB = new SessionRestartDB();
      await reloadedSessionDB.open();

      // Verify product state after reload
      const persistedProduct = await reloadedSessionDB.products.get(product.id);
      expect(persistedProduct).toBeDefined();
      expect(persistedProduct?.name).toBe('Fortune Mustard Oil 1L');
      expect(persistedProduct?.quantity).toBe(10); // 15 - 4 - 1
      expect(persistedProduct?.unit).toBe('litre');

      // Verify sales state after reload
      const persistedSales = await reloadedSessionDB.sales.where('productId').equals(product.id).toArray();
      expect(persistedSales.length).toBe(1);
      expect(persistedSales[0].quantity).toBe(4);
      expect(persistedSales[0].productName).toBe('Fortune Mustard Oil 1L');

      // Verify stock adjustments after reload
      const persistedAdjustments = await reloadedSessionDB.stockAdjustments.where('productId').equals(product.id).toArray();
      expect(persistedAdjustments.length).toBe(1);
      expect(persistedAdjustments[0].delta).toBe(-1);
      expect(persistedAdjustments[0].reason).toBe('damage');

      reloadedSessionDB.close();
    });

    it('accurately computes low-stock alerts from persistent IndexedDB after restart', async () => {
      const p = await addProduct({
        name: 'Aashirvaad Atta 5kg',
        quantity: 6,
        unit: 'packet',
        lowStockThreshold: 5,
      });

      // Sell 2 units, bringing stock to 4 (which is below lowStockThreshold 5)
      await recordSale({
        productId: p.id,
        quantity: 2,
      });

      // Re-read via services
      const lowStock = await getLowStockProducts();
      expect(lowStock.length).toBe(1);
      expect(lowStock[0].product.name).toBe('Aashirvaad Atta 5kg');
      expect(lowStock[0].deficit).toBe(1); // 5 - 4
    });
  });
});
