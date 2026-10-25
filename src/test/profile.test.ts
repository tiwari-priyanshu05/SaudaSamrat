import { describe, it, expect, beforeEach } from 'vitest';
import Dexie, { type Table } from 'dexie';
import { db } from '../db';
import type { Product, Sale, StockAdjustment, ShopProfile } from '../types';
import {
  getShopProfile,
  saveShopProfile,
  subscribeShopProfile,
  validateShopProfileInput,
  addProduct,
  recordSale,
  adjustStock,
  getLowStockProducts,
  getSales,
} from '../services';
import { formatOwnerGreeting } from '../utils/format';
import { createTranslator } from '../i18n/labels';

// Separate Dexie class representing reopening the database in another connection or session
class ReopenedDB extends Dexie {
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

describe('Shop Owner Profile & Personalized Dashboard Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.open();
    await db.products.clear();
    await db.sales.clear();
    await db.stockAdjustments.clear();
    await db.profile.clear();
  });

  // ===========================================================================
  // 1. Storage & Retrieval via Service Layer
  // ===========================================================================
  describe('Criterion 1: Owner name and shop name can be saved and retrieved', () => {
    it('returns null when no profile has been saved yet', async () => {
      const profile = await getShopProfile();
      expect(profile).toBeNull();
    });

    it('saves and retrieves owner name and shop name with trimming', async () => {
      const saved = await saveShopProfile({
        ownerName: '  Rahul Sharma  ',
        shopName: '  Sharma Kirana Store  ',
      });

      expect(saved.id).toBe('profile');
      expect(saved.ownerName).toBe('Rahul Sharma');
      expect(saved.shopName).toBe('Sharma Kirana Store');
      expect(typeof saved.updatedAt).toBe('number');

      const retrieved = await getShopProfile();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.ownerName).toBe('Rahul Sharma');
      expect(retrieved?.shopName).toBe('Sharma Kirana Store');
    });

    it('overwrites previous profile when edited', async () => {
      await saveShopProfile({
        ownerName: 'Rahul Sharma',
        shopName: 'Sharma General Store',
      });

      const updated = await saveShopProfile({
        ownerName: 'Priya Tiwari',
        shopName: 'Tiwari Kirana & Superstore',
      });

      expect(updated.ownerName).toBe('Priya Tiwari');
      expect(updated.shopName).toBe('Tiwari Kirana & Superstore');

      const retrieved = await getShopProfile();
      expect(retrieved?.ownerName).toBe('Priya Tiwari');
      expect(retrieved?.shopName).toBe('Tiwari Kirana & Superstore');
    });

    it('syncs to localStorage as backup/migration mirror', async () => {
      await saveShopProfile({
        ownerName: 'Sunita Verma',
        shopName: 'Verma Provisions',
      });

      expect(localStorage.getItem('ss_owner_name')).toBe('Sunita Verma');
      expect(localStorage.getItem('ss_shop_name')).toBe('Verma Provisions');
    });
  });

  // ===========================================================================
  // 2. Persistence Across Closing & Reopening Database Connection
  // ===========================================================================
  describe('Criterion 2: Profile values persist after closing and reopening the database connection', () => {
    it('persists profile values across database close and fresh connection reopening', async () => {
      await saveShopProfile({
        ownerName: 'Vikram Singh',
        shopName: 'Singh Daily Needs',
      });

      // Close the current active Dexie DB instance
      db.close();

      // Open a separate fresh Dexie connection to the same underlying IndexedDB
      const reopened = new ReopenedDB();
      await reopened.open();

      const profileInReopened = await reopened.profile.get('profile');
      expect(profileInReopened).toBeDefined();
      expect(profileInReopened?.ownerName).toBe('Vikram Singh');
      expect(profileInReopened?.shopName).toBe('Singh Daily Needs');

      reopened.close();

      // Reopen primary db instance for subsequent tests
      await db.open();
      const retrieved = await getShopProfile();
      expect(retrieved?.ownerName).toBe('Vikram Singh');
      expect(retrieved?.shopName).toBe('Singh Daily Needs');
    });
  });

  // ===========================================================================
  // 3. Editing Profile Updates Home Greeting & Reactive Subscription
  // ===========================================================================
  describe('Criterion 3: Editing a profile updates the Home greeting and reactive subscribers', () => {
    it('defaults to a friendly generic greeting when profile is missing or owner name is empty', () => {
      const enGeneric = formatOwnerGreeting('', 'en');
      const hiGeneric = formatOwnerGreeting('', 'hi');
      expect(enGeneric).toBe('Namaste! 🙏');
      expect(hiGeneric).toBe('नमस्ते! 🙏');
    });

    it('formats personalized greeting with only the first name in English and Hindi', () => {
      expect(formatOwnerGreeting('Rahul Sharma', 'en')).toBe('Namaste, Rahul ji! 🙏');
      expect(formatOwnerGreeting('Rahul Sharma', 'hi')).toBe('नमस्ते, Rahul जी! 🙏');
      expect(formatOwnerGreeting('Pooja Gupta', 'en')).toBe('Namaste, Pooja ji! 🙏');
      expect(formatOwnerGreeting('पूजा गुप्ता', 'hi')).toBe('नमस्ते, पूजा जी! 🙏');
    });

    it('normalizes leading, trailing, and repeated whitespace in owner name', () => {
      expect(formatOwnerGreeting('   Rahul     Sharma   ', 'en')).toBe('Namaste, Rahul ji! 🙏');
      expect(formatOwnerGreeting('\t\n Rahul   Sharma \n', 'hi')).toBe('नमस्ते, Rahul जी! 🙏');
    });

    it('avoids awkward duplicated salutations when owner name already ends with "ji" / "Ji" / "JI"', () => {
      expect(formatOwnerGreeting('Rahul ji', 'en')).toBe('Namaste, Rahul ji! 🙏');
      expect(formatOwnerGreeting('Rahul Ji', 'en')).toBe('Namaste, Rahul Ji! 🙏');
      expect(formatOwnerGreeting('Rahul JI', 'en')).toBe('Namaste, Rahul JI! 🙏');
      expect(formatOwnerGreeting('Rahulji', 'en')).toBe('Namaste, Rahulji! 🙏');
    });

    it('avoids awkward duplicated salutations when owner name already ends with "जी"', () => {
      expect(formatOwnerGreeting('राहुल जी', 'hi')).toBe('नमस्ते, राहुल जी! 🙏');
      expect(formatOwnerGreeting('राहुलजी', 'hi')).toBe('नमस्ते, राहुलजी! 🙏');
      expect(formatOwnerGreeting('Sharma जी', 'hi')).toBe('नमस्ते, Sharma जी! 🙏');
    });

    it('preserves casing and special characters in owner name', () => {
      expect(formatOwnerGreeting("O'Connor", 'en')).toBe("Namaste, O'Connor ji! 🙏");
      expect(formatOwnerGreeting('Dr. A. P. J.', 'en')).toBe('Namaste, Dr. A. P. J. ji! 🙏');
    });

    it('notifies subscribers immediately without page reload when profile is edited', async () => {
      const updates: (ShopProfile | null)[] = [];
      const unsubscribe = subscribeShopProfile((prof) => {
        updates.push(prof);
      });

      // Simulates editing profile from the UI
      await saveShopProfile({
        ownerName: 'Manoj Gupta',
        shopName: 'Gupta Traders',
      });

      expect(updates.length).toBe(1);
      expect(updates[0]?.ownerName).toBe('Manoj Gupta');
      expect(updates[0]?.shopName).toBe('Gupta Traders');

      // Check the new greeting formatted from this update (first name only)
      const newGreetingEn = formatOwnerGreeting(updates[0]?.ownerName || '', 'en');
      const newGreetingHi = formatOwnerGreeting(updates[0]?.ownerName || '', 'hi');
      expect(newGreetingEn).toBe('Namaste, Manoj ji! 🙏');
      expect(newGreetingHi).toBe('नमस्ते, Manoj जी! 🙏');

      unsubscribe();

      await saveShopProfile({
        ownerName: 'Anita Gupta',
        shopName: 'Gupta Superstore',
      });

      // No additional invocations after unsubscribe
      expect(updates.length).toBe(1);
    });
  });

  // ===========================================================================
  // 4. Hindi & English Labels Render Correctly
  // ===========================================================================
  describe('Criterion 4: Hindi and English labels render correctly', () => {
    it('provides all profile, shop, greeting, and error labels in English and Hindi', () => {
      const en = createTranslator('en');
      const hi = createTranslator('hi');

      const expectedKeys = [
        'profileTitle',
        'ownerName',
        'shopName',
        'ownerRole',
        'editProfile',
        'saveChanges',
        'cancel',
        'yourShop',
        'setupProfile',
        'setupProfileDesc',
        'ownerNamePlaceholder',
        'shopNamePlaceholder',
        'profileStorageNotice',
        'profileUpdatedSuccess',
        'errorOwnerNameRequired',
        'errorShopNameRequired',
        'errorNameTooLong',
        'errorShopNameTooLong',
      ] as const;

      for (const key of expectedKeys) {
        const enVal = en(key);
        const hiVal = hi(key);

        expect(typeof enVal).toBe('string');
        expect(enVal.length).toBeGreaterThan(0);

        expect(typeof hiVal).toBe('string');
        expect(hiVal.length).toBeGreaterThan(0);

        // Verify that Hindi strings contain Devanagari characters for native text
        if (['profileTitle', 'editProfile', 'cancel', 'saveChanges', 'yourShop', 'setupProfile'].includes(key)) {
          expect(/[\u0900-\u097F]/.test(hiVal)).toBe(true);
        }
      }
    });

    it('renders correct labels for shop name banner in both languages', () => {
      const en = createTranslator('en');
      const hi = createTranslator('hi');

      expect(en('yourShop')).toBe('Your Shop');
      expect(hi('yourShop')).toBe('आपकी दुकान');

      // Check shop greeting assembly
      const shopName = 'Sharma Kirana Store';
      const enBanner = `${en('yourShop')}: ${shopName}`;
      const hiBanner = `${hi('yourShop')}: ${shopName}`;

      expect(enBanner).toBe('Your Shop: Sharma Kirana Store');
      expect(hiBanner).toBe('आपकी दुकान: Sharma Kirana Store');
    });
  });

  // ===========================================================================
  // 5. Empty or Invalid Profile Values Handled Gracefully
  // ===========================================================================
  describe('Criterion 5: Empty or invalid profile values are handled gracefully', () => {
    it('rejects empty or whitespace-only owner name', () => {
      expect(() => {
        validateShopProfileInput({ ownerName: '', shopName: 'Sharma Store' });
      }).toThrow('Shop owner name is required');

      expect(() => {
        validateShopProfileInput({ ownerName: '   \t  \n ', shopName: 'Sharma Store' });
      }).toThrow('Shop owner name is required');
    });

    it('rejects empty or whitespace-only shop name', () => {
      expect(() => {
        validateShopProfileInput({ ownerName: 'Rahul', shopName: '' });
      }).toThrow('Shop name is required');

      expect(() => {
        validateShopProfileInput({ ownerName: 'Rahul', shopName: '   ' });
      }).toThrow('Shop name is required');
    });

    it('rejects owner name exceeding 50 characters', () => {
      const longName = 'A'.repeat(51);
      expect(() => {
        validateShopProfileInput({ ownerName: longName, shopName: 'Sharma Store' });
      }).toThrow('Owner name cannot exceed 50 characters');
    });

    it('rejects shop name exceeding 60 characters', () => {
      const longShop = 'B'.repeat(61);
      expect(() => {
        validateShopProfileInput({ ownerName: 'Rahul', shopName: longShop });
      }).toThrow('Shop name cannot exceed 60 characters');
    });

    it('accepts and trims names at the exact max boundary (50 chars owner, 60 chars shop)', () => {
      const res = validateShopProfileInput({
        ownerName: 'A'.repeat(50),
        shopName: 'B'.repeat(60),
      });
      expect(res.ownerName.length).toBe(50);
      expect(res.shopName.length).toBe(60);
    });

    it('saveShopProfile throws an INVALID_PROFILE error when input is invalid', async () => {
      await expect(
        saveShopProfile({ ownerName: '', shopName: 'Valid Shop' })
      ).rejects.toThrow('Shop owner name is required');

      await expect(
        saveShopProfile({ ownerName: 'Valid Owner', shopName: '' })
      ).rejects.toThrow('Shop name is required');
    });
  });

  // ===========================================================================
  // 6. Regression: Existing Products, Sales, Adjustments & Offline Intact
  // ===========================================================================
  describe('Criterion 6: Existing products, sales, stock adjustments, and calculations remain intact', () => {
    it('allows complete product lifecycle, sales, and adjustments alongside profile', async () => {
      // 1. Save profile
      await saveShopProfile({
        ownerName: 'Manoj Kumar',
        shopName: 'Kumar Kirana',
      });

      // 2. Add product
      const product = await addProduct({
        name: 'Aashirvaad Atta 5kg',
        quantity: 20,
        unit: 'packet',
        lowStockThreshold: 4,
        category: 'Flour & Grains',
      });

      expect(product.id).toBeDefined();
      expect(product.quantity).toBe(20);

      // 3. Record a sale
      const { sale, product: prodAfterSale } = await recordSale({
        productId: product.id,
        quantity: 3,
      });

      expect(sale.id).toBeDefined();
      expect(sale.quantity).toBe(3);
      expect(prodAfterSale.quantity).toBe(17);

      // 4. Adjust stock (+5)
      const { product: prodAfterAdj, adjustment } = await adjustStock({
        productId: product.id,
        delta: 5,
        reason: 'restock',
      });

      expect(adjustment.id).toBeDefined();
      expect(prodAfterAdj.quantity).toBe(22); // 20 - 3 + 5 = 22

      // 5. Check sales records
      const sales = await getSales({ limit: 10 });
      expect(sales.length).toBe(1);
      expect(sales[0].productId).toBe(product.id);

      // 6. Check low stock calculations
      const lowStock = await getLowStockProducts();
      // Quantity is 22, threshold is 4 -> should not be in low stock
      expect(lowStock.some((item) => item.product.id === product.id)).toBe(false);

      // 7. Verify profile remains completely intact
      const profile = await getShopProfile();
      expect(profile?.ownerName).toBe('Manoj Kumar');
      expect(profile?.shopName).toBe('Kumar Kirana');
    });

    it('preserves database schema versioning without resetting existing records', async () => {
      // Add product
      const prod = await addProduct({
        name: 'Tata Salt 1kg',
        quantity: 10,
        unit: 'packet',
        lowStockThreshold: 2,
      });

      // Add profile
      await saveShopProfile({
        ownerName: 'Ramesh Gupta',
        shopName: 'Gupta Store',
      });

      // Close and reopen database
      db.close();
      await db.open();

      const prodAfter = await db.products.get(prod.id);
      const profAfter = await db.profile.get('profile');

      expect(prodAfter).toBeDefined();
      expect(prodAfter?.name).toBe('Tata Salt 1kg');
      expect(profAfter).toBeDefined();
      expect(profAfter?.ownerName).toBe('Ramesh Gupta');
    });
  });
});
