import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Input, Select } from './Input';
import { useLang } from '../i18n/LangContext';
import type { Unit, ProductInput, Product } from '../types';
import {
  getCategoryOptions,
  addCustomCategory,
  subscribeCategories,
  formatCategory,
} from '../services/categories';
import { Check, X } from 'lucide-react';

interface ProductFormProps {
  initial?: Partial<Product>;
  onSubmit: (data: ProductInput) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const UNITS: Unit[] = [
  'piece',
  'packet',
  'bottle',
  'kg',
  'g',
  'litre',
  'ml',
  'dozen',
];

export function ProductForm({ initial, onSubmit, onCancel, submitLabel }: ProductFormProps) {
  const { t, lang } = useLang();
  const [name, setName] = useState(initial?.name ?? '');

  // Stable category value: default to 'grocery' if creating new, or preserve initial category
  const [category, setCategory] = useState<string>(() => {
    if (initial?.category && initial.category.trim()) {
      return initial.category.trim();
    }
    return 'grocery';
  });

  const [quantity, setQuantity] = useState(
    initial?.quantity !== undefined ? String(initial.quantity) : '',
  );
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'piece');
  const [threshold, setThreshold] = useState(
    initial?.lowStockThreshold !== undefined ? String(initial.lowStockThreshold) : '5',
  );
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Inline custom category creation mode
  const [creatingCustomCat, setCreatingCustomCat] = useState(false);
  const [customCatInput, setCustomCatInput] = useState('');
  const [customCatError, setCustomCatError] = useState('');
  const [categoriesVersion, setCategoriesVersion] = useState(0);

  useEffect(() => {
    const unsub = subscribeCategories(() => {
      setCategoriesVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Category options: Defaults + Custom + Existing Product's Category
  const categoryOptions = useMemo(() => {
    const opts = getCategoryOptions(initial ? [initial] : undefined, lang);

    // If initial has an unrecognized/legacy category not present in opts, ensure it's selectable
    if (category && !opts.some((o) => o.value.toLowerCase() === category.toLowerCase())) {
      opts.unshift({
        value: category,
        label: formatCategory(category, lang),
        isCustom: true,
      });
    }

    return [
      ...opts.map((o) => ({ value: o.value, label: o.label })),
      { value: '__add_custom__', label: t('addNewCategoryOption') },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, initial, lang, t, categoriesVersion]);

  const unitOptions = UNITS.map((u) => {
    let label = t('unitPiece');
    if (u === 'packet') label = t('unitPacket');
    else if (u === 'bottle') label = t('unitBottle');
    else if (u === 'kg') label = t('unitKg');
    else if (u === 'g') label = t('unitG');
    else if (u === 'litre') label = t('unitLitre');
    else if (u === 'ml') label = t('unitMl');
    else if (u === 'dozen') label = t('unitDozen');

    return { value: u, label };
  });

  function handleCategorySelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === '__add_custom__') {
      setCreatingCustomCat(true);
      setCustomCatInput('');
      setCustomCatError('');
    } else {
      setCategory(val);
      setCreatingCustomCat(false);
    }
  }

  function handleSaveCustomCategory() {
    const res = addCustomCategory(customCatInput);
    if (!res.success) {
      if (res.error === 'EMPTY') setCustomCatError(t('errorRequired'));
      else if (res.error === 'TOO_LONG') setCustomCatError(t('errorNameTooLong'));
      else setCustomCatError(t('categoryExists'));
      return;
    }

    // Successfully added
    const newCat = customCatInput.trim();
    setCategory(newCat);
    setCreatingCustomCat(false);
    setCustomCatInput('');
    setCustomCatError('');
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t('errorRequired');

    const qty = parseFloat(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      errs.quantity = t('errorRequired');
    }

    const thr = parseFloat(threshold);
    if (!Number.isFinite(thr) || thr < 0) {
      errs.threshold = t('errorRequired');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    if (!validate()) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category: category.trim(),
        quantity: parseFloat(quantity),
        unit,
        lowStockThreshold: parseFloat(threshold),
        barcode: barcode.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Product Name */}
      <Input
        label={t('productName')}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
        }}
        error={errors.name}
        required
        autoFocus
        placeholder={lang === 'hi' ? 'जैसे: आटा, डेटॉल साबुन, क्लासमेट कॉपी' : 'e.g. Atta, Dettol Soap, Classmate Notebook'}
        id="product-name"
      />

      {/* Category Selection Dropdown */}
      {!creatingCustomCat ? (
        <Select
          label={t('category')}
          value={category}
          onChange={handleCategorySelect}
          options={categoryOptions}
          id="product-category-select"
        />
      ) : (
        <div className="bg-[#DFF5E8]/60 border border-[#C1EBD2] rounded-2xl p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#155E46] uppercase tracking-wider">
              {t('customCategory')}
            </span>
            <button
              type="button"
              onClick={() => setCreatingCustomCat(false)}
              className="text-[#6B7C72] hover:text-[#20352C] p-1 cursor-pointer"
              title={t('cancel')}
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={customCatInput}
                onChange={(e) => {
                  setCustomCatInput(e.target.value);
                  if (customCatError) setCustomCatError('');
                }}
                placeholder={t('addCategoryPlaceholder')}
                className="w-full rounded-xl border border-[#C1EBD2] bg-white px-3 py-2 text-sm text-[#20352C] outline-none focus:border-[#087F5B] focus:ring-2 focus:ring-[#DFF5E8]"
                autoFocus
                id="inline-custom-cat-input"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveCustomCategory}
              className="flex items-center gap-1 bg-[#087F5B] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#155E46] transition-colors cursor-pointer shrink-0"
              id="save-inline-custom-cat-btn"
            >
              <Check size={14} />
              {t('addCategory')}
            </button>
          </div>
          {customCatError && (
            <p className="text-xs font-semibold text-[#E86D5A]">{customCatError}</p>
          )}
        </div>
      )}

      {/* Quantity & Unit */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label={t('quantity')}
            type="number"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              if (errors.quantity) setErrors((prev) => ({ ...prev, quantity: '' }));
            }}
            error={errors.quantity}
            required
            min={0}
            step="any"
            placeholder="0"
            id="product-quantity"
          />
        </div>
        <div className="w-32">
          <Select
            label={t('unit')}
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            options={unitOptions}
            id="product-unit"
          />
        </div>
      </div>

      {/* Low Stock Limit */}
      <Input
        label={t('lowStockThreshold')}
        type="number"
        inputMode="decimal"
        value={threshold}
        onChange={(e) => {
          setThreshold(e.target.value);
          if (errors.threshold) setErrors((prev) => ({ ...prev, threshold: '' }));
        }}
        error={errors.threshold}
        required
        min={0}
        step="any"
        hint={lang === 'hi' ? 'स्टॉक इस मात्रा से कम होने पर चेतावनी मिलेगी' : 'Alert when stock falls below this'}
        id="product-threshold"
      />

      {/* Optional Barcode */}
      <Input
        label={t('barcodeLabel')}
        type="text"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        placeholder={t('barcodePlaceholder')}
        id="product-barcode"
      />

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          fullWidth
          className="!py-3"
          id="product-cancel-btn"
        >
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          loading={submitting}
          fullWidth
          className="!py-3 shadow-md shadow-[#087F5B]/25"
          id="product-submit-btn"
        >
          {submitLabel ?? t('save')}
        </Button>
      </div>
    </form>
  );
}
