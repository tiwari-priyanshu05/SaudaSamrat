// =============================================================================
// SaudaSamrat — Local Backup & Restore Types
// Versioned offline backup format for IndexedDB & LocalStorage state.
// =============================================================================

import type { Product, Sale, StockAdjustment, ShopProfile, ProductBatch } from './index';

export const CURRENT_BACKUP_VERSION = '1.0.0';

export interface BackupMetadata {
  app: 'SaudaSamrat';
  version: string; // e.g. "1.0.0"
  exportedAt: number; // Unix epoch ms
  appName: string;
  recordCounts: {
    products: number;
    sales: number;
    stockAdjustments: number;
    hasProfile: boolean;
    customCategories: number;
    batches?: number;
  };
}

export interface BackupPayload {
  metadata: BackupMetadata;
  data: {
    products: Product[];
    sales: Sale[];
    stockAdjustments: StockAdjustment[];
    profile: ShopProfile | null;
    customCategories: string[];
    batches?: ProductBatch[];
  };
}

export type RestoreMode = 'merge' | 'replace';

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  errorCode?:
    | 'EMPTY_FILE'
    | 'INVALID_JSON'
    | 'UNSUPPORTED_APP'
    | 'UNSUPPORTED_VERSION'
    | 'MALFORMED_STRUCTURE'
    | 'INVALID_RECORD'
    | 'DUPLICATE_ID'
    | 'ORPHAN_REFERENCE';
  payload?: BackupPayload;
  warnings?: string[];
}

export interface RestoreResult {
  success: boolean;
  mode: RestoreMode;
  restoredCounts: {
    products: number;
    sales: number;
    stockAdjustments: number;
    profileRestored: boolean;
    customCategories: number;
    batches?: number;
  };
  durationMs: number;
}
