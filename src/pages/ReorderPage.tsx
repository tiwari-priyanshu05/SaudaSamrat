import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  TrendingDown,
  Loader2,
  ArrowLeft,
  Info,
  Sparkles,
  EyeOff,
  ClipboardList,
  SlidersHorizontal,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import type { Translator } from '../i18n/labels';
import {
  getLowStockProducts,
  getSlowMovingProducts,
  getSmartReorderRecommendations,
  dismissReorderRecommendation,
  formatCategory,
  getShopProfile,
} from '../services';
import type {
  LowStockItem,
  SlowMovingItem,
  SmartReorderRecommendation,
  OrderListItem,
} from '../types';
import { formatQty, formatRelativeTime } from '../utils/format';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { SupplierOrderModal } from '../components/SupplierOrderModal';

type ReorderTab = 'smart' | 'low' | 'slow';

export default function ReorderPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();

  const [tab, setTab] = useState<ReorderTab>('smart');
  const [smartItems, setSmartItems] = useState<SmartReorderRecommendation[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [slowMoving, setSlowMoving] = useState<SlowMovingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Reorder config options
  const [lookbackDays, setLookbackDays] = useState(14);
  const [targetDays, setTargetDays] = useState(7);

  // Supplier order modal state
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [shopName, setShopName] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [smart, ls, sm, prof] = await Promise.all([
        getSmartReorderRecommendations({ lookbackDays, targetDays }),
        getLowStockProducts(),
        getSlowMovingProducts({ lookbackDays: 30 }),
        getShopProfile(),
      ]);
      setSmartItems(smart);
      setLowStock(ls);
      setSlowMoving(sm);
      if (prof?.shopName) setShopName(prof.shopName);
    } catch {
      // silent — user can still see empty states
    } finally {
      setLoading(false);
    }
  }, [lookbackDays, targetDays]);

  useEffect(() => {
    load();
  }, [load]);

  function handleDismiss(productId: string) {
    dismissReorderRecommendation(productId);
    setSmartItems((prev) => prev.filter((item) => item.product.id !== productId));
  }

  // Prepare initial order list items from current recommendations
  const orderListItems: OrderListItem[] = useMemo(() => {
    if (tab === 'smart') {
      return smartItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.suggestedOrderQuantity,
        unit: item.unit,
      }));
    }
    return lowStock.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.deficit,
      unit: item.product.unit,
    }));
  }, [tab, smartItems, lowStock]);

  return (
    <div className="flex flex-col min-h-full bg-[#F9F7EF] pb-28">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-[#E5EAE3] px-4 sm:px-8 pt-12 pb-4 shadow-2xs sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-1 text-[#6B7C72] hover:text-[#20352C] rounded-xl hover:bg-[#F9F7EF] transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[#20352C]">{t('reorderTitle')}</h1>
          </div>

          {orderListItems.length > 0 && (
            <button
              onClick={() => setSupplierModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#087F5B] hover:bg-[#155E46] px-3.5 py-2 rounded-xl transition-all shadow-xs shadow-[#087F5B]/25 cursor-pointer active:scale-95 min-h-[42px]"
              id="reorder-create-order-btn"
            >
              <ClipboardList size={15} />
              <span>{t('createSupplierOrder')}</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl bg-[#F9F7EF] border border-[#E5EAE3] p-1 gap-1">
          <TabBtn
            active={tab === 'smart'}
            onClick={() => setTab('smart')}
            label={t('smartReorderTitle')}
            count={smartItems.length}
            id="reorder-tab-smart"
            variant="green"
          />
          <TabBtn
            active={tab === 'low'}
            onClick={() => setTab('low')}
            label={t('lowStockTitle')}
            count={lowStock.length}
            id="reorder-tab-low"
            variant="amber"
          />
          <TabBtn
            active={tab === 'slow'}
            onClick={() => setTab('slow')}
            label={t('slowMovingTitle')}
            count={slowMoving.length}
            id="reorder-tab-slow"
            variant="gray"
          />
        </div>

        {/* Smart Reorder Parameter Selectors */}
        {tab === 'smart' && (
          <div className="mt-3 pt-2.5 border-t border-[#E5EAE3] flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#6B7C72] font-semibold">
              <SlidersHorizontal size={13} />
              <span>{t('observationWindow')}:</span>
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setLookbackDays(days)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                    lookbackDays === days
                      ? 'bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2]'
                      : 'text-[#6B7C72] hover:text-[#20352C]'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[#6B7C72] font-semibold">
              <span>Cover:</span>
              {[7, 14].map((days) => (
                <button
                  key={days}
                  onClick={() => setTargetDays(days)}
                  className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                    targetDays === days
                      ? 'bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2]'
                      : 'text-[#6B7C72] hover:text-[#20352C]'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 sm:px-8 py-4 sm:py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#087F5B]">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : tab === 'smart' ? (
          smartItems.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={36} className="text-[#087F5B]" />}
              label="No reorders needed right now"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="col-span-full flex items-center gap-1.5 text-xs text-[#6B7C72] font-semibold px-1">
                <Info size={13} className="text-[#6B7C72] shrink-0" />
                <span>
                  Showing {smartItems.length} recommendations based on sales velocity
                </span>
              </div>
              {smartItems.map((rec) => (
                <SmartReorderCard
                  key={rec.product.id}
                  recommendation={rec}
                  t={t}
                  lang={lang}
                  onDismiss={() => handleDismiss(rec.product.id)}
                  onRestock={() => navigate('/stock')}
                />
              ))}
            </div>
          )
        ) : tab === 'low' ? (
          lowStock.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle size={36} className="text-[#087F5B]" />}
              label={t('noLowStock')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <div className="col-span-full flex items-center gap-1.5 text-xs text-[#6B7C72] font-semibold px-1">
                <Info size={13} className="text-[#6B7C72] shrink-0" />
                <span>
                  {lowStock.length} {t('lowStockTitle')} • {t('calcLimitMinusStock')}
                </span>
              </div>
              {lowStock.map((item) => (
                <LowStockCard
                  key={item.product.id}
                  item={item}
                  t={t}
                  lang={lang}
                  onRestock={() => navigate('/stock')}
                />
              ))}
            </div>
          )
        ) : slowMoving.length === 0 ? (
          <EmptyState
            icon={<TrendingDown size={36} className="text-[#6B7C72]" />}
            label={t('noSlowMoving')}
            actionLabel={t('saleTitle')}
            onAction={() => navigate('/sale')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="col-span-full flex items-center gap-1.5 text-xs text-[#6B7C72] font-semibold px-1">
              <Info size={13} className="text-[#6B7C72] shrink-0" />
              <span>{t('noSales30Days')}</span>
            </div>
            {slowMoving.map((item) => (
              <SlowMovingCard
                key={item.product.id}
                item={item}
                t={t}
                lang={lang}
                onRecordSale={() =>
                  navigate('/sale', { state: { product: item.product } })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Supplier Order & WhatsApp Modal */}
      <SupplierOrderModal
        open={supplierModalOpen}
        initialItems={orderListItems}
        shopName={shopName}
        onClose={() => setSupplierModalOpen(false)}
      />
    </div>
  );
}

function SmartReorderCard({
  recommendation,
  t,
  lang,
  onDismiss,
  onRestock,
}: {
  recommendation: SmartReorderRecommendation;
  t: Translator;
  lang: 'hi' | 'en';
  onDismiss: () => void;
  onRestock: () => void;
}) {
  const { product, currentStock, suggestedOrderQuantity, daysOfStockRemaining, unit } =
    recommendation;
  const isOutOfStock = currentStock <= 0;

  return (
    <div
      className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all ${
        isOutOfStock
          ? 'border-[#F8C0B8] border-l-4 border-l-[#E86D5A] bg-[#FDF2F0]/40'
          : 'border-[#E5EAE3] border-l-4 border-l-[#FFB454] hover:border-[#C1EBD2]'
      }`}
      data-testid="smart-reorder-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                isOutOfStock
                  ? 'bg-[#FDF2F0] text-[#B53826] border-[#F8C0B8]'
                  : 'bg-[#FFF4E0] text-[#8D5300] border-[#FCD59A]'
              }`}
            >
              {isOutOfStock ? t('outOfStock') : t('lowStockTitle')}
            </span>

            {product.category && (
              <span className="text-[10px] font-semibold bg-[#F9F7EF] text-[#6B7C72] px-2 py-0.5 rounded-full border border-[#E5EAE3]">
                {formatCategory(product.category, lang)}
              </span>
            )}
          </div>

          <h3 className="font-extrabold text-[#20352C] text-sm truncate">{product.name}</h3>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#6B7C72] font-semibold">
            <span>
              {t('available')}:{' '}
              <strong
                className={isOutOfStock ? 'text-[#E86D5A]' : 'text-[#20352C] font-bold'}
              >
                {formatQty(currentStock, unit)}
              </strong>
            </span>
            <span>•</span>
            <span>
              {t('minStockLabel')}: {formatQty(product.lowStockThreshold, unit)}
            </span>
          </div>

          {/* Formula calculation explanation */}
          <p className="text-[11px] text-[#6B7C72] mt-1.5 font-medium leading-relaxed bg-[#F9F7EF] p-2 rounded-xl border border-[#E5EAE3]">
            💡 {recommendation.calculationReason}
          </p>

          {!recommendation.hasSufficientHistory && (
            <p className="text-[10px] text-[#8D5300] mt-1 font-semibold">
              ⚠️ {t('sufficientHistoryFlag')}
            </p>
          )}
        </div>

        {/* Suggested order quantity badge */}
        <div className="text-right shrink-0">
          <p className="text-[10px] text-[#087F5B] font-bold uppercase tracking-wider">
            {t('suggestedOrder')}
          </p>
          <p className="text-base font-extrabold text-[#087F5B] mt-0.5">
            +{formatQty(suggestedOrderQuantity, unit)}
          </p>
          {daysOfStockRemaining !== null && (
            <p className="text-[10px] text-[#6B7C72] mt-0.5 font-medium">
              ~{daysOfStockRemaining} {t('days')} left
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#E5EAE3]">
        <button
          onClick={onDismiss}
          className="text-[11px] font-bold text-[#6B7C72] hover:text-[#E86D5A] flex items-center gap-1 cursor-pointer min-h-[40px] px-2"
        >
          <EyeOff size={13} />
          <span>{t('dismissRecommendation')}</span>
        </button>

        <Button size="sm" onClick={onRestock} className="!py-1.5 text-xs">
          {t('restockAction')}
        </Button>
      </div>
    </div>
  );
}

function LowStockCard({
  item,
  t,
  lang,
  onRestock,
}: {
  item: LowStockItem;
  t: Translator;
  lang: 'hi' | 'en';
  onRestock: () => void;
}) {
  const { product, deficit } = item;
  const isOutOfStock = product.quantity === 0;

  return (
    <div
      className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all ${
        isOutOfStock
          ? 'border-[#F8C0B8] border-l-4 border-l-[#E86D5A] bg-[#FDF2F0]/40'
          : 'border-[#E5EAE3] border-l-4 border-l-[#FFB454] hover:border-[#C1EBD2]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                isOutOfStock
                  ? 'bg-[#FDF2F0] text-[#B53826] border-[#F8C0B8]'
                  : 'bg-[#FFF4E0] text-[#8D5300] border-[#FCD59A]'
              }`}
            >
              {isOutOfStock ? t('outOfStock') : t('lowStockTitle')}
            </span>

            {product.category && (
              <span className="text-[10px] font-semibold bg-[#F9F7EF] text-[#6B7C72] px-2 py-0.5 rounded-full border border-[#E5EAE3]">
                {formatCategory(product.category, lang)}
              </span>
            )}
          </div>

          <h3 className="font-extrabold text-[#20352C] text-sm truncate">{product.name}</h3>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#6B7C72] font-semibold">
            <span>
              {t('available')}:{' '}
              <strong
                className={isOutOfStock ? 'text-[#E86D5A]' : 'text-[#20352C] font-bold'}
              >
                {formatQty(product.quantity, product.unit)}
              </strong>
            </span>
            <span>•</span>
            <span>
              {t('minStockLabel')}: {formatQty(product.lowStockThreshold, product.unit)}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] text-[#8D5300] font-bold uppercase tracking-wider">
            {t('needToOrder')}
          </p>
          <p className="text-base font-extrabold text-[#8D5300] mt-0.5">
            {formatQty(deficit, product.unit)}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#E5EAE3]">
        <Button size="sm" onClick={onRestock} className="!py-1.5 text-xs">
          {t('restockAction')}
        </Button>
      </div>
    </div>
  );
}

function SlowMovingCard({
  item,
  t,
  lang,
  onRecordSale,
}: {
  item: SlowMovingItem;
  t: Translator;
  lang: 'hi' | 'en';
  onRecordSale: () => void;
}) {
  const { product, lastSoldAt, lookbackDays } = item;

  return (
    <div className="bg-white rounded-2xl border border-[#E5EAE3] border-l-4 border-l-[#6B7C72]/50 p-4 shadow-2xs hover:border-[#C1EBD2] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="gray">
              {lang === 'hi' ? `${lookbackDays} दिन में कोई बिक्री नहीं` : `No sales in ${lookbackDays}d`}
            </Badge>
            {product.category && (
              <span className="text-[10px] font-semibold bg-[#F9F7EF] text-[#6B7C72] px-2 py-0.5 rounded-full border border-[#E5EAE3]">
                {formatCategory(product.category, lang)}
              </span>
            )}
          </div>

          <h3 className="font-extrabold text-[#20352C] text-sm truncate">{product.name}</h3>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-[#6B7C72] font-semibold">
            <span>
              {t('available')}:{' '}
              <strong className="text-[#20352C]">{formatQty(product.quantity, product.unit)}</strong>
            </span>
            <span>•</span>
            <span>
              {lang === 'hi' ? 'आखिरी बिक्री' : 'Last sold'}:{' '}
              {lastSoldAt ? formatRelativeTime(lastSoldAt, lang) : (lang === 'hi' ? 'कभी नहीं' : 'Never')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-3 pt-3 border-t border-[#E5EAE3]">
        <Button
          size="sm"
          variant="secondary"
          onClick={onRecordSale}
          className="!py-1.5 text-xs"
        >
          {t('recordSaleAction')}
        </Button>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  count,
  id,
  variant,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  id: string;
  variant: 'green' | 'amber' | 'gray';
}) {
  const activeColor =
    variant === 'green'
      ? 'bg-white text-[#155E46] border-[#C1EBD2] shadow-xs'
      : variant === 'amber'
        ? 'bg-white text-[#8D5300] border-[#FCD59A] shadow-xs'
        : 'bg-white text-[#20352C] border-[#E5EAE3] shadow-xs';

  return (
    <button
      onClick={onClick}
      id={id}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
        active ? `${activeColor} border` : 'text-[#6B7C72] hover:text-[#20352C]'
      }`}
    >
      <span>{label}</span>
      {count > 0 && (
        <span
          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
            active
              ? variant === 'green'
                ? 'bg-[#DFF5E8] text-[#155E46]'
                : variant === 'amber'
                  ? 'bg-[#FFF4E0] text-[#8D5300]'
                  : 'bg-gray-100 text-[#20352C]'
              : 'bg-[#E5EAE3]/60 text-[#6B7C72]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({
  icon,
  label,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-20 h-20 bg-[#DFF5E8] rounded-3xl flex items-center justify-center mb-4 shadow-xs border border-[#C1EBD2]">
        {icon}
      </div>
      <p className="text-[#20352C] font-bold text-base mb-1">{label}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
