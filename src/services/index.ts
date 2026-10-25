import { nanoid } from './nanoid';
import { db } from '../db';
import { createAppError, isAppError } from '../types';
import type {
  Product,
  Sale,
  SaleInput,
  ProductInput,
  ProductUpdateInput,
  StockAdjustmentInput,
  StockAdjustment,
  LowStockItem,
  SlowMovingItem,
  ShopProfile,
  ShopProfileInput,
  ProductBatch,
} from '../types';

// =============================================================================
// SaudaSamrat — Product & Sales Services
// All business logic lives here. Components must not touch db directly.
// =============================================================================

function now(): number {
  return Date.now();
}

// --------------- Product operations ------------------------------------------

export async function getProducts(): Promise<Product[]> {
  return db.products.where('status').equals('active').sortBy('name');
}

export async function getAllProducts(): Promise<Product[]> {
  return db.products.toArray();
}

export async function getProductById(id: string): Promise<Product> {
  const product = await db.products.get(id);
  if (!product) throw createAppError('PRODUCT_NOT_FOUND', `Product ${id} not found`);
  return product;
}

export async function addProduct(input: ProductInput): Promise<Product> {
  validateProductInput(input);

  const trimmed = input.name.trim();
  const existing = await db.products
    .filter((p) => p.status === 'active' && p.name.trim().toLowerCase() === trimmed.toLowerCase())
    .first();
  if (existing) {
    throw createAppError('DUPLICATE_PRODUCT', `A product named "${trimmed}" already exists`);
  }

  const barcode = input.barcode ? input.barcode.trim() : undefined;
  if (barcode) {
    const duplicateBarcode = await db.products
      .filter((p) => p.status === 'active' && p.barcode === barcode)
      .first();
    if (duplicateBarcode) {
      throw createAppError(
        'DUPLICATE_BARCODE',
        `Barcode "${barcode}" is already assigned to "${duplicateBarcode.name}"`,
      );
    }
  }

  const product: Product = {
    id: nanoid(),
    name: trimmed,
    category: input.category ? input.category.trim() : '',
    quantity: input.quantity,
    unit: input.unit,
    lowStockThreshold: input.lowStockThreshold,
    status: 'active',
    ...(barcode && { barcode }),
    createdAt: now(),
    updatedAt: now(),
  };

  await db.products.add(product);

  if (input.batchNumber?.trim() && input.expiryDate?.trim()) {
    const batch: ProductBatch = {
      id: nanoid(),
      productId: product.id,
      batchNumber: input.batchNumber.trim(),
      expiryDate: input.expiryDate.trim(),
      quantity: product.quantity,
      receivedAt: now(),
    };
    await db.batches.add(batch);
  }

  return product;
}

export async function updateProduct(
  id: string,
  updates: ProductUpdateInput,
): Promise<Product> {
  const product = await getProductById(id);

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) {
      throw createAppError('DUPLICATE_PRODUCT', 'Product name is required');
    }
    const duplicate = await db.products
      .filter(
        (p) =>
          p.status === 'active' &&
          p.id !== id &&
          p.name.trim().toLowerCase() === trimmed.toLowerCase(),
      )
      .first();
    if (duplicate) {
      throw createAppError('DUPLICATE_PRODUCT', `A product named "${trimmed}" already exists`);
    }
  }

  if (updates.barcode !== undefined) {
    const trimmedBarcode = updates.barcode.trim();
    if (trimmedBarcode) {
      const duplicateBarcode = await db.products
        .filter(
          (p) =>
            p.status === 'active' &&
            p.id !== id &&
            p.barcode === trimmedBarcode,
        )
        .first();
      if (duplicateBarcode) {
        throw createAppError(
          'DUPLICATE_BARCODE',
          `Barcode "${trimmedBarcode}" is already assigned to "${duplicateBarcode.name}"`,
        );
      }
    }
  }

  if (updates.lowStockThreshold !== undefined && updates.lowStockThreshold < 0) {
    throw createAppError('INVALID_THRESHOLD', 'Threshold cannot be negative');
  }

  const patched: Product = {
    ...product,
    ...(updates.name !== undefined && { name: updates.name.trim() }),
    ...(updates.category !== undefined && { category: updates.category.trim() }),
    ...(updates.unit !== undefined && { unit: updates.unit }),
    ...(updates.lowStockThreshold !== undefined && {
      lowStockThreshold: updates.lowStockThreshold,
    }),
    ...(updates.status !== undefined && { status: updates.status }),
    ...(updates.barcode !== undefined && {
      barcode: updates.barcode.trim() || undefined,
    }),
    updatedAt: now(),
  };

  await db.products.put(patched);
  return patched;
}

