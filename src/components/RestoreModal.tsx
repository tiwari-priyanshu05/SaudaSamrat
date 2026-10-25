// =============================================================================
// SaudaSamrat — Restore Preview & Mode Selection Modal
// =============================================================================

import { useState } from 'react';
import {
  Package,
  ShoppingCart,
  History,
  Store,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  GitMerge,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useLang } from '../i18n/LangContext';
import type { BackupPayload, RestoreMode, RestoreResult } from '../types';
import { restoreShopData } from '../services';

interface RestoreModalProps {
  open: boolean;
  payload: BackupPayload | null;
  onClose: () => void;
  onSuccess: (result: RestoreResult) => void;
  onError: (errorMsg: string) => void;
}

export function RestoreModal({
  open,
  payload,
  onClose,
  onSuccess,
  onError,
}: RestoreModalProps) {
  const { t } = useLang();
  const [mode, setMode] = useState<RestoreMode>('merge');
  const [isRestoring, setIsRestoring] = useState(false);

  if (!payload) return null;

  const { metadata, data } = payload;
  const dateFormatted = new Date(metadata.exportedAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  async function handleConfirm() {
    if (!payload) return;
    setIsRestoring(true);
    try {
      const res = await restoreShopData(payload, mode);
      setIsRestoring(false);
      onSuccess(res);
      onClose();
    } catch (err) {
      setIsRestoring(false);
      console.error('[SaudaSamrat] Restore failed:', err);
      onError(err instanceof Error ? err.message : t('restoreFailed'));
    }
  }

  return (
    <Modal
      open={open}
      title={t('restorePreviewTitle')}
      onClose={() => !isRestoring && onClose()}
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isRestoring}
            fullWidth
            id="restore-cancel-btn"
          >
            {t('cancel')}
          </Button>
          <Button
            variant={mode === 'replace' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={isRestoring}
            fullWidth
            id="restore-confirm-btn"
          >
            {isRestoring ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('loading')}
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                {t('confirmRestore')}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Source metadata card */}
        <div className="bg-[#F9F7EF] border border-[#E5EAE3] rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-xs text-[#6B7C72] mb-2">
            <span className="flex items-center gap-1.5 font-semibold text-[#20352C]">
              <Store size={15} className="text-[#087F5B]" />
              {metadata.appName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {dateFormatted}
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[#6B7C72] uppercase tracking-wider mb-2">
            {t('backupContains')}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white border border-[#E5EAE3] rounded-xl p-2 shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-[#087F5B] mb-0.5">
                <Package size={13} />
                <span className="text-sm font-extrabold text-[#20352C]">
                  {data.products.length}
                </span>
              </div>
              <p className="text-[10px] text-[#6B7C72] font-medium">{t('totalProducts')}</p>
            </div>
            <div className="bg-white border border-[#E5EAE3] rounded-xl p-2 shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-[#087F5B] mb-0.5">
                <ShoppingCart size={13} />
                <span className="text-sm font-extrabold text-[#20352C]">
                  {data.sales.length}
                </span>
              </div>
              <p className="text-[10px] text-[#6B7C72] font-medium">{t('historyTitle')}</p>
            </div>
            <div className="bg-white border border-[#E5EAE3] rounded-xl p-2 shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-[#087F5B] mb-0.5">
                <History size={13} />
                <span className="text-sm font-extrabold text-[#20352C]">
                  {data.stockAdjustments.length}
                </span>
              </div>
              <p className="text-[10px] text-[#6B7C72] font-medium">{t('totalAuditsCount')}</p>
            </div>
          </div>

          {(data.profile || data.customCategories.length > 0) && (
            <div className="mt-2.5 pt-2 border-t border-[#E5EAE3] flex flex-wrap gap-2 text-[11px] text-[#6B7C72]">
              {data.profile && (
                <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#E5EAE3]">
                  <Store size={11} className="text-[#087F5B]" />
                  {data.profile.shopName} ({data.profile.ownerName})
                </span>
              )}
              {data.customCategories.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#E5EAE3]">
                  <Layers size={11} className="text-[#087F5B]" />
                  {data.customCategories.length} {t('categoriesTitle')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mode selector */}
        <div>
          <h3 className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider mb-2">
            {t('restoreModeTitle')}
          </h3>

          <div className="flex flex-col gap-2.5">
            {/* Merge option */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                mode === 'merge'
                  ? 'border-[#087F5B] bg-[#DFF5E8] shadow-2xs'
                  : 'border-[#E5EAE3] bg-white hover:border-[#C1EBD2]'
              }`}
            >
              <input
                type="radio"
                name="restoreMode"
                value="merge"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
                className="mt-0.5 text-[#087F5B] focus:ring-[#087F5B]"
                id="restore-mode-merge"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-sm text-[#20352C]">
                  <GitMerge size={15} className="text-[#087F5B]" />
                  {t('restoreModeMerge')}
                </div>
                <p className="text-xs text-[#6B7C72] mt-1 leading-relaxed">
                  {t('restoreModeMergeDesc')}
                </p>
              </div>
            </label>

            {/* Replace option */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                mode === 'replace'
                  ? 'border-[#E86D5A] bg-[#FDF2F0] shadow-2xs'
                  : 'border-[#E5EAE3] bg-white hover:border-[#FADCD7]'
              }`}
            >
              <input
                type="radio"
                name="restoreMode"
                value="replace"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="mt-0.5 text-[#E86D5A] focus:ring-[#E86D5A]"
                id="restore-mode-replace"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-sm text-[#E86D5A]">
                  <Trash2 size={15} />
                  {t('restoreModeReplace')}
                </div>
                <p className="text-xs text-[#B53826] mt-1 leading-relaxed">
                  {t('restoreModeReplaceDesc')}
                </p>
              </div>
            </label>
          </div>
        </div>

        {mode === 'replace' && (
          <div className="flex items-start gap-2 bg-[#FDF2F0] border border-[#FADCD7] rounded-xl p-3 text-xs text-[#E86D5A]">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              {t('restoreModeReplaceDesc')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
