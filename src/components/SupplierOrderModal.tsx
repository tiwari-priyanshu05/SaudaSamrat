// =============================================================================
// SaudaSamrat — Supplier Order List & WhatsApp Sharing Modal
// Prepares customizable purchase orders with offline WhatsApp / clipboard handoff.
// =============================================================================

import { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Building2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useLang } from '../i18n/LangContext';
import { formatWhatsAppOrderMessage } from '../services';
import type { OrderListItem, SupplierOrderList } from '../types';

interface SupplierOrderModalProps {
  open: boolean;
  initialItems: OrderListItem[];
  shopName?: string;
  onClose: () => void;
}

export function SupplierOrderModal({
  open,
  initialItems,
  shopName,
  onClose,
}: SupplierOrderModalProps) {
  const { t, lang } = useLang();
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderListItem[]>(initialItems);
  const [copied, setCopied] = useState(false);

  // Sync if initialItems change when modal opens
  if (items.length !== initialItems.length && open) {
    setItems(initialItems);
  }

  function handleQuantityChange(index: number, val: string) {
    const parsed = parseFloat(val) || 0;
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: parsed };
      return next;
    });
  }

  function handleRemove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const orderList: SupplierOrderList = {
    id: `order-${Date.now()}`,
    supplierName: supplierName.trim() || undefined,
    items: items.filter((i) => i.quantity > 0),
    createdAt: Date.now(),
    notes: notes.trim() || undefined,
  };

  const { rawMessage, encodedUrl } = formatWhatsAppOrderMessage(orderList, shopName, lang);

  function handleShareWhatsApp() {
    window.open(encodedUrl, '_blank', 'noopener');
  }

  function handleCopy() {
    navigator.clipboard.writeText(rawMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <Modal
      open={open}
      title={t('reviewAndShare')}
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            onClick={handleCopy}
            className="flex-1 !py-2.5"
            id="order-copy-btn"
          >
            {copied ? <Check size={16} className="text-[#087F5B]" /> : <Copy size={16} />}
            {copied ? t('orderCopied') : t('copyOrderText')}
          </Button>
          <Button
            variant="primary"
            onClick={handleShareWhatsApp}
            disabled={items.length === 0}
            className="flex-1 !py-2.5 shadow-sm shadow-[#087F5B]/20"
            id="order-whatsapp-btn"
          >
            <Share2 size={16} />
            {t('shareWhatsApp')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Supplier name input */}
        <div>
          <label className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider block mb-1">
            {t('supplierNameOptional')}
          </label>
          <div className="relative">
            <Building2
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7C72]"
            />
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder={t('supplierNamePlaceholder')}
              className="w-full bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl pl-9 pr-3 py-2 text-xs text-[#20352C] outline-none focus:border-[#087F5B] min-h-[44px]"
            />
          </div>
        </div>

        {/* Items checklist */}
        <div>
          <p className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider mb-2">
            {t('items')} ({items.length})
          </p>
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
            {items.map((item, index) => (
              <div
                key={item.productId}
                className="flex items-center justify-between p-2.5 bg-white border border-[#E5EAE3] rounded-xl shadow-2xs gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#20352C] truncate">
                    {item.productName}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    className="w-16 text-center bg-[#F9F7EF] border border-[#E5EAE3] rounded-lg py-1.5 text-xs font-extrabold text-[#20352C] outline-none focus:border-[#087F5B] min-h-[38px]"
                  />
                  <span className="text-xs text-[#6B7C72] font-semibold w-12 truncate">
                    {item.unit}
                  </span>
                  <button
                    onClick={() => handleRemove(index)}
                    className="text-[#6B7C72] hover:text-[#E86D5A] p-1.5 text-xs min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg"
                    title={t('cancel')}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optional note */}
        <div>
          <label className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider block mb-1">
            {t('noteOptional')}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notePlaceholder')}
            className="w-full bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl px-3 py-2 text-xs text-[#20352C] outline-none focus:border-[#087F5B] min-h-[44px]"
          />
        </div>

        {/* WhatsApp Preview Box */}
        <div className="bg-[#DFF5E8]/40 border border-[#C1EBD2] rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#155E46] mb-1.5">
            <FileText size={14} />
            <span>Message Preview</span>
          </div>
          <pre className="text-[11px] text-[#20352C] whitespace-pre-wrap font-sans leading-relaxed max-h-32 overflow-y-auto">
            {rawMessage}
          </pre>
        </div>

        {/* Delivery disclaimer */}
        <div className="flex items-start gap-2 bg-[#FFF4E0] border border-[#FFE3B3] rounded-xl p-3 text-xs text-[#8D5300]">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed font-medium">
            {t('whatsappDisclaimer')}
          </p>
        </div>
      </div>
    </Modal>
  );
}
