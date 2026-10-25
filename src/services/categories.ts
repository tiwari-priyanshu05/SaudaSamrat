// =============================================================================
// SaudaSamrat — Category Service & Management
// Provides stable category keys, localized display labels, custom category
// persistence for non-grocery stores, and backwards-compatible legacy category preservation.
// =============================================================================

import type { Product } from '../types';
import type { LabelKey } from '../i18n/labels';

export interface DefaultCategoryDef {
  key: string;
  labelKey: LabelKey;
  defaultEn: string;
  defaultHi: string;
}

export const DEFAULT_CATEGORIES: DefaultCategoryDef[] = [
  { key: 'grocery', labelKey: 'catGrocery', defaultEn: 'Grocery', defaultHi: 'किराना व राशन' },
  { key: 'dairy', labelKey: 'catDairy', defaultEn: 'Dairy', defaultHi: 'डेयरी व दूध' },
  { key: 'snacks', labelKey: 'catSnacks', defaultEn: 'Snacks', defaultHi: 'नाश्ता व स्नैक्स' },
  { key: 'beverages', labelKey: 'catBeverages', defaultEn: 'Beverages', defaultHi: 'पेय व शरबत' },
  { key: 'personal_care', labelKey: 'catPersonalCare', defaultEn: 'Personal Care', defaultHi: 'पर्सनल केयर' },
  { key: 'household', labelKey: 'catHousehold', defaultEn: 'Household', defaultHi: 'घरेलू सामान' },
  { key: 'stationery', labelKey: 'catStationery', defaultEn: 'Stationery', defaultHi: 'स्टेशनरी व पुस्तकें' },
  { key: 'medicines', labelKey: 'catMedicines', defaultEn: 'Medicines', defaultHi: 'दवाइयाँ व स्वास्थ्य' },
  { key: 'other', labelKey: 'catOther', defaultEn: 'Other', defaultHi: 'अन्य सामान' },
];

export interface CategoryOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

const STORAGE_KEY = 'ss_custom_categories';
type CategoryListener = (categories: string[]) => void;
const listeners = new Set<CategoryListener>();

function notifyCategoryChange(categories: string[]): void {
  for (const listener of listeners) {
    try {
      listener(categories);
    } catch (err) {
      console.error('[SaudaSamrat] Error in category listener:', err);
    }
  }
}

export function subscribeCategories(callback: CategoryListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getCustomCategories(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is string => typeof c === 'string' && !!c.trim())
      .map((c) => c.trim());
  } catch {
    return [];
  }
}

export function saveCustomCategories(categories: string[]): void {
  if (typeof window === 'undefined') return;
  const unique = Array.from(
    new Set(categories.map((c) => c.trim()).filter((c) => c.length > 0))
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  } catch (err) {
    console.error('[SaudaSamrat] Failed to save custom categories:', err);
  }
  notifyCategoryChange(unique);
}

export function addCustomCategory(rawName: string): {
  success: boolean;
  error?: 'EMPTY' | 'TOO_LONG' | 'EXISTS' | 'MATCHES_DEFAULT';
  categories: string[];
} {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return { success: false, error: 'EMPTY', categories: getCustomCategories() };
  }
  if (trimmed.length > 40) {
    return { success: false, error: 'TOO_LONG', categories: getCustomCategories() };
  }

  // Check if matches any default category key or name
  const matchesDefault = DEFAULT_CATEGORIES.some(
    (c) =>
      c.key.toLowerCase() === trimmed.toLowerCase() ||
      c.defaultEn.toLowerCase() === trimmed.toLowerCase() ||
      c.defaultHi.toLowerCase() === trimmed.toLowerCase()
  );
  if (matchesDefault) {
    return { success: false, error: 'MATCHES_DEFAULT', categories: getCustomCategories() };
  }

  const existing = getCustomCategories();
  const alreadyExists = existing.some(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (alreadyExists) {
    return { success: false, error: 'EXISTS', categories: existing };
  }

  const updated = [...existing, trimmed];
  saveCustomCategories(updated);
  return { success: true, categories: updated };
}

export function removeCustomCategory(categoryName: string): string[] {
  const trimmed = categoryName.trim().toLowerCase();
  const existing = getCustomCategories();
  const updated = existing.filter((c) => c.toLowerCase() !== trimmed);
  saveCustomCategories(updated);
  return updated;
}

/**
 * Returns complete category options for selects & filters, combining:
 * 1. Standard default categories with Hindi/English localization.
 * 2. User-configured custom categories (e.g. for stationery or pharmacy stores).
 * 3. Any legacy categories found in existing product records so past data is never hidden or lost.
 */
export function getCategoryOptions(
  existingProducts?: Partial<Product>[],
  lang: 'hi' | 'en' = 'en'
): CategoryOption[] {
  const options: CategoryOption[] = DEFAULT_CATEGORIES.map((c) => ({
    value: c.key,
    label: lang === 'hi' ? c.defaultHi : c.defaultEn,
  }));

  const custom = getCustomCategories();
  for (const cat of custom) {
    const lower = cat.toLowerCase();
    if (!options.some((o) => o.value.toLowerCase() === lower)) {
      options.push({
        value: cat,
        label: cat,
        isCustom: true,
      });
    }
  }

  // Preserve legacy or unrecognized categories from existing database records
  if (existingProducts && existingProducts.length > 0) {
    for (const p of existingProducts) {
      if (p.category && p.category.trim()) {
        const cat = p.category.trim();
        const lower = cat.toLowerCase();
        const exists = options.some(
          (o) => o.value.toLowerCase() === lower || o.label.toLowerCase() === lower
        );
        if (!exists) {
          options.push({
            value: cat,
            label: cat,
            isCustom: true,
          });
        }
      }
    }
  }

  return options;
}

/**
 * Formats a category value for readable display in UI badges and cards:
 * - If it matches a default category key/name, returns the localized label.
 * - If it is a custom or legacy string, returns that string as-is.
 * - If missing or empty, returns localized fallback "Other" / "अन्य सामान".
 */
export function formatCategory(rawCategory: string | undefined | null, lang: 'hi' | 'en' = 'en'): string {
  if (!rawCategory || !rawCategory.trim()) {
    return lang === 'hi' ? 'अन्य सामान' : 'Other';
  }

  const trimmed = rawCategory.trim();
  const lower = trimmed.toLowerCase();

  const found = DEFAULT_CATEGORIES.find(
    (c) =>
      c.key.toLowerCase() === lower ||
      c.defaultEn.toLowerCase() === lower ||
      c.defaultHi.toLowerCase() === lower
  );

  if (found) {
    return lang === 'hi' ? found.defaultHi : found.defaultEn;
  }

  return trimmed;
}
