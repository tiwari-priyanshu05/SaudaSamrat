import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  addProduct,
  updateProduct,
  getProductByBarcode,
  generateBackupPayload,
  restoreShopData,
} from '../services';
import type { ProductInput } from '../types';

describe('Phase 7 — Barcode Lookup & Scanning Support', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
  });

  const baseInput: ProductInput = {
    name: 'Tata Tea Gold',
    category: 'beverages',
    quantity: 25,
    unit: 'packet',
    lowStockThreshold: 5,
  };

  it('allows adding a product with a valid barcode and retrieves it by barcode', async () => {
    const product = await addProduct({
      ...baseInput,
      barcode: '8901030382894',
    });

    expect(product.barcode).toBe('8901030382894');

    const found = await getProductByBarcode('8901030382894');
    expect(found).toBeDefined();
    expect(found?.id).toBe(product.id);
    expect(found?.name).toBe('Tata Tea Gold');
  });

  it('handles barcode trimming and whitespace', async () => {
    const product = await addProduct({
      ...baseInput,
      barcode: '  8901234567890  ',
    });

    expect(product.barcode).toBe('8901234567890');

    // Searching with leading/trailing spaces also resolves
    const found = await getProductByBarcode(' 8901234567890 ');
    expect(found?.id).toBe(product.id);
  });

  it('returns undefined for non-existent barcode or empty input', async () => {
    await addProduct({
      ...baseInput,
      barcode: '123456789',
    });

    const notFound = await getProductByBarcode('999999999');
    expect(notFound).toBeNull();

    const empty = await getProductByBarcode('');
    expect(empty).toBeNull();
  });

  it('prevents adding two products with the same barcode', async () => {
    await addProduct({
      ...baseInput,
      name: 'Product A',
      barcode: '8909999999999',
    });

    await expect(
      addProduct({
        ...baseInput,
        name: 'Product B',
        barcode: '8909999999999',
      })
    ).rejects.toThrow();
  });

  it('allows multiple products with no barcode without collision', async () => {
    const p1 = await addProduct({
      ...baseInput,
      name: 'Loose Jeera',
      barcode: undefined,
    });
    const p2 = await addProduct({
      ...baseInput,
      name: 'Loose Rai',
      barcode: undefined,
    });

    expect(p1.id).toBeDefined();
    expect(p2.id).toBeDefined();
    expect(p1.barcode).toBeUndefined();
    expect(p2.barcode).toBeUndefined();
  });

  it('allows updating a product barcode and prevents duplicate barcode updates', async () => {
    const p1 = await addProduct({
      ...baseInput,
      name: 'Item 1',
      barcode: '111111',
    });
    const p2 = await addProduct({
      ...baseInput,
      name: 'Item 2',
      barcode: '222222',
    });

    // Updating p1 to new unique barcode works
    const updated1 = await updateProduct(p1.id, {
      barcode: '333333',
    });
    expect(updated1.barcode).toBe('333333');

    // Updating p2 to p1's barcode fails
    await expect(
      updateProduct(p2.id, {
        barcode: '333333',
      })
    ).rejects.toThrow();
  });

  it('preserves barcode during backup export and restore', async () => {
    await addProduct({
      ...baseInput,
      barcode: '8908888888888',
    });

    const payload = await generateBackupPayload();
    await db.products.clear();

    const result = await restoreShopData(payload, 'replace');
    expect(result.restoredCounts.products).toBe(1);

    const restoredProduct = await getProductByBarcode('8908888888888');
    expect(restoredProduct).toBeDefined();
    expect(restoredProduct?.barcode).toBe('8908888888888');
  });
});
