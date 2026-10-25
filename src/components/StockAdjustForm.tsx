import React, { useState } from 'react';
import { Button } from './Button';
import { Input, Select } from './Input';
import { useLang } from '../i18n/LangContext';
import type { Product, StockAdjustmentReason, StockAdjustmentInput } from '../types';
import { formatQty } from '../utils/format';

interface StockAdjustFormProps {
  product: Product;
  onSubmit: (input: StockAdjustmentInput) => Promise<void>;
  onCancel: () => void;
}

const REASONS: { value: StockAdjustmentReason; labelKey: 'reasonManual' | 'reasonRestock' | 'reasonDamage' | 'reasonReturn' }[] = [
  { value: 'restock', labelKey: 'reasonRestock' },
  { value: 'manual_correction', labelKey: 'reasonManual' },
  { value: 'damage', labelKey: 'reasonDamage' },
  { value: 'return', labelKey: 'reasonReturn' },
];

export function StockAdjustForm({ product, onSubmit, onCancel }: StockAdjustFormProps) {
  const { t } = useLang();
  const [deltaStr, setDeltaStr] = useState('');
  const [direction, setDirection] = useState<'add' | 'remove'>('add');
  const [reason, setReason] = useState<StockAdjustmentReason>('restock');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const delta = parseFloat(deltaStr);
  const effectiveDelta = direction === 'add' ? Math.abs(delta) : -Math.abs(delta);
  const resultQty = Number.isFinite(delta) ? +(product.quantity + effectiveDelta).toFixed(6) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(delta) || delta <= 0) {
      setError(t('errorNegative'));
      return;
    }
    if (direction === 'remove' && Math.abs(delta) > product.quantity) {
      setError(t('errorExceedsStock'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        productId: product.id,
        delta: effectiveDelta,
        reason,
        note: note.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Current stock */}
      <div className="bg-[#F9F7EF] border border-[#E5EAE3] rounded-2xl p-3.5 text-center">
        <p className="text-xs font-semibold text-[#6B7C72] uppercase tracking-wider mb-1">
          {t('currentStock')}
        </p>
        <p className="text-2xl font-extrabold text-[#20352C]">
          {formatQty(product.quantity, product.unit)}
        </p>
      </div>

      {/* Direction toggle */}
      <div className="flex rounded-2xl border border-[#E5EAE3] p-1 bg-[#F9F7EF] gap-1">
        {(['add', 'remove'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[42px] ${
              direction === d
                ? d === 'add'
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'bg-[#E86D5A] text-white shadow-xs'
                : 'text-[#6B7C72] hover:text-[#20352C]'
            }`}
          >
            {d === 'add' ? `+ ${t('directionAdd')}` : `- ${t('directionRemove')}`}
          </button>
        ))}
      </div>

      <Input
        label={t('adjustmentDelta')}
        type="number"
        inputMode="decimal"
        value={deltaStr}
        onChange={(e) => {
          setDeltaStr(e.target.value);
          setError('');
        }}
        error={error}
        required
        min={0.001}
        step="any"
        placeholder="0"
        id="adjustment-delta"
      />

      {resultQty !== null && (
        <div
          className={`text-sm font-semibold text-center rounded-2xl px-3.5 py-2.5 border transition-all ${
            resultQty < 0
              ? 'bg-[#FDF2F0] border-[#F8C0B8] text-[#B53826]'
              : 'bg-[#DFF5E8] border-[#C1EBD2] text-[#155E46]'
          }`}
        >
          {t('remaining')}: {formatQty(Math.max(0, resultQty), product.unit)}
        </div>
      )}

      <Select
        label={t('adjustmentReason')}
        value={reason}
        onChange={(e) => setReason(e.target.value as StockAdjustmentReason)}
        options={REASONS.map((r) => ({ value: r.value, label: t(r.labelKey) }))}
        id="adjustment-reason"
      />

      <Input
        label={t('noteOptional')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('notePlaceholder')}
        id="adjustment-note"
      />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
          {t('cancel')}
        </Button>
        <Button type="submit" loading={submitting} fullWidth>
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
