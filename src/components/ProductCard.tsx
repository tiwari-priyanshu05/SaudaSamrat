import { Edit2, Archive, SlidersHorizontal, AlertTriangle, AlertCircle, Calendar, Barcode } from 'lucide-react';
import type { Product } from '../types';
import { formatQty } from '../utils/format';
import { formatCategory } from '../services/categories';
import { Badge } from './Badge';
import { useLang } from '../i18n/LangContext';

interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
  onArchive: (p: Product) => void;
  onAdjust: (p: Product) => void;
  onManageBatches?: (p: Product) => void;
  onSell?: (p: Product) => void;
}

// Subtle pastel tints for the friendly kirana product tile avatar
const TINTS = [
  { bg: 'bg-[#DFF5E8]', text: 'text-[#155E46]', border: 'border-[#C1EBD2]' }, // soft mint
  { bg: 'bg-[#FFF4E0]', text: 'text-[#8D5300]', border: 'border-[#FCD59A]' }, // mango tint
  { bg: 'bg-[#FDF2F0]', text: 'text-[#B53826]', border: 'border-[#F8C0B8]' }, // coral tint
  { bg: 'bg-[#EBF5FA]', text: 'text-[#1E40AF]', border: 'border-[#BFDBFE]' }, // sky tint
];

function getTint(name: string, id: string) {
  let hash = 0;
  const str = name + id;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TINTS[Math.abs(hash) % TINTS.length];
}

export function ProductCard({
  product,
  onEdit,
  onArchive,
  onAdjust,
  onManageBatches,
  onSell,
}: ProductCardProps) {
  const { t, lang } = useLang();
  const isLow = product.quantity < product.lowStockThreshold && product.quantity > 0;
  const isEmpty = product.quantity === 0;
  const tint = getTint(product.name, product.id);
  const initial = product.name.trim().charAt(0).toUpperCase() || '📦';

  return (
    <div
      className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all hover:shadow-sm
        ${isEmpty ? 'border-[#F8C0B8] bg-[#FFFDFC]' : isLow ? 'border-[#FCD59A] bg-[#FFFFFD]' : 'border-[#E5EAE3]'}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Kirana Tile Avatar */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${tint.bg} ${tint.text} ${tint.border}`}
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[#20352C] text-base leading-snug truncate">
              {product.name}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              {product.category && (
                <span className="text-xs text-[#6B7C72] truncate font-medium">
                  {formatCategory(product.category, lang)}
                </span>
              )}
              {product.barcode && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#6B7C72] font-mono bg-[#F9F7EF] border border-[#E5EAE3] px-1.5 py-0.5 rounded-md">
                  <Barcode size={10} className="text-[#087F5B]" />
                  <span>{product.barcode}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {isEmpty ? (
          <Badge variant="red">
            <AlertCircle size={11} className="shrink-0" />
            {t('outOfStock')}
          </Badge>
        ) : isLow ? (
          <Badge variant="amber">
            <AlertTriangle size={11} className="shrink-0" />
            {t('lowStockTitle')}
          </Badge>
        ) : (
          <Badge variant="green">{t('inStock')}</Badge>
        )}
      </div>

      {/* Stock row */}
      <div className="flex items-baseline justify-between mb-4 bg-[#F9F7EF] rounded-xl px-3.5 py-2.5 border border-[#E5EAE3]/80">
        <div>
          <span
            className={`text-2xl font-extrabold tracking-tight ${
              isEmpty ? 'text-[#E86D5A]' : isLow ? 'text-[#E68A00]' : 'text-[#087F5B]'
            }`}
          >
            {formatQty(product.quantity, product.unit)}
          </span>
          <span className="text-xs text-[#6B7C72] ml-2 font-medium">
            / {formatQty(product.lowStockThreshold, product.unit)} {t('minStockLabel')}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {onSell && (
          <button
            onClick={() => onSell(product)}
            className="flex-1 bg-[#087F5B] text-white text-sm font-bold rounded-xl py-2.5 px-3 hover:bg-[#155E46] active:scale-[0.98] transition-all shadow-xs shadow-[#087F5B]/15 min-h-[44px] cursor-pointer"
            id={`sell-${product.id}`}
          >
            {t('navSale')}
          </button>
        )}
        <button
          onClick={() => onAdjust(product)}
          className="p-2.5 rounded-xl text-[#6B7C72] hover:bg-[#F9F7EF] hover:text-[#20352C] border border-[#E5EAE3] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          title={t('adjustStock')}
          id={`adjust-${product.id}`}
          aria-label={t('adjustStock')}
        >
          <SlidersHorizontal size={17} />
        </button>
        {onManageBatches && (
          <button
            onClick={() => onManageBatches(product)}
            className="p-2.5 rounded-xl text-[#6B7C72] hover:bg-[#F9F7EF] hover:text-[#20352C] border border-[#E5EAE3] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title={t('batchesTitle')}
            id={`batches-${product.id}`}
            aria-label={t('batchesTitle')}
          >
            <Calendar size={17} />
          </button>
        )}
        <button
          onClick={() => onEdit(product)}
          className="p-2.5 rounded-xl text-[#6B7C72] hover:bg-[#F9F7EF] hover:text-[#20352C] border border-[#E5EAE3] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          title={t('editProduct')}
          id={`edit-${product.id}`}
          aria-label={t('editProduct')}
        >
          <Edit2 size={17} />
        </button>
        <button
          onClick={() => onArchive(product)}
          className="p-2.5 rounded-xl text-[#E86D5A] hover:bg-[#FDF2F0] hover:text-[#B53826] border border-[#F8C0B8] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          title={t('archiveProduct')}
          id={`archive-${product.id}`}
          aria-label={t('archiveProduct')}
        >
          <Archive size={17} />
        </button>
      </div>
    </div>
  );
}
