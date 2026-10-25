// =============================================================================
// SaudaSamrat — Smart Reorder Assistant & Supplier Order Service
// Transparent sales-velocity calculations, target coverage, and WhatsApp ordering.
// =============================================================================

import { db } from '../db';
import type {
  SmartReorderRecommendation,
  SupplierOrderList,
} from '../types';

const DISMISSED_STORAGE_KEY = 'ss_dismissed_reorders';

export function getDismissedReorderIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function dismissReorderRecommendation(productId: string): void {
  if (typeof window === 'undefined') return;
  const existing = new Set(getDismissedReorderIds());
  existing.add(productId);
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(existing)));
  } catch (err) {
    console.error('[SaudaSamrat] Failed to save dismissed reorder:', err);
  }
}

export function restoreDismissedReorder(productId: string): void {
  if (typeof window === 'undefined') return;
  const existing = new Set(getDismissedReorderIds());
  existing.delete(productId);
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(existing)));
  } catch (err) {
    console.error('[SaudaSamrat] Failed to restore dismissed reorder:', err);
  }
}

export function clearDismissedReorders(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DISMISSED_STORAGE_KEY);
  } catch (err) {
    console.error('[SaudaSamrat] Failed to clear dismissed reorders:', err);
  }
}

/**
 * Calculates transparent, deterministic inventory reorder recommendations
 * based on actual sales history within a configurable lookback window.
 */
export async function getSmartReorderRecommendations(options?: {
  lookbackDays?: number;
  targetDays?: number;
  includeDismissed?: boolean;
}): Promise<SmartReorderRecommendation[]> {
  const lookbackDays = Math.max(1, options?.lookbackDays ?? 14);
  const targetDays = Math.max(1, options?.targetDays ?? 7);
  const includeDismissed = options?.includeDismissed ?? false;

  const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

  const [products, recentSales] = await Promise.all([
    db.products.where('status').equals('active').toArray(),
    db.sales.where('soldAt').aboveOrEqual(since).toArray(),
  ]);

  const dismissedSet = new Set(getDismissedReorderIds());

  // Aggregate sales in the observation period
  const salesMap = new Map<string, number>();
  for (const s of recentSales) {
    salesMap.set(s.productId, +( (salesMap.get(s.productId) ?? 0) + s.quantity ).toFixed(6));
  }

  const recommendations: SmartReorderRecommendation[] = [];

  for (const product of products) {
    const isDismissed = dismissedSet.has(product.id);
    if (isDismissed && !includeDismissed) {
      continue;
    }

    const totalSold = salesMap.get(product.id) ?? 0;
    const averageDailySales = +(totalSold / lookbackDays).toFixed(3);
    const hasSufficientHistory = product.createdAt <= threeDaysAgo;

    let daysOfStockRemaining: number | null = null;
    let suggestedOrderQuantity = 0;
    let shouldRecommend = false;
    let reasonText = '';

    const isBelowThreshold = product.quantity < product.lowStockThreshold;

    if (averageDailySales > 0) {
      daysOfStockRemaining = +(product.quantity / averageDailySales).toFixed(1);

      // Target coverage buffer (at least targetDays cover or lowStockThreshold)
      const targetStock = Math.max(
        product.lowStockThreshold,
        +(averageDailySales * targetDays).toFixed(3),
      );

      if (product.quantity < targetStock || isBelowThreshold) {
        shouldRecommend = true;
        suggestedOrderQuantity = Math.max(
          +(targetStock - product.quantity).toFixed(3),
          isBelowThreshold ? +(product.lowStockThreshold - product.quantity).toFixed(3) : 0,
        );

        reasonText = `Daily sales: ~${averageDailySales} ${product.unit}/day over ${lookbackDays}d • ~${daysOfStockRemaining}d stock remaining.`;
      }
    } else {
      // Zero sales in observation window
      if (isBelowThreshold) {
        shouldRecommend = true;
        const deficit = +(product.lowStockThreshold - product.quantity).toFixed(3);
        suggestedOrderQuantity = deficit;
        daysOfStockRemaining = null;
        reasonText = `Below threshold by ${deficit} ${product.unit} (zero sales recorded in last ${lookbackDays}d).`;
      }
    }

    if (shouldRecommend && suggestedOrderQuantity > 0) {
      recommendations.push({
        product,
        classification: isBelowThreshold ? 'low_stock' : 'reorder_suggested',
        currentStock: product.quantity,
        lowStockThreshold: product.lowStockThreshold,
        unit: product.unit,
        observationDays: lookbackDays,
        totalSoldInWindow: totalSold,
        averageDailySales,
        daysOfStockRemaining,
        hasSufficientHistory,
        suggestedOrderQuantity,
        calculationReason: reasonText,
        targetDaysCoverage: targetDays,
        isDismissed,
      });
    }
  }

  // Sort by urgency:
  // 1. Zero stock first
  // 2. Low stock with least days remaining
  // 3. Reorder suggested
  recommendations.sort((a, b) => {
    if (a.currentStock === 0 && b.currentStock > 0) return -1;
    if (b.currentStock === 0 && a.currentStock > 0) return 1;

    if (a.classification === 'low_stock' && b.classification !== 'low_stock') return -1;
    if (b.classification === 'low_stock' && a.classification !== 'low_stock') return 1;

    const daysA = a.daysOfStockRemaining ?? 999;
    const daysB = b.daysOfStockRemaining ?? 999;
    return daysA - daysB;
  });

  return recommendations;
}

/**
 * Formats a clean, readable supplier order message for WhatsApp or clipboard sharing.
 */
export function formatWhatsAppOrderMessage(
  list: SupplierOrderList,
  shopName?: string,
  lang: 'hi' | 'en' = 'en',
): { rawMessage: string; encodedUrl: string } {
  const isHi = lang === 'hi';
  const storeTitle = shopName || 'सौदासम्राट किराना स्टोर';
  const dateStr = new Date(list.createdAt).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [
    isHi
      ? `📦 *थोक सामान आर्डर लिस्ट*`
      : `📦 *WHOLESALE REORDER LIST*`,
    isHi
      ? `🏪 *दुकान:* ${storeTitle}`
      : `🏪 *Shop:* ${storeTitle}`,
    isHi
      ? `📅 *तारीख:* ${dateStr}`
      : `📅 *Date:* ${dateStr}`,
  ];

  if (list.supplierName && list.supplierName.trim()) {
    lines.push(
      isHi
        ? `👤 *सप्लायर/डीलर:* ${list.supplierName.trim()}`
        : `👤 *Supplier/Dealer:* ${list.supplierName.trim()}`,
    );
  }

  lines.push('');
  lines.push(
    isHi
      ? `*आर्डर की सूची (सामान व मात्रा):*`
      : `*Order Items & Quantities:*`,
  );

  list.items.forEach((item, index) => {
    lines.push(`${index + 1}. *${item.productName}* — ${item.quantity} ${item.unit}`);
  });

  if (list.notes && list.notes.trim()) {
    lines.push('');
    lines.push(
      isHi
        ? `📝 *टिप्पणी:* ${list.notes.trim()}`
        : `📝 *Note:* ${list.notes.trim()}`,
    );
  }

  lines.push('');
  lines.push(
    isHi
      ? `_सौदासम्राट ऐप द्वारा तैयार किया गया_`
      : `_Generated via SaudaSamrat kirana assistant_`,
  );

  const rawMessage = lines.join('\n');
  const encodedUrl = `https://wa.me/?text=${encodeURIComponent(rawMessage)}`;

  return { rawMessage, encodedUrl };
}