export async function getProductByBarcode(rawBarcode: string): Promise<Product | null> {
  const trimmed = rawBarcode.trim();
  if (!trimmed) return null;
  const match = await db.products
    .filter((p) => p.status === 'active' && p.barcode === trimmed)
    .first();
  return match || null;
}

export async function archiveProduct(id: string): Promise<void> {
  const product = await getProductById(id);
  await db.products.put({ ...product, status: 'archived', updatedAt: now() });
}

export async function adjustStock(
  input: StockAdjustmentInput,
): Promise<{ product: Product; adjustment: StockAdjustment }> {
  if (!Number.isFinite(input.delta) || input.delta === 0) {
    throw createAppError('INVALID_QUANTITY', 'Stock adjustment delta must be a non-zero number');
  }

  let adjustment: StockAdjustment;
  let updatedProduct: Product;

  await db.transaction('rw', db.products, db.stockAdjustments, async () => {
    const product = await db.products.get(input.productId);
    if (!product) throw createAppError('PRODUCT_NOT_FOUND', `Product ${input.productId} not found`);

    if (product.status === 'archived') {
      throw createAppError('PRODUCT_ARCHIVED', 'Cannot adjust stock on an archived product');
    }

    const newQty = +(product.quantity + input.delta).toFixed(6);
    if (newQty < 0) {
      throw createAppError(
        'INSUFFICIENT_STOCK',
        `Not enough stock. Available: ${product.quantity}, adjustment would result in ${newQty}`,
      );
    }

    adjustment = {
      id: nanoid(),
      productId: product.id,
      delta: input.delta,
      reason: input.reason,
      note: input.note,
      adjustedAt: now(),
    };

    updatedProduct = { ...product, quantity: newQty, updatedAt: now() };
    await db.products.put(updatedProduct);
    await db.stockAdjustments.add(adjustment);
  });

  return { product: updatedProduct!, adjustment: adjustment! };
}

// --------------- Sale operations ---------------------------------------------

export async function recordSale(input: SaleInput): Promise<{ sale: Sale; product: Product }> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw createAppError('INVALID_QUANTITY', 'Sale quantity must be a positive number');
  }

  let sale: Sale;
  let updatedProduct: Product;

  await db.transaction('rw', db.products, db.sales, db.batches, async () => {
    const product = await db.products.get(input.productId);
    if (!product) throw createAppError('PRODUCT_NOT_FOUND', `Product ${input.productId} not found`);

    if (product.status === 'archived') {
      throw createAppError('PRODUCT_ARCHIVED', 'Cannot sell an archived product');
    }

    if (input.quantity > product.quantity) {
      throw createAppError(
        'INSUFFICIENT_STOCK',
        `Only ${product.quantity} ${product.unit} available. Cannot sell ${input.quantity}`,
      );
    }

    const newQty = +(product.quantity - input.quantity).toFixed(6);
    updatedProduct = { ...product, quantity: newQty, updatedAt: now() };

    sale = {
      id: nanoid(),
      productId: product.id,
      productName: product.name,
      quantity: input.quantity,
      unit: product.unit,
      soldAt: now(),
    };

    // FIFO Batch depletion if product has recorded batches
    const productBatches = await db.batches
      .where('productId')
      .equals(input.productId)
      .toArray();

    if (productBatches.length > 0) {
      productBatches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
      let remaining = input.quantity;
      for (const b of productBatches) {
        if (remaining <= 0) break;
        if (b.quantity <= remaining) {
          remaining = +(remaining - b.quantity).toFixed(6);
          await db.batches.delete(b.id);
        } else {
          b.quantity = +(b.quantity - remaining).toFixed(6);
          remaining = 0;
          await db.batches.put(b);
        }
      }
    }

    await db.products.put(updatedProduct);
    await db.sales.add(sale);
  });

  return { sale: sale!, product: updatedProduct! };
}

