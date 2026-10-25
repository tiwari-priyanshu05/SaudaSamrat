import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Globe2,
  WifiOff,
  Database,
  RefreshCw,
  Clock,
  Check,
  ChevronRight,
  ShieldCheck,
  Info,
  Edit3,
  User,
  Sparkles,
  Layers,
  Plus,
  X,
  Download,
  Upload,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import {
  getProducts,
  getSales,
  getLowStockProducts,
  getShopProfile,
  subscribeShopProfile,
  getCustomCategories,
  addCustomCategory,
  removeCustomCategory,
  DEFAULT_CATEGORIES,
  subscribeCategories,
  exportBackupFile,
  validateBackupContent,
} from '../services';
import type { ShopProfile, BackupPayload, RestoreResult } from '../types';
import { db } from '../db';
import { Button } from '../components/Button';
import { ProfileModal } from '../components/ProfileModal';
import { RestoreModal } from '../components/RestoreModal';

export default function MorePage() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();

  // Shop Owner Profile
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  // Shop Categories
  const [customCategories, setCustomCategories] = useState<string[]>(() => getCustomCategories());
  const [newCatInput, setNewCatInput] = useState('');
  const [catError, setCatError] = useState('');

  // Backup & Restore
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestorePayload, setPendingRestorePayload] = useState<BackupPayload | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Database metrics
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalAdjustments, setTotalAdjustments] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [products, sales, adjustments, lowStock, shopProf] = await Promise.all([
        getProducts(),
        getSales({ limit: 1000 }),
        db.stockAdjustments.count(),
        getLowStockProducts(),
        getShopProfile(),
      ]);
      setTotalProducts(products.length);
      setTotalSales(sales.length);
      setTotalAdjustments(adjustments);
      setLowStockCount(lowStock.length);
      setProfile(shopProf);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to live profile updates
  useEffect(() => {
    const unsubscribe = subscribeShopProfile((updated) => {
      setProfile(updated);
    });
    return unsubscribe;
  }, []);

  // Subscribe to custom category updates
  useEffect(() => {
    const unsubscribe = subscribeCategories((cats) => {
      setCustomCategories(cats);
    });
    return unsubscribe;
  }, []);

  function handleAddCategory() {
    const res = addCustomCategory(newCatInput);
    if (!res.success) {
      if (res.error === 'EMPTY') setCatError(t('errorRequired'));
      else if (res.error === 'TOO_LONG') setCatError(t('errorNameTooLong'));
      else setCatError(t('categoryExists'));
      return;
    }
    setCustomCategories(res.categories);
    setNewCatInput('');
    setCatError('');
  }

  function handleRemoveCategory(cat: string) {
    const updated = removeCustomCategory(cat);
    setCustomCategories(updated);
  }

  async function handleExportBackup() {
    setIsExporting(true);
    setBackupMsg(null);
    try {
      await exportBackupFile();
      setBackupMsg({ text: t('exportSuccess'), type: 'success' });
    } catch (err) {
      console.error(err);
      setBackupMsg({ text: t('errorGeneric'), type: 'error' });
    } finally {
      setIsExporting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const validation = validateBackupContent(text);
        if (!validation.valid || !validation.payload) {
          setBackupMsg({
            text: validation.error || t('invalidBackupFile'),
            type: 'error',
          });
          return;
        }
        setPendingRestorePayload(validation.payload);
        setShowRestoreModal(true);
      } catch (err) {
        console.error(err);
        setBackupMsg({ text: t('invalidBackupFile'), type: 'error' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setBackupMsg({ text: t('invalidBackupFile'), type: 'error' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  }

  function handleRestoreSuccess(res: RestoreResult) {
    setBackupMsg({
      text: `${t('restoreSuccess')} (${res.restoredCounts.products} ${t('totalProducts')})`,
      type: 'success',
    });
    loadData();
  }

  function handleRestoreError(msg: string) {
    setBackupMsg({ text: msg, type: 'error' });
  }


  return (
    <div className="flex flex-col min-h-full bg-[#F9F7EF] pb-28">
      {/* Header */}
      <div className="bg-[#155E46] text-white px-5 sm:px-8 pt-12 pb-6 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white">
              <Store size={15} className="text-[#FFB454]" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#DFF5E8]">
              {t('appName')}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-[#DFF5E8] text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-white/20">
            <WifiOff size={11} />
            Offline Ready
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('moreTitle')}</h1>
      </div>

      <div className="px-4 sm:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-start">
          {/* Column 1: Store & Preferences */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Settings > Shop Profile Section */}
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <User size={15} className="text-[#087F5B]" />
                <h2 className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
                  {t('settingsShopProfile')}
                </h2>
              </div>

              {profile && profile.ownerName && profile.shopName ? (
                <div className="bg-white rounded-2xl p-4 border border-[#E5EAE3] shadow-2xs" data-testid="profile-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2] rounded-2xl flex items-center justify-center font-bold text-lg shrink-0">
                        <Store size={24} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-[#6B7C72] uppercase tracking-wider">
                          {t('yourShop')}
                        </p>
                        <h2 className="text-base font-extrabold text-[#20352C] truncate">
                          {profile.shopName}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#155E46] font-semibold truncate">
                          <User size={13} className="shrink-0 text-[#087F5B]" />
                          <span className="truncate">
                            {t('ownerRole')}: <strong className="font-bold">{profile.ownerName}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="p-2.5 text-[#087F5B] hover:bg-[#DFF5E8] rounded-xl transition-colors cursor-pointer border border-[#E5EAE3] shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title={t('editProfile')}
                      aria-label={t('editProfile')}
                      id="edit-profile-btn"
                      data-testid="edit-profile-btn"
                    >
                      <Edit3 size={17} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FFF4E0] rounded-2xl p-4 border border-[#FFE3B3] shadow-2xs">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 text-[#8D5300]">
                      <Sparkles size={18} />
                      <h2 className="text-sm font-extrabold">{t('setupProfile')}</h2>
                    </div>
                  </div>
                  <p className="text-xs text-[#8D5300]/90 leading-relaxed mb-3 font-medium">
                    {t('setupProfileDesc')}
                  </p>
                  <Button
                    onClick={() => setEditingProfile(true)}
                    size="sm"
                    id="setup-profile-btn"
                    data-testid="setup-profile-btn"
                    className="!py-2 shadow-xs"
                  >
                    <User size={15} />
                    {t('setupProfile')}
                  </Button>
                </div>
              )}
            </div>

            {/* Settings > Shop Categories Section */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5EAE3] shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-[#087F5B]" />
                  <h2 className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
                    {t('categoriesTitle')}
                  </h2>
                </div>
              </div>
              <p className="text-xs text-[#6B7C72] mb-3 leading-relaxed font-medium">
                {t('categoriesDesc')}
              </p>

              {/* Active Categories List */}
              <div className="flex flex-wrap gap-1.5 mb-3.5">
                {DEFAULT_CATEGORIES.map((c) => (
                  <span
                    key={c.key}
                    className="inline-flex items-center bg-[#F9F7EF] text-[#20352C] text-xs font-semibold px-2.5 py-1 rounded-xl border border-[#E5EAE3]"
                  >
                    {lang === 'hi' ? c.defaultHi : c.defaultEn}
                  </span>
                ))}
                {customCategories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 bg-[#DFF5E8] text-[#155E46] text-xs font-bold px-2.5 py-1 rounded-xl border border-[#C1EBD2]"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="text-[#155E46] hover:text-[#E86D5A] p-0.5 rounded-full cursor-pointer transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
                      title={t('cancel')}
                      aria-label={`Remove ${cat}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Custom Category Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => {
                    setNewCatInput(e.target.value);
                    if (catError) setCatError('');
                  }}
                  placeholder={t('addCategoryPlaceholder')}
                  className="flex-1 rounded-xl border border-[#E5EAE3] px-3.5 py-2 text-xs text-[#20332A] bg-[#F9F7EF] outline-none focus:border-[#087F5B] focus:ring-2 focus:ring-[#DFF5E8] min-h-[44px]"
                  id="settings-add-category-input"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCategory}
                  id="settings-add-category-btn"
                  className="!py-2 text-xs shrink-0 min-h-[44px]"
                >
                  <Plus size={14} />
                  {t('addCategory')}
                </Button>
              </div>
              {catError && (
                <p className="text-xs font-semibold text-[#E86D5A] mt-1.5">{catError}</p>
              )}
            </div>

            {/* Language Selection */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5EAE3] shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <Globe2 size={18} className="text-[#087F5B]" />
                <h2 className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
                  {t('language')}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLang('hi')}
                  id="lang-btn-hi"
                  className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer min-h-[52px] ${
                    lang === 'hi'
                      ? 'border-[#087F5B] bg-[#DFF5E8] text-[#155E46] font-bold shadow-xs'
                      : 'border-[#E5EAE3] bg-white text-[#6B7C72] hover:border-[#C1EBD2]'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-[#20352C]">हिंदी</p>
                    <p className="text-[11px] text-[#6B7C72] font-medium">Hindi</p>
                  </div>
                  {lang === 'hi' && <Check size={18} className="text-[#087F5B] shrink-0" />}
                </button>

                <button
                  onClick={() => setLang('en')}
                  id="lang-btn-en"
                  className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all cursor-pointer min-h-[52px] ${
                    lang === 'en'
                      ? 'border-[#087F5B] bg-[#DFF5E8] text-[#155E46] font-bold shadow-xs'
                      : 'border-[#E5EAE3] bg-white text-[#6B7C72] hover:border-[#C1EBD2]'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-[#20352C]">English</p>
                    <p className="text-[11px] text-[#6B7C72] font-medium">अंग्रेजी</p>
                  </div>
                  {lang === 'en' && <Check size={18} className="text-[#087F5B] shrink-0" />}
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Management & Storage */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Quick Shortcuts */}
            <div className="bg-white rounded-2xl p-2 border border-[#E5EAE3] shadow-2xs flex flex-col divide-y divide-[#E5EAE3]/60">
              <button
                onClick={() => navigate('/reorder')}
                className="flex items-center justify-between p-3 hover:bg-[#F9F7EF] rounded-xl transition-colors text-left cursor-pointer min-h-[52px]"
                id="more-reorder-link"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF4E0] text-[#8D5300] border border-[#FFE3B3] flex items-center justify-center shrink-0">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#20352C]">{t('reorderTitle')}</p>
                    <p className="text-xs text-[#6B7C72] font-medium">{t('viewReorder')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {lowStockCount > 0 && (
                    <span className="bg-[#FFF4E0] text-[#8D5300] border border-[#FFE3B3] font-bold text-xs px-2.5 py-0.5 rounded-full">
                      {lowStockCount} {t('lowStockTitle')}
                    </span>
                  )}
                  <ChevronRight size={18} className="text-[#6B7C72]" />
                </div>
              </button>

              <button
                onClick={() => navigate('/history')}
                className="flex items-center justify-between p-3 hover:bg-[#F9F7EF] rounded-xl transition-colors text-left cursor-pointer min-h-[52px]"
                id="more-history-link"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2] flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#20352C]">{t('historyTitle')}</p>
                    <p className="text-xs text-[#6B7C72] font-medium">{totalSales} {t('items')}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-[#6B7C72]" />
              </button>
            </div>

            {/* Storage & Database Overview */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5EAE3] shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database size={18} className="text-[#087F5B]" />
                  <h2 className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
                    {t('databaseSummary')}
                  </h2>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#155E46] bg-[#DFF5E8] border border-[#C1EBD2] px-2.5 py-0.5 rounded-full">
                  <ShieldCheck size={12} />
                  IndexedDB
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl p-2.5">
                  <p className="text-lg font-extrabold text-[#20352C]">{totalProducts}</p>
                  <p className="text-[10px] text-[#6B7C72] mt-0.5 font-medium">{t('totalProducts')}</p>
                </div>
                <div className="bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl p-2.5">
                  <p className="text-lg font-extrabold text-[#20352C]">{totalSales}</p>
                  <p className="text-[10px] text-[#6B7C72] mt-0.5 font-medium">{t('todaySales')}</p>
                </div>
                <div className="bg-[#F9F7EF] border border-[#E5EAE3] rounded-xl p-2.5">
                  <p className="text-lg font-extrabold text-[#20352C]">{totalAdjustments}</p>
                  <p className="text-[10px] text-[#6B7C72] mt-0.5 font-medium">{t('totalAuditsCount')}</p>
                </div>
              </div>
              <p className="text-[11px] text-[#6B7C72] mt-3 pt-2.5 border-t border-[#E5EAE3] leading-relaxed font-medium">
                {t('offlineDesc')}
              </p>
            </div>

            {/* Local Backup and Restore Section */}
            <div className="bg-white rounded-2xl p-4 border border-[#E5EAE3] shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive size={18} className="text-[#087F5B]" />
                  <h2 className="text-xs font-bold text-[#6B7C72] uppercase tracking-wider">
                    {t('backupRestoreTitle')}
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-[#155E46] bg-[#DFF5E8] px-2 py-0.5 rounded-full border border-[#C1EBD2]">
                  JSON v1.0
                </span>
              </div>

              <p className="text-xs text-[#6B7C72] mb-3 leading-relaxed font-medium">
                {t('backupRestoreDesc')}
              </p>

              {backupMsg && (
                <div
                  className={`flex items-start gap-2 p-3 rounded-xl mb-3 text-xs font-semibold ${
                    backupMsg.type === 'success'
                      ? 'bg-[#DFF5E8] text-[#155E46] border border-[#C1EBD2]'
                      : 'bg-[#FDF2F0] text-[#E86D5A] border border-[#FADCD7]'
                  }`}
                  data-testid="backup-status-msg"
                >
                  {backupMsg.type === 'success' ? (
                    <CheckCircle2 size={16} className="shrink-0 text-[#087F5B] mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 text-[#E86D5A] mt-0.5" />
                  )}
                  <span className="flex-1 leading-snug">{backupMsg.text}</span>
                  <button
                    onClick={() => setBackupMsg(null)}
                    className="text-[#6B7C72] hover:text-[#20352C] p-1 min-h-[30px] min-w-[30px] flex items-center justify-center cursor-pointer"
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  size="sm"
                  id="export-backup-btn"
                  data-testid="export-backup-btn"
                  className="!py-2.5 shadow-xs"
                >
                  {isExporting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  {isExporting ? t('loading') : t('exportBackupBtn')}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                  id="restore-backup-btn"
                  data-testid="restore-backup-btn"
                  className="!py-2.5"
                >
                  <Upload size={15} />
                  {t('restoreBackupBtn')}
                </Button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json,application/json"
                  className="hidden"
                  id="backup-file-input"
                  data-testid="backup-file-input"
                />
              </div>
            </div>

            {/* Kirana Best Practices Guide */}
            <div className="bg-[#DFF5E8]/60 rounded-2xl p-4 border border-[#C1EBD2]">
              <div className="flex items-center gap-2 mb-2 text-[#155E46]">
                <Info size={16} />
                <h3 className="text-xs font-bold uppercase tracking-wider">{t('kiranaTips')}</h3>
              </div>
              <p className="text-xs text-[#20352C] leading-relaxed mb-1.5 font-medium">
                • {t('tipOffline')}
              </p>
              <p className="text-xs text-[#20352C] leading-relaxed font-medium">
                • {t('tipReorder')}
              </p>
            </div>
          </div>

          <p className="col-span-full text-center text-[11px] text-[#6B7C72] pt-4 font-medium">
            {t('appName')} v1.0 • Made for Kirana Stores 🇮🇳
          </p>
        </div>
      </div>

      {/* Edit Shop Owner Profile Modal */}
      <ProfileModal
        open={editingProfile}
        initial={profile}
        onClose={() => setEditingProfile(false)}
        onSaved={(updated) => setProfile(updated)}
      />

      {/* Restore Preview & Confirmation Modal */}
      <RestoreModal
        open={showRestoreModal}
        payload={pendingRestorePayload}
        onClose={() => setShowRestoreModal(false)}
        onSuccess={handleRestoreSuccess}
        onError={handleRestoreError}
      />
    </div>
  );
}
