import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addProduct,
  recordSale,
  adjustStock,
  saveShopProfile,
  addCustomCategory,
  generateBackupPayload,
  validateBackupContent,
  restoreShopData,
  getProducts,
  getAllProducts,
  getShopProfile,
  getCustomCategories,
} from '../services';
import type { BackupPayload } from '../types';

describe('Phase 1 — Local Backup & Restore Integration Tests', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
    await db.profile.clear();
    localStorage.clear();
  });

  describe('1. Backup Generation & Format Verification', () => {
    it('generates a valid, complete backup payload matching schema v1.0.0', async () => {
      // 1. Seed store data
      const p1 = await addProduct({
        name: 'Madhur Sugar 1kg',
        quantity: 25,
        unit: 'packet',
        lowStockThreshold: 5,
        category: 'grocery',
      });

      await recordSale({
        productId: p1.id,
        quantity: 5,
      });

      await adjustStock({
        productId: p1.id,
        delta: 10,
        reason: 'restock',
        note: 'Fresh Mandi supply',
      });

      await saveShopProfile({
        ownerName: 'Ramesh Gupta',
        shopName: 'Gupta Kirana & General Store',
      });

      addCustomCategory('Pooja Samagri');

      // 2. Generate backup
      const backup = await generateBackupPayload();

      // 3. Verify top-level metadata
      expect(backup.metadata.app).toBe('SaudaSamrat');
      expect(backup.metadata.version).toBe('1.0.0');
      expect(backup.metadata.appName).toBe('Gupta Kirana & General Store');
      expect(backup.metadata.recordCounts.products).toBe(1);
      expect(backup.metadata.recordCounts.sales).toBe(1);
      expect(backup.metadata.recordCounts.stockAdjustments).toBe(1);
      expect(backup.metadata.recordCounts.hasProfile).toBe(true);
      expect(backup.metadata.recordCounts.customCategories).toBe(1);

      // 4. Verify data payload
      expect(backup.data.products.length).toBe(1);
      expect(backup.data.products[0].name).toBe('Madhur Sugar 1kg');
      expect(backup.data.products[0].quantity).toBe(30); // 25 - 5 + 10 = 30

      expect(backup.data.sales.length).toBe(1);
      expect(backup.data.sales[0].productId).toBe(p1.id);
      expect(backup.data.sales[0].quantity).toBe(5);

      expect(backup.data.stockAdjustments.length).toBe(1);
      expect(backup.data.stockAdjustments[0].delta).toBe(10);
      expect(backup.data.stockAdjustments[0].reason).toBe('restock');

      expect(backup.data.profile?.shopName).toBe('Gupta Kirana & General Store');
      expect(backup.data.customCategories).toContain('Pooja Samagri');
    });
  });

  describe('2. Validation & Security Guardrails', () => {
    it('validates a correct backup successfully', async () => {
      await addProduct({
        name: 'Tata Tea Gold 500g',
        quantity: 15,
        unit: 'packet',
        lowStockThreshold: 3,
      });

      const backup = await generateBackupPayload();
      const json = JSON.stringify(backup);

      const validation = validateBackupContent(json);
      expect(validation.valid).toBe(true);
      expect(validation.payload).toBeDefined();
      expect(validation.payload?.data.products[0].name).toBe('Tata Tea Gold 500g');
    });

    it('rejects empty or whitespace-only backup files', () => {
      const vEmpty = validateBackupContent('');
      expect(vEmpty.valid).toBe(false);
      expect(vEmpty.errorCode).toBe('EMPTY_FILE');

      const vWhitespace = validateBackupContent('   \n\t  ');
      expect(vWhitespace.valid).toBe(false);
      expect(vWhitespace.errorCode).toBe('EMPTY_FILE');
    });

    it('rejects malformed or unparseable JSON', () => {
      const vMalformed = validateBackupContent('{ "metadata": { "app": "SaudaSamrat" missing bracket');
      expect(vMalformed.valid).toBe(false);
      expect(vMalformed.errorCode).toBe('INVALID_JSON');
    });

    it('rejects non-object JSON payloads (numbers, arrays, booleans)', () => {
      expect(validateBackupContent('42').valid).toBe(false);
      expect(validateBackupContent('["not", "an", "object"]').valid).toBe(false);
      expect(validateBackupContent('true').valid).toBe(false);
    });

    it('rejects backup from unsupported apps or missing metadata', () => {
      const wrongApp = JSON.stringify({
        metadata: { app: 'OtherStoreApp', version: '1.0.0' },
        data: { products: [], sales: [], stockAdjustments: [] },
      });
      const vApp = validateBackupContent(wrongApp);
      expect(vApp.valid).toBe(false);
      expect(vApp.errorCode).toBe('UNSUPPORTED_APP');

      const noMeta = JSON.stringify({
        data: { products: [], sales: [], stockAdjustments: [] },
      });
      const vNoMeta = validateBackupContent(noMeta);
      expect(vNoMeta.valid).toBe(false);
      expect(vNoMeta.errorCode).toBe('MALFORMED_STRUCTURE');
    });

    it('rejects unsupported backup versions', () => {
      const wrongVersion = JSON.stringify({
        metadata: { app: 'SaudaSamrat', version: '2.5.0' },
        data: { products: [], sales: [], stockAdjustments: [] },
      });
      const vVer = validateBackupContent(wrongVersion);
      expect(vVer.valid).toBe(false);
      expect(vVer.errorCode).toBe('UNSUPPORTED_VERSION');
    });

    it('rejects duplicate IDs inside product data', () => {
      const duplicateProducts = JSON.stringify({
        metadata: { app: 'SaudaSamrat', version: '1.0.0', exportedAt: Date.now() },
        data: {
          products: [
            { id: 'dup-1', name: 'Item 1', quantity: 5, unit: 'packet', lowStockThreshold: 1, status: 'active' },
            { id: 'dup-1', name: 'Item 2', quantity: 10, unit: 'packet', lowStockThreshold: 2, status: 'active' },
          ],
          sales: [],
          stockAdjustments: [],
        },
      });

      const res = validateBackupContent(duplicateProducts);
      expect(res.valid).toBe(false);
      expect(res.errorCode).toBe('DUPLICATE_ID');
      expect(res.error).toMatch(/duplicate product id/i);
    });

    it('rejects negative or non-finite product quantities and invalid units', () => {
      const invalidQty = JSON.stringify({
        metadata: { app: 'SaudaSamrat', version: '1.0.0' },
        data: {
          products: [
            { id: 'p1', name: 'Bad Qty', quantity: -10, unit: 'kg', lowStockThreshold: 1, status: 'active' },
          ],
          sales: [],
          stockAdjustments: [],
        },
      });
      expect(validateBackupContent(invalidQty).valid).toBe(false);

      const invalidUnit = JSON.stringify({
        metadata: { app: 'SaudaSamrat', version: '1.0.0' },
        data: {
          products: [
            { id: 'p2', name: 'Bad Unit', quantity: 10, unit: 'truckload_invalid', lowStockThreshold: 1, status: 'active' },
          ],
          sales: [],
          stockAdjustments: [],
        },
      });
      expect(validateBackupContent(invalidUnit).valid).toBe(false);
    });

    it('rejects invalid or non-positive sale quantities', () => {
      const badSale = JSON.stringify({
        metadata: { app: 'SaudaSamrat', version: '1.0.0' },
        data: {
          products: [],
          sales: [
            { id: 's1', productId: 'p1', quantity: 0, unit: 'packet', soldAt: Date.now() },
          ],
          stockAdjustments: [],
        },
      });
      expect(validateBackupContent(badSale).valid).toBe(false);
    });

    it('rejects delta of 0 or invalid reason in stock adjustments', () => {
      const zeroDelta = JSON.stringify({
        metadata: { app: 'SaudaSamrat', version: '1.0.0' },
        data: {
          products: [],
          sales: [],
          stockAdjustments: [
            { id: 'adj-1', productId: 'p1', delta: 0, reason: 'restock', adjustedAt: Date.now() },
          ],
        },
      });
      expect(validateBackupContent(zeroDelta).valid).toBe(false);

      const invalidReason = JSON.stringify({
        metadata: { app: 'SaudaSamrat', version: '1.0.0' },
        data: {
          products: [],
          sales: [],
          stockAdjustments: [
            { id: 'adj-2', productId: 'p1', delta: 5, reason: 'stolen_alien_abduction', adjustedAt: Date.now() },
          ],
        },
      });
      expect(validateBackupContent(invalidReason).valid).toBe(false);
    });

    it('sanitizes input properties and discards untrusted fields', () => {
      const withExtraUntrustedProps = JSON.stringify({
        metadata: { app: 'SaudaSamrat', version: '1.0.0' },
        data: {
          products: [
            {
              id: 'p-clean',
              name: 'Pure Ghee',
              quantity: 5,
              unit: 'bottle',
              lowStockThreshold: 1,
              status: 'active',
              maliciousProp: '<script>alert(1)</script>',
              __proto__: { isAdmin: true },
            },
          ],
          sales: [],
          stockAdjustments: [],
        },
      });

      const res = validateBackupContent(withExtraUntrustedProps);
      expect(res.valid).toBe(true);
      const product = res.payload?.data.products[0] as unknown as Record<string, unknown>;
      expect(product.maliciousProp).toBeUndefined();
      expect(product.name).toBe('Pure Ghee');
    });
  });

  describe('3. Restore in "Replace" Mode', () => {
    it('atomically clears current records and restores backup state', async () => {
      // Current records in database
      await addProduct({ name: 'Old Product to be replaced', quantity: 10, unit: 'packet', lowStockThreshold: 2 });
      await saveShopProfile({ ownerName: 'Old Owner', shopName: 'Old Shop' });
      addCustomCategory('Old Category');

      // Backup payload to restore
      const targetPayload: BackupPayload = {
        metadata: {
          app: 'SaudaSamrat',
          version: '1.0.0',
          exportedAt: Date.now(),
          appName: 'New Restored Mart',
          recordCounts: { products: 1, sales: 0, stockAdjustments: 0, hasProfile: true, customCategories: 1 },
        },
        data: {
          products: [
            {
              id: 'prod-new-1',
              name: 'Aashirvaad Shudh Chakki Atta 10kg',
              category: 'grocery',
              quantity: 40,
              unit: 'packet',
              lowStockThreshold: 8,
              status: 'active',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          sales: [],
          stockAdjustments: [],
          profile: {
            id: 'profile',
            ownerName: 'Shri Kedarnath',
            shopName: 'Kedarnath Kirana Bhandar',
            updatedAt: Date.now(),
          },
          customCategories: ['Pooja & Havan'],
        },
      };

      const result = await restoreShopData(targetPayload, 'replace');

      expect(result.success).toBe(true);
      expect(result.mode).toBe('replace');
      expect(result.restoredCounts.products).toBe(1);

      // Verify old products were wiped and replaced
      const products = await getProducts();
      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Aashirvaad Shudh Chakki Atta 10kg');
      expect(products[0].quantity).toBe(40);

      // Verify profile replaced in DB and LocalStorage
      const prof = await getShopProfile();
      expect(prof?.shopName).toBe('Kedarnath Kirana Bhandar');
      expect(localStorage.getItem('ss_shop_name')).toBe('Kedarnath Kirana Bhandar');

      // Verify custom categories replaced
      const customCats = getCustomCategories();
      expect(customCats).toEqual(['Pooja & Havan']);
      expect(customCats).not.toContain('Old Category');
    });
  });

  describe('4. Restore in "Merge" Mode', () => {
    it('safely merges backup records without deleting existing records', async () => {
      // 1. Existing product
      const existingProduct = await addProduct({
        name: 'Existing Fortune Oil 1L',
        quantity: 12,
        unit: 'bottle',
        lowStockThreshold: 4,
      });

      await saveShopProfile({ ownerName: 'Original Owner', shopName: 'Original Kirana' });
      addCustomCategory('Spices Special');

      // 2. Backup containing a NEW product and an existing ID update
      const backupPayload: BackupPayload = {
        metadata: {
          app: 'SaudaSamrat',
          version: '1.0.0',
          exportedAt: Date.now(),
          appName: 'Backup Source',
          recordCounts: { products: 2, sales: 0, stockAdjustments: 0, hasProfile: false, customCategories: 1 },
        },
        data: {
          products: [
            {
              id: existingProduct.id,
              name: 'Existing Fortune Oil 1L (Updated)',
              category: 'grocery',
              quantity: 20,
              unit: 'bottle',
              lowStockThreshold: 5,
              status: 'active',
              createdAt: existingProduct.createdAt,
              updatedAt: Date.now(),
            },
            {
              id: 'new-product-99',
              name: 'Everest Meat Masala 100g',
              category: 'grocery',
              quantity: 15,
              unit: 'packet',
              lowStockThreshold: 3,
              status: 'active',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          sales: [],
          stockAdjustments: [],
          profile: null,
          customCategories: ['Imported Confectionery'],
        },
      };

      const result = await restoreShopData(backupPayload, 'merge');
      expect(result.success).toBe(true);
      expect(result.mode).toBe('merge');

      // Both products should exist
      const allProducts = await getAllProducts();
      expect(allProducts.length).toBe(2);

      const updated = allProducts.find((p) => p.id === existingProduct.id);
      expect(updated?.name).toBe('Existing Fortune Oil 1L (Updated)');
      expect(updated?.quantity).toBe(20);

      const brandNew = allProducts.find((p) => p.id === 'new-product-99');
      expect(brandNew?.name).toBe('Everest Meat Masala 100g');

      // Custom categories should be merged (union)
      const categories = getCustomCategories();
      expect(categories).toContain('Spices Special');
      expect(categories).toContain('Imported Confectionery');

      // Profile was retained
      const profile = await getShopProfile();
      expect(profile?.shopName).toBe('Original Kirana');
    });
  });

  describe('5. Atomic Rollback on Transaction Error', () => {
    it('rolls back completely if database transaction encounters an error', async () => {
      // Existing data
      await addProduct({
        name: 'Safe Item Before Failure',
        quantity: 10,
        unit: 'packet',
        lowStockThreshold: 2,
      });

      // Malformed payload that will fail constraint during bulkAdd
      // e.g. simulating a runtime DB constraint failure
      const brokenPayload: BackupPayload = {
        metadata: {
          app: 'SaudaSamrat',
          version: '1.0.0',
          exportedAt: Date.now(),
          appName: 'Error Test',
          recordCounts: { products: 2, sales: 0, stockAdjustments: 0, hasProfile: false, customCategories: 0 },
        },
        data: {
          products: [
            {
              id: 'p-fail-1',
              name: 'Item 1',
              category: '',
              quantity: 10,
              unit: 'packet',
              lowStockThreshold: 2,
              status: 'active',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            {
              // Duplicate ID causes Dexie primary key error in replace (bulkAdd)
              id: 'p-fail-1',
              name: 'Item 2',
              category: '',
              quantity: 10,
              unit: 'packet',
              lowStockThreshold: 2,
              status: 'active',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          sales: [],
          stockAdjustments: [],
          profile: null,
          customCategories: [],
        },
      };

      await expect(restoreShopData(brokenPayload, 'replace')).rejects.toThrow();

      // Original product MUST still exist because transaction rolled back!
      const currentProducts = await getProducts();
      expect(currentProducts.length).toBe(1);
      expect(currentProducts[0].name).toBe('Safe Item Before Failure');
    });
  });
});