export async function getSales(options?: {
  productId?: string;
  limit?: number;
  since?: number;
}): Promise<Sale[]> {
  let all: Sale[];

  if (options?.since) {
    all = await db.sales
      .where('soldAt')
      .aboveOrEqual(options.since)
      .reverse()
      .toArray();
  } else {
    all = await db.sales.orderBy('soldAt').reverse().toArray();
  }

  const filtered = options?.productId
    ? all.filter((s) => s.productId === options.productId)
    : all;

  return options?.limit ? filtered.slice(0, options.limit) : filtered;
}

// --------------- Reorder / intelligence logic --------------------------------

export async function getLowStockProducts(): Promise<LowStockItem[]> {
  const products = await getProducts(); // active only
  return products
    .filter((p) => p.quantity < p.lowStockThreshold)
    .map((p) => ({ product: p, deficit: +(p.lowStockThreshold - p.quantity).toFixed(6) }))
    .sort((a, b) => b.deficit - a.deficit);
}

export async function getSlowMovingProducts(options?: {
  lookbackDays?: number;
}): Promise<SlowMovingItem[]> {
  const lookbackDays = options?.lookbackDays ?? 30;
  const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  const products = await getProducts();
  const recentSales = await db.sales.where('soldAt').aboveOrEqual(since).toArray();

  // Index: productId → total sold in period
  const soldMap = new Map<string, number>();
  for (const s of recentSales) {
    soldMap.set(s.productId, (soldMap.get(s.productId) ?? 0) + s.quantity);
  }

  // Last sale per product (across all history)
  const allSales = await db.sales.toArray();
  const lastSaleMap = new Map<string, number>();
  for (const s of allSales) {
    const existing = lastSaleMap.get(s.productId);
    if (existing === undefined || s.soldAt > existing) {
      lastSaleMap.set(s.productId, s.soldAt);
    }
  }

  // Include products that had zero sales in the lookback period
  // AND that are at least 3 days old (to exclude freshly added products)
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

  return products
    .filter((p) => {
      const totalSold = soldMap.get(p.id) ?? 0;
      const isOldEnough = p.createdAt <= threeDaysAgo;
      return totalSold === 0 && isOldEnough;
    })
    .map((p) => ({
      product: p,
      lastSoldAt: lastSaleMap.get(p.id) ?? null,
      totalSoldInPeriod: 0,
      lookbackDays,
    }))
    .sort((a, b) => {
      if (a.lastSoldAt === null && b.lastSoldAt !== null) return -1;
      if (a.lastSoldAt !== null && b.lastSoldAt === null) return 1;
      if (a.lastSoldAt !== null && b.lastSoldAt !== null)
        return a.lastSoldAt - b.lastSoldAt;
      return 0;
    });
}

export async function getSalesVelocity(
  productId: string,
  lookbackDays = 30,
): Promise<{ averageDailySales: number; totalSold: number }> {
  const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const sales = await db.sales
    .where('soldAt')
    .aboveOrEqual(since)
    .toArray();

  const relevant = sales.filter((s) => s.productId === productId);
  const totalSold = relevant.reduce((sum, s) => sum + s.quantity, 0);
  return {
    averageDailySales: +(totalSold / lookbackDays).toFixed(3),
    totalSold: +totalSold.toFixed(3),
  };
}

// --------------- Helpers & validation ----------------------------------------

function validateProductInput(input: ProductInput): void {
  if (!input.name || !input.name.trim()) {
    throw createAppError('DUPLICATE_PRODUCT', 'Product name is required');
  }
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    throw createAppError('INVALID_QUANTITY', 'Quantity must be 0 or more');
  }
  if (!Number.isFinite(input.lowStockThreshold) || input.lowStockThreshold < 0) {
    throw createAppError('INVALID_THRESHOLD', 'Low-stock threshold must be 0 or more');
  }
}

// --------------- Profile operations ------------------------------------------

const profileSubscribers = new Set<(profile: ShopProfile | null) => void>();

