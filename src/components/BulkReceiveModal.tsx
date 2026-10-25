// =============================================================================
// SaudaSamrat — Bulk Stock Receiving Modal
// Multi-product atomic stock receiving workflow with live stock preview.
// =============================================================================

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useLang } from '../i18n/LangContext';
import { bulkReceiveStock } from '../services';
import type { Product, BulkReceiveResult } from '../types';
import { formatQty } from '../utils/format';

interface BulkReceiveModalProps {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onSuccess: (result: BulkReceiveResult) => void;
}

interface SelectedReceiveItem {
  product: Product;
  quantityStr: string;
}

export function BulkReceiveModal({
  open,
  products,
  onClose,
  onSuccess,
}: BulkReceiveModalProps) {
  const { t } = useLang();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedReceiveItem>>(new Map());
  const [shipmentNote, setShipmentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filter available products
  const availableProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      if (p.status === 'archived') return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    });
  }, [products, searchTerm]);

  function handleToggleProduct(p: Product) {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        next.set(p.id, { product: p, quantityStr: '1' });
      }
      return next;
    });
    if (errorMsg) setErrorMsg('');
  }

  function handleQuantityChange(productId: string, val: string) {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (existing) {
        next.set(productId, { ...existing, quantityStr: val });
      }
      return next;
    });
    if (errorMsg) setErrorMsg('');
  }

  function handleIncrement(productId: string, delta: number) {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId);
      if (existing) {
        const current = parseFloat(existing.quantityStr) || 0;
        const updated = Math.max(0, +(current + delta).toFixed(3));
        next.set(productId, { ...existing, quantityStr: String(updated) });
      }
      return next;
    });
  }

  function handleRemoveItem(productId: string) {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }

  async function handleConfirmReceive() {
    if (selectedItems.size === 0) {
      setErrorMsg(t('noItemsSelected'));
      return;
    }

    const items: { productId: string; quantity: number }[] = [];
    for (const [productId, item] of selectedItems.entries()) {
      const parsed = parseFloat(item.quantityStr);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setErrorMsg(`${item.product.name}: ${t('errorNegative')}`);
        return;
      }
      items.push({ productId, quantity: parsed });
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const result = await bulkReceiveStock({
        items,
        note: shipmentNote.trim() || undefined,
      });
      setIsSubmitting(false);
      setSelectedItems(new Map());
      setSearchTerm('');
      setShipmentNote('');
      onSuccess(result);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      console.error('[SaudaSamrat] Bulk receive error:', err);
      setErrorMsg(err instanceof Error ? err.message : t('errorGeneric'));
    }
  }

  const selectedCount = selectedItems.size;

  return (
    <Modal
      open={open}
      title={t('bulkReceiveTitle')}
      onClose={() => !isSubmitting && onClose()}
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            fullWidth
            id="bulk-receive-cancel-btn"
          >
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmReceive}
            disabled={isSubmitting || selectedCount === 0}
            fullWidth
            id="bulk-receive-confirm-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('loading')}
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                {t('confirmReceive')} ({selectedCount})
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Error notification */}
        {errorMsg && (
          <div className="flex items-center gap-2 bg-[#FDF2F0] border border-[#FADCD7] rounded-xl p-3 text-xs text-[#E86D5A] font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Selected Items Review Section */}
        {selectedCount > 0 && (
          <div className="bg-[#DFF5E8]/40 border border-[#C1EBD2] rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#155E46] uppercase tracking-wider">
                <ClipboardList size={14} />
                <span>
                  {t('receivingSummary')} ({selectedCount})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItems(new Map())}
                className="text-[11px] font-bold text-[#E86D5A] hover:underline cursor-pointer"
              >
                {t('cancel')}
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
              {Array.from(selectedItems.values()).map(({ product, quantityStr }) => {
                const addQty = parseFloat(quantityStr) || 0;
                const newStock = +(product.quantity + addQty).toFixed(3);

                return (
                  <div
                    key={product.id}
                    className="bg-white border border-[#E5EAE3] rounded-xl p-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#20352C] text-xs truncate">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-[#6B7C72] mt-0.5">
                          {t('inStock')}: {formatQty(product.quantity, product.unit)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(product.id)}
                        className="text-[#6B7C72] hover:text-[#E86D5A] p-1.5 rounded-lg cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title={t('cancel')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-[#6B7C72] block mb-1">
                          {t('receivedQty')} ({product.unit})
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={quantityStr}
                          onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                          className="w-full bg-[#F9F7EF] border border-[#E5EAE3] rounded-lg px-2.5 py-1.5 text-sm font-extrabold text-[#20352C] outline-none focus:border-[#087F5B]"
                        />
                      </div>

                      {/* Quick increments */}
                      <div className="flex items-end gap-1 pt-4">
                        {[1, 5, 10].map((inc) => (
                          <button
                            key={inc}
                            type="button"
                            onClick={() => handleIncrement(product.id, inc)}
                            className="bg-[#DFF5E8] hover:bg-[#C1EBD2] text-[#155E46] text-xs font-bold px-2 py-1.5 rounded-lg border border-[#C1EBD2] cursor-pointer min-h-[38px] transition-colors"
                          >
                            +{inc}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* New stock preview */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#E5EAE3]/60 text-[11px] text-[#155E46] font-semibold">
                      <span>{t('newStockPreview')}:</span>
                      <span className="font-extrabold">
                        {formatQty(newStock, product.unit)}
                      </span>
                      <ArrowRight size={11} className="text-[#6B7C72]" />
                      <span className="text-[10px] text-[#087F5B]">
                        (+{formatQty(addQty, product.unit)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional shipment note */}
            <div className="mt-3 pt-2.5 border-t border-[#C1EBD2]">
              <input
                type="text"
                value={shipmentNote}
                onChange={(e) => setShipmentNote(e.target.value)}
                placeholder={t('notePlaceholder')}
                className="w-full bg-white border border-[#E5EAE3] rounded-xl px-3 py-2 text-xs text-[#20352C] outline-none focus:border-[#087F5B]"
              />
            </div>
          </div>
        )}

        {/* Product Search & Multi-select */}
        <div>
          <label className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider block mb-1.5">
            {t('addItemsToReceive')}
          </label>
          <div className="relative mb-2">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C72]"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-white border border-[#E5EAE3] rounded-xl pl-9 pr-3 py-2 text-xs text-[#20352C] outline-none focus:border-[#087F5B]"
              id="bulk-receive-search-input"
            />
          </div>

          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto border border-[#E5EAE3] rounded-2xl p-2 bg-white">
            {availableProducts.length === 0 ? (
              <p className="text-center text-xs text-[#6B7C72] py-4 font-medium">
                {t('noProducts')}
              </p>
            ) : (
              availableProducts.map((p) => {
                const isSelected = selectedItems.has(p.id);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleToggleProduct(p)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[46px] ${
                      isSelected
                        ? 'border-[#087F5B] bg-[#DFF5E8] text-[#155E46] font-bold'
                        : 'border-[#E5EAE3] bg-white hover:border-[#C1EBD2] text-[#20352C]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{p.name}</p>
                      <p className="text-[10px] text-[#6B7C72] font-medium">
                        {t('inStock')}: {formatQty(p.quantity, p.unit)}
                      </p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-[#087F5B] text-white border-[#087F5B]'
                          : 'bg-[#F9F7EF] text-[#6B7C72] border-[#E5EAE3]'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
