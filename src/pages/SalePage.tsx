import { useEffect, useState, useCallback, useRef, Fragment, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, X, ShoppingCart, CheckCircle2, AlertTriangle, ArrowLeft, Home, Barcode, Mic } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { getProducts, recordSale, formatCategory, getProductExpiryOverview } from '../services';
import type { Product, Unit } from '../types';
import { isAppError } from '../types';
import { formatQty } from '../utils/format';
import { Button } from '../components/Button';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { VoiceSaleModal } from '../components/VoiceSaleModal';

type Step = 'select' | 'quantity' | 'confirm' | 'done';

const UNIT_PRESETS: Record<Unit, number[]> = {
  piece: [1, 2, 5, 10],
  packet: [1, 2, 5, 10],
  bottle: [1, 2, 5, 10],
  dozen: [0.5, 1, 2, 5],
  kg: [0.25, 0.5, 1, 2],
  litre: [0.25, 0.5, 1, 2],
  g: [50, 100, 250, 500],
  ml: [50, 100, 250, 500],
};

export default function SalePage() {
  const { t, lang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selected, setSelected] = useState<Product | null>(null);
  const [qtyStr, setQtyStr] = useState('');
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<{ product: Product; qty: number } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [expiredBatchCount, setExpiredBatchCount] = useState(0);
  const [expiredSaleConfirmed, setExpiredSaleConfirmed] = useState(false);
  const submitted = useRef(false);

  const loadProducts = useCallback(async () => {
    const data = await getProducts();
    setProducts(data);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Handle product passed via router state (e.g. from StockPage)
  useEffect(() => {
    const stateProduct = (location.state as { product?: Product } | null)?.product;
    if (stateProduct && stateProduct.quantity > 0) {
      setSelected(stateProduct);
      setQtyStr('1');
      setStep('quantity');
    }
  }, [location.state]);

  // Check expired batches for selected product
  useEffect(() => {
    if (selected) {
      getProductExpiryOverview(selected.id).then((overview) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const count = overview.batches.filter((b) => b.expiryDate < todayStr).length;
        setExpiredBatchCount(count);
        setExpiredSaleConfirmed(false);
      });
    } else {
      setExpiredBatchCount(0);
      setExpiredSaleConfirmed(false);
    }
  }, [selected]);

  // Categories for filter chips in product picker
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const inStock = p.quantity > 0;
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ? p.barcode.toLowerCase().includes(search.toLowerCase()) : false);
      const matchesCat =
        selectedCategory === 'all' ||
        p.category.trim().toLowerCase() === selectedCategory.toLowerCase();
      return inStock && matchesSearch && matchesCat;
    });
  }, [products, search, selectedCategory]);

  function handleSelectProduct(p: Product) {
    setSelected(p);
    const initialQty = p.quantity >= 1 ? '1' : String(p.quantity);
    setQtyStr(initialQty);
    setError('');
    setStep('quantity');
  }

  function handleAddPreset(amount: number) {
    if (!selected) return;
    const current = parseFloat(qtyStr) || 0;
    const next = +(current + amount).toFixed(3);
    if (next <= selected.quantity) {
      setQtyStr(String(next));
      setError('');
    } else {
      setQtyStr(String(selected.quantity));
      setError('');
    }
  }

  function handleQtyNext() {
    const qty = parseFloat(qtyStr);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(t('errorNegative'));
      return;
    }
    if (!selected || qty > selected.quantity) {
      setError(
        `${t('insufficientStock')} — ${t('available')}: ${formatQty(
          selected?.quantity ?? 0,
          selected?.unit ?? 'piece',
        )}`,
      );
      return;
    }
    setError('');
    setStep('confirm');
  }

  async function handleConfirm() {
    if (submitted.current || !selected) return;
    const qty = parseFloat(qtyStr);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(t('errorNegative'));
      return;
    }
    if (qty > selected.quantity) {
      setError(t('errorExceedsStock'));
      return;
    }
    submitted.current = true;
    setSubmitting(true);
    try {
      const { product } = await recordSale({ productId: selected.id, quantity: qty });
      setLastSale({ product, qty });
      setStep('done');
      await loadProducts(); // refresh stock
    } catch (err) {
      const msg = isAppError(err) ? err.message : t('errorGeneric');
      setError(msg);
      setStep('confirm');
    } finally {
      setSubmitting(false);
      submitted.current = false;
    }
  }

  function handleReset() {
    setSelected(null);
    setQtyStr('');
    setError('');
    setSearch('');
    setStep('select');
    setLastSale(null);
  }

  const qty = parseFloat(qtyStr);
  const remaining =
    selected && Number.isFinite(qty) && qty > 0
      ? +(selected.quantity - qty).toFixed(6)
      : null;

  return (
    <div className="flex flex-col min-h-full bg-[#F9F7EF] pb-28">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-[#E5EAE3] px-4 sm:px-8 pt-12 pb-4 shadow-2xs sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {step !== 'select' && step !== 'done' && (
              <button
                onClick={() => setStep(step === 'confirm' ? 'quantity' : 'select')}
                className="p-2 -ml-1 text-[#6B7C72] hover:text-[#20352C] rounded-xl hover:bg-[#F9F7EF] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-[#20352C]">{t('saleTitle')}</h1>
          </div>
          {selected && step !== 'done' && (
            <span className="text-xs font-bold bg-[#DFF5E8] text-[#155E46] px-3.5 py-1 rounded-full border border-[#C1EBD2] truncate max-w-[180px] shadow-2xs">
              {selected.name}
            </span>
          )}
        </div>

        {/* 3-Step Wizard Indicator */}
        <div className="flex items-center gap-2 mt-1">
          {(['select', 'quantity', 'confirm'] as const).map((s, i) => (
            <Fragment key={s}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s || (step === 'done' && i < 3)
                    ? 'bg-[#087F5B] text-white shadow-xs'
                    : step === 'done' || i < ['select', 'quantity', 'confirm', 'done'].indexOf(step)
                      ? 'bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2]'
                      : 'bg-[#F9F7EF] text-[#6B7C72] border border-[#E5EAE3]'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    ['quantity', 'confirm', 'done'].includes(step) && i === 0
                      ? 'bg-[#087F5B]'
                      : ['confirm', 'done'].includes(step) && i === 1
                        ? 'bg-[#087F5B]'
                        : 'bg-[#E5EAE3]'
                  }`}
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-8 py-4 sm:py-6">
        {/* Step 1 — Select product */}
        {step === 'select' && (
          <div>
            <div className="flex gap-2.5 mb-3.5">
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7C72]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-10 pr-10 py-3 rounded-2xl border border-[#E5EAE3] text-sm text-[#20352C] bg-white outline-none focus:border-[#087F5B] focus:ring-2 focus:ring-[#DFF5E8] shadow-2xs min-h-[48px]"
                  id="sale-search"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7C72] hover:text-[#20352C] p-1.5 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="h-12 px-3.5 bg-white border border-[#E5EAE3] hover:border-[#087F5B] hover:bg-[#DFF5E8]/30 text-[#20352C] rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs font-semibold text-xs cursor-pointer transition-colors min-w-[48px]"
                title={lang === 'hi' ? 'बारकोड स्कैन करें' : 'Scan barcode'}
              >
                <Barcode size={20} className="text-[#087F5B]" />
                <span className="hidden sm:inline font-bold">{lang === 'hi' ? 'स्कैन' : 'Scan'}</span>
              </button>
              <button
                type="button"
                onClick={() => setVoiceOpen(true)}
                className="h-12 px-3.5 bg-white border border-[#E5EAE3] hover:border-[#087F5B] hover:bg-[#DFF5E8]/30 text-[#20352C] rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs font-semibold text-xs cursor-pointer transition-colors min-w-[48px]"
                title={lang === 'hi' ? 'बोलकर सामान खोजें' : 'Voice entry'}
              >
                <Mic size={20} className="text-[#087F5B]" />
                <span className="hidden sm:inline font-bold">{lang === 'hi' ? 'बोलें' : 'Voice'}</span>
              </button>
            </div>

            {/* Category pills for fast picking */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs mb-3">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#087F5B] text-white shadow-xs'
                      : 'bg-white border border-[#E5EAE3] text-[#6B7C72] hover:bg-[#F9F7EF]'
                  }`}
                >
                  {t('allCategories')}
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory.toLowerCase() === c.toLowerCase()
                        ? 'bg-[#087F5B] text-white shadow-xs'
                        : 'bg-white border border-[#E5EAE3] text-[#6B7C72] hover:bg-[#F9F7EF]'
                    }`}
                  >
                    {formatCategory(c, lang)}
                  </button>
                ))}
              </div>
            )}

            {/* Product list with large tap targets in responsive multi-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filtered.map((p) => {
                const initial = p.name.trim().charAt(0).toUpperCase() || '📦';
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="flex items-center justify-between bg-white border border-[#E5EAE3] rounded-2xl px-4 py-3.5 shadow-2xs text-left hover:border-[#C1EBD2] hover:shadow-xs active:scale-[0.98] transition-all min-h-[58px] cursor-pointer"
                    id={`sale-product-${p.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                      <div className="w-10 h-10 rounded-xl bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2] flex items-center justify-center font-bold text-sm shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#20352C] text-sm truncate">{p.name}</p>
                        {p.category && (
                          <p className="text-xs text-[#6B7C72] mt-0.5 truncate font-medium">
                            {p.category}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[#155E46] font-bold text-xs bg-[#DFF5E8] border border-[#C1EBD2] px-2.5 py-1.5 rounded-xl">
                        {formatQty(p.quantity, p.unit)}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl p-8 border border-[#E5EAE3] text-center text-[#6B7C72] mt-4">
                  <p className="text-sm font-semibold">{t('noProducts')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Enter quantity */}
        {step === 'quantity' && selected && (
          <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
            {/* Selected product card */}
            <div className="bg-white border border-[#C1EBD2] rounded-2xl p-4 shadow-2xs bg-gradient-to-b from-[#F2FAF5] to-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#155E46] bg-[#DFF5E8] px-2.5 py-0.5 rounded-md border border-[#C1EBD2]">
                {t('selectProduct')}
              </span>
              <h2 className="font-extrabold text-[#20352C] text-lg leading-tight mt-2">
                {selected.name}
              </h2>
              <p className="text-xs text-[#6B7C72] mt-1 font-medium">
                {t('available')}:{' '}
                <strong className="text-[#155E46] font-bold text-sm">
                  {formatQty(selected.quantity, selected.unit)}
                </strong>
              </p>
            </div>

            {/* Quantity Input with Visible Unit */}
            <div>
              <label
                htmlFor="sale-quantity"
                className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider block mb-1.5"
              >
                {t('saleQty')} <span className="text-[#E86D5A]">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="sale-quantity"
                  type="number"
                  inputMode="decimal"
                  value={qtyStr}
                  onChange={(e) => {
                    setQtyStr(e.target.value);
                    setError('');
                  }}
                  required
                  min={0.001}
                  step="any"
                  placeholder="0"
                  autoFocus
                  className="w-full rounded-2xl border border-[#E5EAE3] bg-white px-4 py-3.5 pr-20 text-2xl font-extrabold text-[#20352C] placeholder-gray-300 min-h-[56px] transition-all outline-none focus:border-[#087F5B] focus:ring-2 focus:ring-[#DFF5E8]"
                />
                <span className="absolute right-4 text-sm font-bold text-[#155E46] bg-[#DFF5E8] px-2.5 py-1 rounded-xl border border-[#C1EBD2] pointer-events-none uppercase">
                  {selected.unit}
                </span>
              </div>
              {error && <p className="text-xs font-semibold text-[#E86D5A] mt-1.5">{error}</p>}
            </div>

            {/* Quick Presets for 1-Handed Fast Input */}
            <div>
              <p className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider mb-2">
                {t('quickPresets')}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {(UNIT_PRESETS[selected.unit] || [1, 2, 5, 10]).map((preset) => {
                  const currentVal = parseFloat(qtyStr) || 0;
                  const willExceed = currentVal + preset > selected.quantity;
                  const label = selected.unit === 'g' ? `+${preset}g` : `+${preset}`;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      disabled={willExceed}
                      className={`min-h-[48px] rounded-xl font-bold text-sm transition-all border cursor-pointer select-none ${
                        willExceed
                          ? 'bg-[#F9F7EF] border-[#E5EAE3]/60 text-gray-300 cursor-not-allowed opacity-40'
                          : 'bg-white border-[#E5EAE3] text-[#20352C] hover:bg-[#DFF5E8] hover:text-[#155E46] hover:border-[#C1EBD2] active:scale-95 shadow-2xs'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Remaining Balance Calculation */}
            {remaining !== null && (
              <div
                className={`rounded-2xl p-4 border transition-all text-sm flex items-center justify-between ${
                  remaining >= 0
                    ? 'bg-[#DFF5E8] border-[#C1EBD2] text-[#155E46]'
                    : 'bg-[#FDF2F0] border-[#F8C0B8] text-[#B53826]'
                }`}
              >
                <span className="font-semibold flex items-center gap-1.5">
                  {remaining < 0 && <AlertTriangle size={16} className="shrink-0" />}
                  {remaining < 0 ? t('errorExceedsStock') : `${t('remaining')}:`}
                </span>
                <strong className="text-base font-extrabold">
                  {remaining >= 0
                    ? formatQty(remaining, selected.unit)
                    : `${formatQty(selected.quantity, selected.unit)} max`}
                </strong>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setStep('select')}
                className="flex-1 !py-3.5"
              >
                <ArrowLeft size={16} />
                {t('backBtn')}
              </Button>
              <Button
                onClick={handleQtyNext}
                disabled={!Number.isFinite(qty) || qty <= 0 || qty > selected.quantity}
                className={`flex-1 !py-3.5 shadow-md shadow-[#087F5B]/20 ${
                  !Number.isFinite(qty) || qty <= 0 || qty > selected.quantity
                    ? '!opacity-50 !cursor-not-allowed'
                    : ''
                }`}
                id="sale-next-btn"
              >
                {t('nextBtn')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Review & Confirm */}
        {step === 'confirm' && selected && (
          <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
            <div className="bg-white border border-[#E5EAE3] rounded-2xl p-5 shadow-2xs">
              <h2 className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider mb-4 pb-2 border-b border-[#E5EAE3]">
                {t('confirmSale')}
              </h2>

              <div className="flex flex-col gap-3">
                <ReviewRow label={t('productName')} value={selected.name} />
                <ReviewRow
                  label={t('saleQty')}
                  value={formatQty(parseFloat(qtyStr), selected.unit)}
                  highlight
                />
                <ReviewRow
                  label={t('available')}
                  value={formatQty(selected.quantity, selected.unit)}
                />
                {remaining !== null && (
                  <ReviewRow
                    label={t('remaining')}
                    value={formatQty(remaining, selected.unit)}
                    sub
                  />
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-[#FDF2F0] border border-[#F8C0B8] rounded-xl px-4 py-3 text-[#B53826] text-xs font-semibold">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {expiredBatchCount > 0 && (
              <div className="p-3.5 bg-[#FDF2F0] border border-[#F8C0B8] rounded-2xl text-xs">
                <div className="flex items-start gap-2 text-[#B53826] font-bold mb-2">
                  <AlertTriangle size={18} className="shrink-0 text-[#E86D5A]" />
                  <span>{t('expiredSaleWarning')}</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#B53826]">
                  <input
                    type="checkbox"
                    checked={expiredSaleConfirmed}
                    onChange={(e) => setExpiredSaleConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded text-[#E86D5A] focus:ring-[#E86D5A] cursor-pointer"
                  />
                  <span>{t('confirmExpiredSale')}</span>
                </label>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep('quantity')}
                className="flex-1 !py-3.5"
              >
                {t('backBtn')}
              </Button>
              <Button
                onClick={handleConfirm}
                loading={submitting}
                disabled={expiredBatchCount > 0 && !expiredSaleConfirmed}
                className={`flex-1 !text-base !py-3.5 shadow-md shadow-[#087F5B]/25 ${
                  expiredBatchCount > 0 && !expiredSaleConfirmed
                    ? '!opacity-50 !cursor-not-allowed'
                    : ''
                }`}
                id="sale-confirm-btn"
              >
                <ShoppingCart size={18} />
                {t('confirmSale')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Success Screen */}
        {step === 'done' && lastSale && (
          <div className="flex flex-col items-center py-8 text-center px-4 max-w-xl mx-auto w-full">
            <div className="w-20 h-20 bg-[#DFF5E8] rounded-3xl flex items-center justify-center mb-4 text-[#087F5B] shadow-xs border border-[#C1EBD2]">
              <CheckCircle2 size={44} />
            </div>
            <h2 className="text-xl font-bold text-[#20352C] mb-1">{t('saleSuccess')}</h2>
            <p className="text-[#6B7C72] text-sm mb-1 font-medium">{lastSale.product.name}</p>
            <p className="text-[#087F5B] font-extrabold text-2xl mb-4">
              {formatQty(lastSale.qty, lastSale.product.unit)}
            </p>

            <div className="bg-white border border-[#E5EAE3] rounded-2xl px-5 py-2.5 text-xs text-[#6B7C72] mb-6 font-medium shadow-2xs">
              {t('remaining')}:{' '}
              <strong className="text-[#20352C] font-extrabold">
                {formatQty(lastSale.product.quantity, lastSale.product.unit)}
              </strong>
            </div>

            <div className="w-full flex flex-col gap-3 max-w-xs">
              <Button
                onClick={handleReset}
                size="lg"
                fullWidth
                id="sale-another-btn"
                className="shadow-md shadow-[#087F5B]/25"
              >
                <ShoppingCart size={18} />
                {t('nextSale')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/')}
                size="md"
                fullWidth
                id="sale-home-btn"
              >
                <Home size={16} />
                {t('goHome')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onProductFound={(p) => {
          setScannerOpen(false);
          handleSelectProduct(p);
        }}
      />

      <VoiceSaleModal
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        products={products}
        onConfirm={(p, qty) => {
          handleSelectProduct(p);
          setQtyStr(String(qty));
          setStep('confirm');
        }}
      />
    </div>
  );
}

function ReviewRow({
  label,
  value,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#E5EAE3]/60 pb-2.5 last:border-0 last:pb-0">
      <span className="text-xs text-[#6B7C72] font-semibold">{label}</span>
      <span
        className={`font-bold ${
          highlight
            ? 'text-[#155E46] text-lg font-extrabold'
            : sub
              ? 'text-[#087F5B] text-sm'
              : 'text-[#20352C] text-sm'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
