import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  ShoppingCart,
  Plus,
  TrendingDown,
  Loader2,
  Crown,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  BarChart2,
  TrendingUp,
  PackagePlus,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import {
  getProducts,
  getSales,
  getLowStockProducts,
  getShopProfile,
  subscribeShopProfile,
  getDailySummary,
  type DailySummaryReport,
} from '../services';
import type { Sale, LowStockItem, ShopProfile } from '../types';
import { formatQty, formatRelativeTime, formatOwnerGreeting } from '../utils/format';
import { Button } from '../components/Button';

interface HomeStats {
  totalProducts: number;
  lowStockCount: number;
  todaySalesCount: number;
  recentSales: Sale[];
  lowStockItems: LowStockItem[];
  dailySummary: DailySummaryReport | null;
}

export default function HomePage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const [products, lowStock, allSales, shopProf, summary] = await Promise.all([
        getProducts(),
        getLowStockProducts(),
        getSales({ limit: 10 }),
        getShopProfile(),
        getDailySummary(),
      ]);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaySales = allSales.filter((s) => s.soldAt >= todayStart.getTime());

      setProfile(shopProf);
      setStats({
        totalProducts: products.length,
        lowStockCount: lowStock.length,
        todaySalesCount: todaySales.length,
        recentSales: allSales.slice(0, 5),
        lowStockItems: lowStock.slice(0, 3), // Top 3 critical items for home preview
        dailySummary: summary,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Subscribe to live profile changes
  useEffect(() => {
    const unsubscribe = subscribeShopProfile((updated) => {
      setProfile(updated);
    });
    return unsubscribe;
  }, []);

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }, [lang]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[#087F5B]">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  const isEmpty = !stats || stats.totalProducts === 0;
  const isProfileComplete = !!(profile && profile.ownerName && profile.shopName);

  return (
    <div className="flex flex-col min-h-full bg-[#F9F7EF] pb-28">
      {/* Friendly Store Header — Deep Forest & Warm Ivory */}
      <div className="bg-[#155E46] text-white px-5 sm:px-8 pt-12 pb-7 sm:pb-8 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-[#087F5B] flex items-center justify-center text-white shadow-xs">
              <Crown size={15} className="text-[#FFB454]" />
            </span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#DFF5E8]">
              {t('appName')}
            </span>
          </div>
          <span className="text-[11px] font-semibold bg-[#087F5B]/60 text-[#DFF5E8] px-3 py-1 rounded-full border border-[#087F5B]/80 shadow-2xs">
            {todayFormatted}
          </span>
        </div>

        <div className="md:flex md:items-center md:justify-between md:gap-6">
          <div className="flex-1 min-w-0">
            {/* Personalized Owner Greeting */}
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight" data-testid="home-greeting">
              {formatOwnerGreeting(profile?.ownerName || '', lang)}
            </h1>

            {/* Prominent Shop Name Banner */}
            {isProfileComplete ? (
              <div
                className="flex items-center gap-1.5 text-xs text-[#DFF5E8] font-semibold mt-0.5"
                data-testid="home-shop-banner"
              >
                <span className="truncate">
                  {t('yourShop')}: <strong className="text-white font-bold">{profile.shopName}</strong>
                </span>
              </div>
            ) : (
              <div className="text-xs text-[#DFF5E8]/90 font-medium mt-0.5">
                <span>{t('appName')} • {t('tagline')}</span>
              </div>
            )}
          </div>

          {/* Today's Sales Primary Metric Hero Box */}
          {!isEmpty && stats && (
            <div className="mt-4 md:mt-0 bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/15 flex items-center justify-between md:min-w-[320px] shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#FFB454] text-[#8D5300] flex items-center justify-center shrink-0 shadow-sm">
                  <ShoppingCart size={22} strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#DFF5E8] uppercase tracking-wider">
                    {t('todaySales')}
                  </p>
                  <p className="text-2xl font-extrabold text-white leading-tight">
                    {stats.todaySalesCount} <span className="text-xs font-semibold text-[#DFF5E8]">{t('salesTransactions')}</span>
                  </p>
                </div>
              </div>

              {stats.dailySummary && stats.dailySummary.unitsSold.length > 0 && (
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] text-[#DFF5E8] uppercase font-bold tracking-wider">
                    {t('unitsSoldLabel')}
                  </span>
                  <span className="text-sm font-extrabold text-white bg-white/15 px-2.5 py-0.5 rounded-lg mt-0.5 border border-white/20">
                    {formatQty(stats.dailySummary.unitsSold[0].totalQuantity, stats.dailySummary.unitsSold[0].unit)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4 Action Shortcuts Bar */}
      <div className="px-4 sm:px-8 -mt-3.5 sm:-mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
        {/* Quick Sale */}
        <button
          onClick={() => navigate('/sale')}
          className="flex flex-col items-center justify-center p-3 bg-[#087F5B] text-white rounded-2xl shadow-sm shadow-[#087F5B]/25 hover:bg-[#155E46] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer min-h-[68px]"
          id="home-quick-sale"
          title={t('quickSaleBtn')}
        >
          <ShoppingCart size={20} />
          <span className="text-xs font-bold mt-1 text-center line-clamp-1">
            {t('quickSaleBtn')}
          </span>
        </button>

        {/* Add Product */}
        <button
          onClick={() => navigate('/stock')}
          className="flex flex-col items-center justify-center p-3 bg-white text-[#20352C] border border-[#E5EAE3] rounded-2xl shadow-2xs hover:bg-[#F9F7EF] hover:border-[#087F5B] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer min-h-[68px]"
          id="home-add-stock"
          title={t('addStockBtn')}
        >
          <Plus size={20} className="text-[#087F5B]" />
          <span className="text-xs font-bold mt-1 text-center line-clamp-1">
            {t('addStockBtn')}
          </span>
        </button>

        {/* Bulk Receive */}
        <button
          onClick={() => navigate('/stock', { state: { openBulkReceive: true } })}
          className="flex flex-col items-center justify-center p-3 bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2] rounded-2xl shadow-2xs hover:bg-[#C1EBD2] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer min-h-[68px]"
          id="home-bulk-receive-shortcut"
          title={t('bulkReceiveBtn')}
        >
          <PackagePlus size={20} />
          <span className="text-xs font-bold mt-1 text-center line-clamp-1">
            {t('bulkReceiveBtn')}
          </span>
        </button>

        {/* Smart Reorder */}
        <button
          onClick={() => navigate('/reorder')}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border shadow-2xs hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer min-h-[68px] ${
            stats && stats.lowStockCount > 0
              ? 'bg-[#FFF4E0] text-[#8D5300] border-[#FCD59A] hover:bg-[#FCD59A]/40'
              : 'bg-white text-[#20352C] border-[#E5EAE3] hover:bg-[#F9F7EF]'
          }`}
          id="home-reorder-shortcut"
          title={t('reorderTitle')}
        >
          <RefreshCw size={20} className={stats && stats.lowStockCount > 0 ? 'text-[#E68A00]' : 'text-[#087F5B]'} />
          <span className="text-xs font-bold mt-1 text-center line-clamp-1">
            {t('reorderTitle')}
          </span>
        </button>
      </div>

      {/* 3 Secondary KPI Cards */}
      {!isEmpty && stats && (
        <div className="px-4 sm:px-8 grid grid-cols-3 gap-2.5 sm:gap-4 mb-5">
          <StatCard
            value={stats.totalProducts}
            label={t('totalProducts')}
            color="bg-white border-[#E5EAE3]"
            icon={<Package size={18} className="text-[#087F5B]" />}
            onClick={() => navigate('/stock')}
          />
          <StatCard
            value={stats.lowStockCount}
            label={t('lowStockProducts')}
            color={
              stats.lowStockCount > 0
                ? 'bg-[#FFF4E0] border-[#FCD59A] text-[#8D5300]'
                : 'bg-white border-[#E5EAE3]'
            }
            icon={
              <AlertTriangle
                size={18}
                className={stats.lowStockCount > 0 ? 'text-[#E68A00]' : 'text-gray-300'}
              />
            }
            onClick={() => navigate('/reorder')}
          />
          <StatCard
            value={stats.todaySalesCount}
            label={t('todaySales')}
            color="bg-white border-[#E5EAE3]"
            icon={<ShoppingCart size={18} className="text-[#087F5B]" />}
            onClick={() => navigate('/history')}
          />
        </div>
      )}

      {/* Main Responsive Dashboard Body: 2 Columns on Tablet / Desktop */}
      <div className="px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Left Column: Actionable Alerts & Recent Activity */}
        <div className="flex flex-col gap-4">
          {/* Actionable Low Stock Alert Card directly on Home */}
          {!isEmpty && stats && stats.lowStockCount > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#FCD59A] shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E68A00] animate-pulse" />
                  <h2 className="text-sm font-bold text-[#20352C]">
                    {t('lowStockAlertHeader')}
                  </h2>
                  <span className="bg-[#FFF4E0] text-[#8D5300] text-[11px] font-bold px-2 py-0.5 rounded-full border border-[#FCD59A]">
                    {stats.lowStockCount}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/reorder')}
                  className="text-xs font-bold text-[#155E46] hover:text-[#087F5B] flex items-center gap-1 cursor-pointer min-h-[36px]"
                  id="home-view-all-reorder"
                >
                  {t('viewAll')}
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {stats.lowStockItems.map((item) => (
                  <div
                    key={item.product.id}
                    onClick={() => navigate('/reorder')}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#FFFDF8] border border-[#FCD59A]/60 hover:bg-[#FFF4E0] cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#20352C] text-xs truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[11px] text-[#6B7C72] mt-0.5">
                        {t('currentStock')}:{' '}
                        <span className="font-bold text-[#E68A00]">
                          {formatQty(item.product.quantity, item.product.unit)}
                        </span>{' '}
                        (Min: {formatQty(item.product.lowStockThreshold, item.product.unit)})
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8D5300] bg-[#FFF4E0] px-2 py-1 rounded-lg border border-[#FCD59A]">
                        <RefreshCw size={10} />
                        {t('needToOrder')}: {formatQty(item.deficit, item.product.unit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {!isEmpty && stats && stats.recentSales.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-bold text-[#20352C]">{t('recentActivity')}</h2>
                <button
                  onClick={() => navigate('/history')}
                  className="text-xs font-bold text-[#155E46] hover:text-[#087F5B] flex items-center gap-0.5 cursor-pointer min-h-[36px]"
                  id="home-view-all-history"
                >
                  {t('viewAll')}
                  <ArrowRight size={13} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {stats.recentSales.map((sale) => (
                  <SaleRow key={sale.id} sale={sale} lang={lang} />
                ))}
              </div>
            </div>
          )}

          {!isEmpty && stats && stats.recentSales.length === 0 && (
            <div className="bg-white rounded-2xl p-6 border border-[#E5EAE3] text-center text-[#6B7C72]">
              <TrendingDown size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-xs font-semibold">{t('noActivity')}</p>
            </div>
          )}
        </div>

        {/* Right Column: Daily Business Overview (Phase 6) */}
        {!isEmpty && stats && stats.dailySummary && (stats.dailySummary.salesTransactionCount > 0 || stats.dailySummary.restockTransactionsCount > 0) && (
          <div>
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E5EAE3] shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 size={16} className="text-[#087F5B]" />
                  <h2 className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
                    {t('dailySummaryHeading')}
                  </h2>
                </div>
                {stats.dailySummary.previousDayComparison.hasPreviousData && (
                  <span className="text-[11px] font-bold text-[#155E46] bg-[#DFF5E8] px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#C1EBD2]">
                    <TrendingUp size={11} />
                    {stats.dailySummary.previousDayComparison.salesCountDelta >= 0 ? '+' : ''}
                    {stats.dailySummary.previousDayComparison.salesCountDelta} {t('yesterdayComparison')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center mb-3">
                <div className="bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl p-3">
                  <p className="text-xl font-extrabold text-[#20352C]">
                    {stats.dailySummary.salesTransactionCount}
                  </p>
                  <p className="text-[10px] text-[#6B7C72] mt-0.5 font-medium">
                    {t('salesTransactions')}
                  </p>
                </div>
                <div className="bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl p-3">
                  <p className="text-xl font-extrabold text-[#087F5B]">
                    {stats.dailySummary.restockTransactionsCount}
                  </p>
                  <p className="text-[10px] text-[#6B7C72] mt-0.5 font-medium">
                    {t('stockReceivedToday')}
                  </p>
                </div>
                <div className="bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl p-3">
                  <p className="text-xl font-extrabold text-[#20352C]">
                    {stats.dailySummary.manualAdjustmentsCount}
                  </p>
                  <p className="text-[10px] text-[#6B7C72] mt-0.5 font-medium">
                    {t('adjustmentsToday')}
                  </p>
                </div>
              </div>

              {/* Units sold breakdown */}
              {stats.dailySummary.unitsSold.length > 0 && (
                <div className="pt-3 border-t border-[#E5EAE3]">
                  <p className="text-[10px] font-bold text-[#6B7C72] uppercase tracking-wider mb-2">
                    {t('unitsSoldLabel')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stats.dailySummary.unitsSold.map((u) => (
                      <span
                        key={u.unit}
                        className="bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2] font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-2xs"
                      >
                        {formatQty(u.totalQuantity, u.unit)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Sold Products Display */}
              {stats.dailySummary.topSoldProducts && stats.dailySummary.topSoldProducts.length > 0 && (
                <div className="pt-3 mt-3 border-t border-[#E5EAE3]">
                  <p className="text-[10px] font-bold text-[#6B7C72] uppercase tracking-wider mb-2">
                    {t('topSellingItems')}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {stats.dailySummary.topSoldProducts.map((p, idx) => (
                      <div
                        key={p.productId}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#F9F7EF] border border-[#E5EAE3] text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-full bg-[#DFF5E8] text-[#155E46] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[#20352C] truncate">{p.productName}</span>
                        </div>
                        <span className="text-xs font-extrabold text-[#087F5B] shrink-0 ml-2">
                          {formatQty(p.quantity, p.unit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Empty Store State */}
      {isEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
          <div className="w-20 h-20 bg-[#DFF5E8] rounded-3xl flex items-center justify-center mb-4 text-[#087F5B] shadow-xs border border-[#C1EBD2]">
            <Package size={36} />
          </div>
          <h2 className="text-lg font-bold text-[#20352C] mb-1">{t('emptyShopTitle')}</h2>
          <p className="text-[#6B7C72] text-xs leading-relaxed mb-5 max-w-xs">{t('emptyShopMsg')}</p>
          <Button onClick={() => navigate('/stock')} size="md" id="home-empty-add">
            <Plus size={18} />
            {t('addProduct')}
          </Button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
  icon,
  onClick,
}: {
  value: number;
  label: string;
  color: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} rounded-2xl p-3 shadow-2xs border text-left transition-all hover:shadow-xs active:scale-[0.98] cursor-pointer`}
    >
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-extrabold text-[#20352C] leading-none">{value}</p>
      <p className="text-[11px] text-[#6B7C72] mt-1.5 leading-tight line-clamp-1 font-medium">{label}</p>
    </button>
  );
}

function SaleRow({ sale, lang }: { sale: Sale; lang: 'hi' | 'en' }) {
  return (
    <div className="flex items-center bg-white border border-[#E5EAE3] rounded-2xl px-3.5 py-2.5 shadow-2xs gap-3">
      <div className="w-8 h-8 bg-[#DFF5E8] rounded-xl flex items-center justify-center shrink-0">
        <ShoppingCart size={15} className="text-[#087F5B]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#20352C] text-xs truncate">{sale.productName}</p>
        <p className="text-[11px] font-extrabold text-[#155E46]">
          {formatQty(sale.quantity, sale.unit)}
        </p>
      </div>
      <span className="text-[11px] text-[#6B7C72] shrink-0 font-medium">
        {formatRelativeTime(sale.soldAt, lang)}
      </span>
    </div>
  );
}
