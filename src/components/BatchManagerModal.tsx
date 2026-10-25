// =============================================================================
// SaudaSamrat — Batch & Expiry Manager Modal (Phase 8)
// View batches, add new batch, write-off expired batches with live status badges.
// =============================================================================

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Calendar,
  AlertTriangle,
  Clock,
  Trash2,
  Plus,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useLang } from '../i18n/LangContext';
import {
  getBatchesForProduct,
  addBatch,
  writeOffBatch,
  calculateExpiryStatus,
} from '../services';
import type { Product, ProductBatch, ExpiryStatus } from '../types';
import { formatQty } from '../utils/format';

interface BatchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onStockChanged: () => void;
}

export function BatchManagerModal({
  isOpen,
  onClose,
  product,
  onStockChanged,
}: BatchManagerModalProps) {
  const { t, lang } = useLang();
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New batch fields
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantityStr, setQuantityStr] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load batches for the selected product
  const loadBatches = useCallback(async () => {
    if (!product) return;
    setLoading(true);
    try {
      const data = await getBatchesForProduct(product.id);
      setBatches(data);
    } finally {
      setLoading(false);
    }
  }, [product]);

  useEffect(() => {
    if (isOpen && product) {
      loadBatches();
      setShowAddForm(false);
      setBatchNumber('');
      setExpiryDate('');
      setQuantityStr('');
      setFormError('');
    }
  }, [isOpen, product, loadBatches]);

  async function handleAddBatch(e: FormEvent) {
    e.preventDefault();
    if (!product) return;
    setFormError('');

    const qty = parseFloat(quantityStr);
    if (!batchNumber.trim()) {
      setFormError(lang === 'hi' ? 'बैच नंबर आवश्यक है' : 'Batch number is required');
      return;
    }
    if (!expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      setFormError(t('invalidExpiryDate'));
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setFormError(lang === 'hi' ? 'मात्रा 0 से अधिक होनी चाहिए' : 'Quantity must be greater than zero');
      return;
    }

    try {
      setSubmitting(true);
      await addBatch({
        productId: product.id,
        batchNumber: batchNumber.trim(),
        expiryDate: expiryDate.trim(),
        quantity: qty,
      });

      setBatchNumber('');
      setExpiryDate('');
      setQuantityStr('');
      setShowAddForm(false);
      await loadBatches();
      onStockChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('errorGeneric');
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWriteOff(batch: ProductBatch) {
    const confirmMsg =
      lang === 'hi'
        ? `क्या आप बैच ${batch.batchNumber} (${formatQty(batch.quantity, product?.unit || 'piece')}) को नष्ट / रद्द करना चाहते हैं?`
        : `Write off batch ${batch.batchNumber} (${formatQty(batch.quantity, product?.unit || 'piece')})? Stock will be reduced.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await writeOffBatch(batch.id, 'expired');
      await loadBatches();
      onStockChanged();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error writing off batch');
    }
  }

  function renderStatusBadge(status: ExpiryStatus, days: number) {
    if (status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FDF2F0] text-[#E86D5A] border border-[#FADCD7]">
          <AlertTriangle size={12} />
          {t('statusExpired')} ({Math.abs(days)} {lang === 'hi' ? 'दिन पहले' : 'days ago'})
        </span>
      );
    }
    if (status === 'expiring_soon') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FFF4E0] text-[#8D5300] border border-[#FFE3B3]">
          <Clock size={12} />
          {t('statusExpiringSoon')} ({days} {lang === 'hi' ? 'दिन बाकी' : 'days left'})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2]">
        <ShieldCheck size={12} />
        {t('statusGood')} ({days} {lang === 'hi' ? 'दिन' : 'days'})
      </span>
    );
  }

  if (!product) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`${product.name} — ${t('batchesTitle')}`}
    >
      <div className="space-y-4">
        {/* Product Stock Summary */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F9F7EF] border border-[#E5EAE3]">
          <div>
            <p className="text-xs text-[#6B7C72] font-semibold">{t('inStock')}</p>
            <p className="text-lg font-bold text-[#20352C]">
              {formatQty(product.quantity, product.unit)}
            </p>
          </div>
          <Button
            size="sm"
            variant={showAddForm ? 'secondary' : 'primary'}
            onClick={() => setShowAddForm(!showAddForm)}
            id="batch-toggle-add-btn"
          >
            <Plus size={15} />
            {t('addBatch')}
          </Button>
        </div>

        {/* Add Batch Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddBatch}
            className="p-4 rounded-2xl border border-[#C1EBD2] bg-white shadow-xs space-y-3"
            id="add-batch-form"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#155E46] flex items-center gap-1.5">
              <Calendar size={14} />
              {t('addBatch')}
            </h4>

            {formError && (
              <p className="text-xs font-bold text-[#E86D5A] bg-[#FDF2F0] p-2.5 rounded-xl border border-[#FADCD7]">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#6B7C72] mb-1">
                  {t('batchNumber')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B-2024"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5EAE3] text-sm text-[#20352C] bg-[#F9F7EF] outline-none focus:border-[#087F5B] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7C72] mb-1">
                  {t('expiryDate')} (YYYY-MM-DD) *
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5EAE3] text-sm text-[#20352C] bg-[#F9F7EF] outline-none focus:border-[#087F5B] min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B7C72] mb-1">
                  {t('batchQuantity')} ({product.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  placeholder="0"
                  value={quantityStr}
                  onChange={(e) => setQuantityStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5EAE3] text-sm text-[#20352C] bg-[#F9F7EF] outline-none focus:border-[#087F5B] min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                id="batch-submit-btn"
              >
                <CheckCircle2 size={15} />
                {t('save')}
              </Button>
            </div>
          </form>
        )}

        {/* Batch List */}
        <div>
          <h4 className="text-xs font-bold text-[#6B7C72] mb-2 uppercase tracking-wider">
            {t('batchesTitle')} ({batches.length})
          </h4>

          {loading ? (
            <p className="text-xs text-[#6B7C72] py-4 text-center">Loading...</p>
          ) : batches.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-white border border-[#E5EAE3]">
              <Calendar size={28} className="mx-auto text-[#6B7C72]/50 mb-2" />
              <p className="text-xs font-semibold text-[#6B7C72]">{t('noBatches')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {batches.map((b) => {
                const { status, daysRemaining } = calculateExpiryStatus(b.expiryDate);
                return (
                  <div
                    key={b.id}
                    className="p-3 bg-white rounded-2xl border border-[#E5EAE3] flex items-center justify-between gap-3 shadow-2xs hover:border-[#C1EBD2] transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#20352C]">
                          {b.batchNumber}
                        </span>
                        {renderStatusBadge(status, daysRemaining)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#6B7C72]">
                        <span>
                          {t('expiryDate')}: <b className="text-[#20352C]">{b.expiryDate}</b>
                        </span>
                        <span>•</span>
                        <span>
                          {t('batchQuantity')}:{' '}
                          <b className="text-[#20352C]">
                            {formatQty(b.quantity, product.unit)}
                          </b>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleWriteOff(b)}
                      title={t('writeOffBatch')}
                      className="p-2 text-[#E86D5A] hover:bg-[#FDF2F0] rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={t('writeOffBatch')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
