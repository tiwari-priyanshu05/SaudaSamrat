import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ClockIcon,
  ShoppingCart,
  Loader2,
  Calendar,
  RotateCcw,
  ArrowUpRight,
  ArrowDownLeft,
  Sliders,
  AlertTriangle,
  Package,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import type { Translator } from '../i18n/labels';
import { getStockMovements, undoMovement } from '../services';
import type { StockMovement } from '../types';
import { formatQty, formatDateTime } from '../utils/format';
import { ConfirmDialog } from '../components/Modal';

type FilterTab = 'all' | 'sales' | 'adjustments';

export default function HistoryPage() {
  const { t } = useLang();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>('all');

  // Undo dialog state
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStockMovements({ limit: 300 });
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Mini stats
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayCount = useMemo(() => {
    return movements.filter((m) => m.timestamp >= todayStart).length;
  }, [movements, todayStart]);

  const todaySalesCount = useMemo(() => {
    return movements.filter(
      (m) => m.type === 'sale' && m.timestamp >= todayStart && !m.isReversed,
    ).length;
  }, [movements, todayStart]);

  // Tab filtering
  const filtered = useMemo(() => {
    if (tab === 'sales') return movements.filter((m) => m.type === 'sale');
    if (tab === 'adjustments') return movements.filter((m) => m.type !== 'sale');
    return movements;
  }, [movements, tab]);

  // Group by date
  const grouped = useMemo(() => groupByDate(filtered, t), [filtered, t]);

  async function handleConfirmUndo() {
    if (!selectedMovement || isUndoing) return;
    setIsUndoing(true);
    try {
      await undoMovement(selectedMovement);
      setToastMsg({ text: t('undoSuccess'), type: 'success' });
      setSelectedMovement(null);
      await load();
    } catch (err) {
      console.error('[SaudaSamrat] Undo failed:', err);
      setToastMsg({
        text: err instanceof Error ? err.message : t('undoFailed'),
        type: 'error',
      });
    } finally {
      setIsUndoing(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-[#F9F7EF] pb-28">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-[#E5EAE3] px-4 sm:px-8 pt-12 pb-4 shadow-2xs sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-[#20352C] flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#DFF5E8] text-[#087F5B] flex items-center justify-center">
              <ClockIcon size={18} />
            </span>
            {t('historyTitle')}
          </h1>
          <span className="text-xs font-bold text-[#20352C] bg-[#F9F7EF] border border-[#E5EAE3] px-3 py-1 rounded-full">
            {movements.length} {t('items')}
          </span>
        </div>

        {/* Mini stats summary */}
        <div className="grid grid-cols-2 gap-3 my-3">
          <div className="bg-[#DFF5E8] border border-[#C1EBD2] rounded-2xl p-3.5">
            <p className="text-[10px] text-[#155E46] font-bold uppercase tracking-wider">
              {t('todaySales')}
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#155E46] mt-0.5">{todaySalesCount}</p>
          </div>
          <div className="bg-white border border-[#E5EAE3] rounded-2xl p-3.5 shadow-2xs">
            <p className="text-[10px] text-[#6B7C72] font-bold uppercase tracking-wider">
              {t('recentActivity')}
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#20352C] mt-0.5">{todayCount}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 p-1 bg-[#F9F7EF] rounded-xl border border-[#E5EAE3]">
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[38px] ${
              tab === 'all'
                ? 'bg-white text-[#155E46] shadow-xs border border-[#C1EBD2]'
                : 'text-[#6B7C72] hover:text-[#20352C]'
            }`}
            id="tab-all-movements"
          >
            {t('movementAll')}
          </button>
          <button
            onClick={() => setTab('sales')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[38px] ${
              tab === 'sales'
                ? 'bg-white text-[#155E46] shadow-xs border border-[#C1EBD2]'
                : 'text-[#6B7C72] hover:text-[#20352C]'
            }`}
            id="tab-sales-movements"
          >
            {t('movementSales')}
          </button>
          <button
            onClick={() => setTab('adjustments')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer min-h-[38px] ${
              tab === 'adjustments'
                ? 'bg-white text-[#155E46] shadow-xs border border-[#C1EBD2]'
                : 'text-[#6B7C72] hover:text-[#20352C]'
            }`}
            id="tab-adjustment-movements"
          >
            {t('movementAdjustments')}
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="px-4 sm:px-8 pt-3">
          <div
            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-semibold shadow-xs ${
              toastMsg.type === 'success'
                ? 'bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2]'
                : 'bg-[#FDF2F0] text-[#E86D5A] border border-[#FADCD7]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {toastMsg.type === 'success' ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              {toastMsg.text}
            </span>
            <button
              onClick={() => setToastMsg(null)}
              className="p-1 hover:opacity-75 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Movement List */}
      <div className="flex-1 px-4 sm:px-8 py-4 sm:py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#087F5B]">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-20 h-20 bg-[#DFF5E8] rounded-3xl flex items-center justify-center mb-4 text-[#087F5B] shadow-xs">
              <ShoppingCart size={36} />
            </div>
            <p className="text-[#20352C] font-bold text-base mb-1">{t('noHistory')}</p>
            <p className="text-[#6B7C72] text-xs font-medium max-w-xs">
              {t('noHistoryDesc')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map(({ date, items }) => (
              <div key={date}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B7C72] uppercase tracking-wider mb-2.5 px-1">
                  <Calendar size={13} className="text-[#6B7C72]" />
                  <span>{date}</span>
                  <span className="text-[#6B7C72]/80 font-semibold">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((mov) => (
                    <MovementRow
                      key={mov.id}
                      movement={mov}
                      t={t}
                      onUndoClick={() => setSelectedMovement(mov)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Undo Dialog */}
      {selectedMovement && (
        <ConfirmDialog
          open={!!selectedMovement}
          title={t('confirmUndoTitle')}
          message={`${selectedMovement.productName} — ${
            selectedMovement.delta > 0 ? '+' : ''
          }${formatQty(selectedMovement.delta, selectedMovement.unit)}. ${t(
            'confirmUndoDesc',
          )}`}
          confirmLabel={isUndoing ? t('loading') : t('undoAction')}
          cancelLabel={t('cancel')}
          danger={selectedMovement.delta > 0}
          onConfirm={handleConfirmUndo}
          onCancel={() => !isUndoing && setSelectedMovement(null)}
        />
      )}
    </div>
  );
}

function MovementRow({
  movement,
  t,
  onUndoClick,
}: {
  movement: StockMovement;
  t: Translator;
  onUndoClick: () => void;
}) {
  const isPositive = movement.delta > 0;
  const isSale = movement.type === 'sale';
  const isReversal = movement.type === 'reversal';
  const isReturn = movement.type === 'return';

  return (
    <div
      className={`flex items-start bg-white border rounded-2xl p-3.5 shadow-2xs gap-3 transition-colors ${
        movement.isReversed
          ? 'border-[#E5EAE3] bg-gray-50/70 opacity-75'
          : 'border-[#E5EAE3] hover:border-[#C1EBD2]'
      }`}
      data-testid="movement-row"
    >
      {/* Icon badge */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
          isSale
            ? 'bg-[#DFF5E8] text-[#087F5B] border-[#C1EBD2]'
            : isPositive
              ? 'bg-[#DFF5E8] text-[#155E46] border-[#C1EBD2]'
              : isReversal || isReturn
                ? 'bg-[#FFF4E0] text-[#8D5300] border-[#FFE3B3]'
                : movement.reason === 'damage'
                  ? 'bg-[#FDF2F0] text-[#E86D5A] border-[#FADCD7]'
                  : 'bg-[#F9F7EF] text-[#20352C] border-[#E5EAE3]'
        }`}
      >
        {isSale ? (
          <ShoppingCart size={17} />
        ) : isPositive ? (
          <Package size={17} />
        ) : isReversal || isReturn ? (
          <RotateCcw size={17} />
        ) : movement.reason === 'damage' ? (
          <AlertTriangle size={17} />
        ) : (
          <Sliders size={17} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-[#20352C] text-sm truncate">{movement.productName}</p>
          {movement.isReversed && (
            <span className="text-[10px] font-bold text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded-full">
              {t('alreadyReversed')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#6B7C72]">
          <span>{formatDateTime(movement.timestamp)}</span>
          {movement.reason && (
            <>
              <span>•</span>
              <span className="capitalize">{getReasonLabel(movement.reason, t)}</span>
            </>
          )}
        </div>

        {movement.note && (
          <p className="text-[11px] text-[#6B7C72] italic mt-0.5 truncate">
            &ldquo;{movement.note}&rdquo;
          </p>
        )}
      </div>

      {/* Delta badge & Undo button */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span
          className={`font-extrabold text-xs px-2.5 py-1 rounded-xl border flex items-center gap-0.5 ${
            isSale
              ? 'bg-[#FDF2F0] text-[#E86D5A] border-[#FADCD7]'
              : isPositive
                ? 'bg-[#DFF5E8] text-[#155E46] border-[#C1EBD2]'
                : 'bg-[#FDF2F0] text-[#E86D5A] border-[#FADCD7]'
          }`}
        >
          {isPositive ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
          {isPositive ? '+' : ''}
          {formatQty(movement.delta, movement.unit)}
        </span>

        {movement.canUndo && (
          <button
            onClick={onUndoClick}
            className="text-[11px] font-bold text-[#087F5B] hover:text-[#155E46] flex items-center gap-1 min-h-[44px] min-w-[44px] justify-end cursor-pointer transition-colors"
            title={t('undoAction')}
            aria-label={t('undoAction')}
          >
            <RotateCcw size={12} />
            <span>{t('undoAction')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function getReasonLabel(reason: string, t: Translator): string {
  switch (reason) {
    case 'manual_correction':
      return t('reasonManual');
    case 'restock':
      return t('reasonRestock');
    case 'damage':
      return t('reasonDamage');
    case 'return':
      return t('reasonReturn');
    case 'reversal':
      return t('reversal');
    default:
      return reason;
  }
}

function groupByDate(
  movements: StockMovement[],
  t: Translator,
): { date: string; items: StockMovement[] }[] {
  const map = new Map<string, StockMovement[]>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const m of movements) {
    const mDate = new Date(m.timestamp);
    mDate.setHours(0, 0, 0, 0);

    let key: string;
    if (mDate.getTime() === today.getTime()) {
      key = t('today');
    } else if (mDate.getTime() === yesterday.getTime()) {
      key = t('yesterday');
    } else {
      key = new Date(m.timestamp).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }

  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}