export function subscribeShopProfile(callback: (profile: ShopProfile | null) => void): () => void {
  profileSubscribers.add(callback);
  return () => {
    profileSubscribers.delete(callback);
  };
}

function notifyProfileChange(profile: ShopProfile | null): void {
  for (const cb of profileSubscribers) {
    try {
      cb(profile);
    } catch (err) {
      console.error('[SaudaSamrat] Profile subscriber error:', err);
    }
  }
}

export function validateShopProfileInput(input: ShopProfileInput): {
  ownerName: string;
  shopName: string;
} {
  if (!input) {
    throw createAppError('INVALID_PROFILE', 'Profile details are required');
  }

  const ownerName = input.ownerName ? input.ownerName.trim() : '';
  const shopName = input.shopName ? input.shopName.trim() : '';

  if (!ownerName) {
    throw createAppError('INVALID_PROFILE', 'Shop owner name is required');
  }
  if (ownerName.length > 50) {
    throw createAppError('INVALID_PROFILE', 'Owner name cannot exceed 50 characters');
  }

  if (!shopName) {
    throw createAppError('INVALID_PROFILE', 'Shop name is required');
  }
  if (shopName.length > 60) {
    throw createAppError('INVALID_PROFILE', 'Shop name cannot exceed 60 characters');
  }

  return { ownerName, shopName };
}

export async function getShopProfile(): Promise<ShopProfile | null> {
  const record = await db.profile.get('profile');
  if (record) return record;

  // Migration / fallback from legacy localStorage if present
  if (typeof window !== 'undefined') {
    const legacyShop = localStorage.getItem('ss_shop_name')?.trim();
    const legacyOwner = localStorage.getItem('ss_owner_name')?.trim();
    if (legacyShop) {
      const profile: ShopProfile = {
        id: 'profile',
        ownerName: legacyOwner || '',
        shopName: legacyShop,
        updatedAt: now(),
      };
      if (profile.ownerName && profile.shopName) {
        await db.profile.put(profile);
      }
      return profile;
    }
  }

  return null;
}

export async function saveShopProfile(input: ShopProfileInput): Promise<ShopProfile> {
  const { ownerName, shopName } = validateShopProfileInput(input);
  const profile: ShopProfile = {
    id: 'profile',
    ownerName,
    shopName,
    updatedAt: now(),
  };

  await db.profile.put(profile);

  // Sync with localStorage for fast initial cache and backwards compatibility
  if (typeof window !== 'undefined') {
    localStorage.setItem('ss_shop_name', shopName);
    localStorage.setItem('ss_owner_name', ownerName);
  }

  notifyProfileChange(profile);
  return profile;
}

// Category services
export {
  DEFAULT_CATEGORIES,
  getCustomCategories,
  saveCustomCategories,
  addCustomCategory,
  removeCustomCategory,
  getCategoryOptions,
  formatCategory,
  subscribeCategories,
} from './categories';
export type { CategoryOption, DefaultCategoryDef } from './categories';

// Backup & restore services
export {
  generateBackupPayload,
  exportBackupFile,
  validateBackupContent,
  restoreShopData,
} from './backup';

// Stock movement history & safe undo services
export {
  getStockMovements,
  undoStockAdjustment,
  undoSale,
  undoMovement,
} from './history';

// Bulk receiving service
export { bulkReceiveStock } from './receiving';

// Smart reorder & supplier order services
export {
  getSmartReorderRecommendations,
  dismissReorderRecommendation,
  restoreDismissedReorder,
  getDismissedReorderIds,
  clearDismissedReorders,
  formatWhatsAppOrderMessage,
} from './reorder';

// Daily summary & trends service
export { getDailySummary } from './analytics';
export type { DailySummaryReport, UnitQuantitySummary, TopSoldProduct } from './analytics';

// Batch & expiry tracking service (Phase 8)
export {
  parseIsoDateParts,
  getDaysToExpiry,
  calculateExpiryStatus,
  getBatchesForProduct,
  getAllBatches,
  addBatch,
  writeOffBatch,
  getProductExpiryOverview,
} from './batches';

// Re-export for convenience
export { isAppError };


