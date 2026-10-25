// =============================================================================
// SaudaSamrat — Daily Summary & Sales Trends Service
// Deterministic daily overview and sales trends based on recorded local data.
// =============================================================================

import { db } from '../db';
import type { Unit } from '../types';

export interface UnitQuantitySummary {
  unit: Unit;
  totalQuantity: number;
}

export interface TopSoldProduct {
  productId: string;
  productName: string;
  quantity: number;
  unit: Unit;
  transactionCount: number;
}

export interface DailySummaryReport {
  dateStr: string;
  startOfDay: number;
  endOfDay: number;
  salesTransactionCount: number;
  unitsSold: UnitQuantitySummary[];
  topSoldProducts: TopSoldProduct[];
  restockTransactionsCount: number;
  restockUnits: UnitQuantitySummary[];
  manualAdjustmentsCount: number;
  lowStockItemsCount: number;
  previousDayComparison: {
    hasPreviousData: boolean;
    salesCountDelta: number;
    yesterdayTransactionCount: number;
  };
}

/**
 * Computes a lightweight, deterministic daily summary report for the store.
 * Accurately calculates day boundaries based on device local time and respects reversed sales.
 */
export async function getDailySummary(targetDate?: Date): Promise<DailySummaryReport> {
  const d = targetDate ? new Date(targetDate) : new Date();

  // Local start of day and end of day
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

  // Previous day boundaries
  const yesterday = new Date(d);
  yesterday.setDate(yesterday.getDate() - 1);
  const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0).getTime();
  const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).getTime();

  const [salesInDay, adjustmentsInDay, yesterdaySales, activeProducts, allAdjustments] =
    await Promise.all([
      db.sales.where('soldAt').between(startOfDay, endOfDay, true, true).toArray(),
      db.stockAdjustments.where('adjustedAt').between(startOfDay, endOfDay, true, true).toArray(),
      db.sales.where('soldAt').between(startOfYesterday, endOfYesterday, true, true).toArray(),
      db.products.where('status').equals('active').toArray(),
      db.stockAdjustments.toArray(),
    ]);

  // Identify reversed sales
  const reversedSaleIds = new Set<string>();
  for (const a of allAdjustments) {
    if (a.reversedSaleId) reversedSaleIds.add(a.reversedSaleId);
  }

  // Active (non-reversed) sales for today
  const validTodaySales = salesInDay.filter((s) => !reversedSaleIds.has(s.id));
  const validYesterdaySales = yesterdaySales.filter((s) => !reversedSaleIds.has(s.id));

  // 1. Quantities sold by unit
  const unitMap = new Map<Unit, number>();
  // 2. Frequency per product
  const productSalesMap = new Map<
    string,
    { name: string; quantity: number; unit: Unit; count: number }
  >();

  for (const s of validTodaySales) {
    unitMap.set(s.unit, +((unitMap.get(s.unit) ?? 0) + s.quantity).toFixed(6));

    const existing = productSalesMap.get(s.productId) ?? {
      name: s.productName,
      quantity: 0,
      unit: s.unit,
      count: 0,
    };
    existing.quantity = +(existing.quantity + s.quantity).toFixed(6);
    existing.count += 1;
    productSalesMap.set(s.productId, existing);
  }

  const unitsSold: UnitQuantitySummary[] = Array.from(unitMap.entries())
    .map(([unit, totalQuantity]) => ({ unit, totalQuantity }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);

  const topSoldProducts: TopSoldProduct[] = Array.from(productSalesMap.entries())
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      quantity: data.quantity,
      unit: data.unit,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // 3. Restocks & Adjustments in day
  let restockTransactionsCount = 0;
  let manualAdjustmentsCount = 0;
  const restockUnitMap = new Map<Unit, number>();

  // Map products for unit lookup
  const prodUnitMap = new Map<string, Unit>();
  for (const p of activeProducts) {
    prodUnitMap.set(p.id, p.unit);
  }

  for (const a of adjustmentsInDay) {
    if (a.reason === 'restock' && !a.isReversal) {
      restockTransactionsCount++;
      const unit = prodUnitMap.get(a.productId) || 'piece';
      restockUnitMap.set(unit, +((restockUnitMap.get(unit) ?? 0) + a.delta).toFixed(6));
    } else if (a.reason === 'manual_correction') {
      manualAdjustmentsCount++;
    }
  }

  const restockUnits: UnitQuantitySummary[] = Array.from(restockUnitMap.entries()).map(
    ([unit, totalQuantity]) => ({ unit, totalQuantity }),
  );

  // 4. Products currently below threshold
  const lowStockItemsCount = activeProducts.filter(
    (p) => p.quantity < p.lowStockThreshold,
  ).length;

  const dateStr = d.toISOString().slice(0, 10);

  return {
    dateStr,
    startOfDay,
    endOfDay,
    salesTransactionCount: validTodaySales.length,
    unitsSold,
    topSoldProducts,
    restockTransactionsCount,
    restockUnits,
    manualAdjustmentsCount,
    lowStockItemsCount,
    previousDayComparison: {
      hasPreviousData: validYesterdaySales.length > 0,
      salesCountDelta: validTodaySales.length - validYesterdaySales.length,
      yesterdayTransactionCount: validYesterdaySales.length,
    },
  };
}
