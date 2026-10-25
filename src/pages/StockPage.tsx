import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Search, X, Package, AlertTriangle, RefreshCw, Layers, PackagePlus, Barcode } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import type { Translator } from '../i18n/labels';
import {
  getProducts,
  addProduct,
  updateProduct,
  archiveProduct,
  adjustStock,
  formatCategory,
} from '../services';
import type { Product, ProductInput, StockAdjustmentInput } from '../types';
import { isAppError } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ProductForm } from '../components/ProductForm';
import { StockAdjustForm } from '../components/StockAdjustForm';
import { Modal, ConfirmDialog } from '../components/Modal';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { BulkReceiveModal } from '../components/BulkReceiveModal';
import { BatchManagerModal } from '../components/BatchManagerModal';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

export default function StockPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, addToast, dismiss } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [bulkReceiveOpen, setBulkReceiveOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [batchTarget, setBatchTarget] = useState<Product | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);

  // Auto-open bulk receive if directed from home
  useEffect(() => {
    if ((location.state as { openBulkReceive?: boolean } | null)?.openBulkReceive) {
      setBulkReceiveOpen(true);
    }
  }, [location.state]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch {
      addToast('error', t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Count low stock items
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.quantity < p.lowStockThreshold).length;
  }, [products]);

  // Filtered products list
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ? p.barcode.toLowerCase().includes(search.toLowerCase()) : false);

      const matchesCategory =
        selectedCategory === 'all' ||
        p.category.trim().toLowerCase() === selectedCategory.toLowerCase();

      const matchesLowStock = !onlyLowStock || p.quantity < p.lowStockThreshold;

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [products, search, selectedCategory, onlyLowStock]);

  async function handleAdd(input: ProductInput) {
    try {
      await addProduct(input);
      await loadProducts();
      setAddOpen(false);
      addToast('success', `${input.name} — ${t('productAddedSuccess')}`);
    } catch (err) {
      const msg = isAppError(err) ? err.message : t('errorGeneric');
      addToast('error', msg);
    }
  }

  async function handleEdit(input: ProductInput) {
    if (!editProduct) return;
    try {
      await updateProduct(editProduct.id, {
        name: input.name,
        category: input.category,
        unit: input.unit,
        lowStockThreshold: input.lowStockThreshold,
      });
      await loadProducts();
      setEditProduct(null);
      addToast('success', `${input.name} — ${t('productUpdatedSuccess')}`);
    } catch (err) {
      const msg = isAppError(err) ? err.message : t('errorGeneric');
      addToast('error', msg);
    }
  }

  async function handleAdjust(input: StockAdjustmentInput) {
    try {
      await adjustStock(input);
      await loadProducts();
      setAdjustProduct(null);
      addToast('success', t('stockAdjustSuccess'));
    } catch (err) {
      const msg = isAppError(err) ? err.message : t('errorGeneric');
      addToast('error', msg);
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;
    try {
      await archiveProduct(archiveTarget.id);
      await loadProducts();
      addToast('info', `${archiveTarget.name} — ${t('productArchivedSuccess')}`);
    } catch (err) {
      const msg = isAppError(err) ? err.message : t('errorGeneric');
      addToast('error', msg);
    } finally {
      setArchiveTarget(null);
    }
  }

  function handleSell(product: Product) {
    navigate('/sale', { state: { product } });
  }

  return (
    <div className="flex flex-col min-h-full bg-[#F9F7EF] pb-28">
      {/* Header & Search */}
      <div className="bg-white/95 backdrop-blur-md border-b border-[#E5EAE3] px-4 sm:px-8 pt-12 pb-3.5 shadow-2xs sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#20352C]">{t('stockTitle')}</h1>
            <p className="text-xs text-[#6B7C72] font-semibold">
              {filtered.length} {t('items')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lowStockCount > 0 && (
              <button
                onClick={() => navigate('/reorder')}
                className="flex items-center gap-1.5 text-xs font-bold text-[#8D5300] bg-[#FFF4E0] px-3 py-1.5 rounded-xl border border-[#FCD59A] hover:bg-[#FCD59A]/40 transition-colors cursor-pointer select-none"
                id="stock-reorder-shortcut"
              >
                <RefreshCw size={12} />
                {t('reorderTitle')} ({lowStockCount})
              </button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setBulkReceiveOpen(true)}
              id="stock-bulk-receive-btn"
              className="!py-1.5"
            >
              <PackagePlus size={15} />
              {t('bulkReceiveBtn')}
            </Button>
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              id="stock-add-btn"
              className="!py-1.5 shadow-sm shadow-[#087F5B]/20"
            >
              <Plus size={16} />
              {t('addProduct')}
            </Button>
          </div>
        </div>

        {/* Large, Easy-to-Find Search with Barcode Scanner */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7C72]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-10 py-3 rounded-2xl border border-[#E5EAE3] text-sm text-[#20352C] bg-[#F9F7EF] outline-none focus:bg-white focus:border-[#087F5B] focus:ring-2 focus:ring-[#DFF5E8] transition-all min-h-[46px]"
              id="stock-search"
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
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5EAE3] text-[#20352C] hover:bg-[#DFF5E8] hover:border-[#C1EBD2] rounded-2xl text-xs font-bold transition-all shadow-2xs min-h-[46px] cursor-pointer shrink-0"
            title={t('scanBarcode')}
            id="stock-scan-barcode-btn"
          >
            <Barcode size={18} className="text-[#087F5B]" />
            <span className="hidden sm:inline">{t('scanBarcode')}</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {/* All */}
          <button
            onClick={() => {
              setSelectedCategory('all');
              setOnlyLowStock(false);
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all' && !onlyLowStock
                ? 'bg-[#087F5B] text-white shadow-xs'
                : 'bg-[#F9F7EF] text-[#6B7C72] border border-[#E5EAE3] hover:bg-white'
            }`}
          >
            {t('allCategories')} ({products.length})
          </button>

          {/* Low Stock Filter Chip */}
          <button
            onClick={() => {
              setOnlyLowStock(!onlyLowStock);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              onlyLowStock
                ? 'bg-[#E68A00] text-white shadow-xs'
                : lowStockCount > 0
                  ? 'bg-[#FFF4E0] text-[#8D5300] border border-[#FCD59A] hover:bg-[#FCD59A]/30'
                  : 'bg-[#F9F7EF] text-[#6B7C72] border border-[#E5EAE3]'
            }`}
          >
            <AlertTriangle size={12} />
            {t('lowStockFilter')}
            {lowStockCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                  onlyLowStock ? 'bg-[#8D5300] text-[#FFF4E0]' : 'bg-[#FFF4E0] text-[#8D5300]'
                }`}
              >
                {lowStockCount}
              </span>
            )}
          </button>

          {/* Categories */}
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setOnlyLowStock(false);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory.toLowerCase() === cat.toLowerCase() && !onlyLowStock
                  ? 'bg-[#087F5B] text-white shadow-xs'
                  : 'bg-[#F9F7EF] text-[#6B7C72] border border-[#E5EAE3] hover:bg-white'
              }`}
            >
              <Layers size={11} />
              {formatCategory(cat, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 sm:px-8 py-4 sm:py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-36 bg-[#E5EAE3]/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyStock
            hasSearch={!!search || selectedCategory !== 'all' || onlyLowStock}
            onAdd={() => setAddOpen(true)}
            onClear={() => {
              setSearch('');
              setSelectedCategory('all');
              setOnlyLowStock(false);
            }}
            t={t}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={setEditProduct}
                onArchive={setArchiveTarget}
                onAdjust={setAdjustProduct}
                onManageBatches={setBatchTarget}
                onSell={p.quantity > 0 ? handleSell : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal
        open={addOpen}
        title={t('addProduct')}
        onClose={() => setAddOpen(false)}
      >
        <ProductForm
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editProduct}
        title={t('editProduct')}
        onClose={() => setEditProduct(null)}
      >
        {editProduct && (
          <ProductForm
            initial={editProduct}
            onSubmit={handleEdit}
            onCancel={() => setEditProduct(null)}
          />
        )}
      </Modal>

      {/* Adjust modal */}
      <Modal
        open={!!adjustProduct}
        title={t('adjustStock')}
        onClose={() => setAdjustProduct(null)}
      >
        {adjustProduct && (
          <StockAdjustForm
            product={adjustProduct}
            onSubmit={handleAdjust}
            onCancel={() => setAdjustProduct(null)}
          />
        )}
      </Modal>

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        title={t('archiveProduct')}
        message={t('confirmArchive')}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
        danger
      />

      {/* Bulk Stock Receive Modal */}
      <BulkReceiveModal
        open={bulkReceiveOpen}
        products={products}
        onClose={() => setBulkReceiveOpen(false)}
        onSuccess={(res) => {
          loadProducts();
          addToast('success', `${res.totalItemsReceived} ${t('items')} — ${t('receiveSuccess')}`);
        }}
      />

      {/* Batch & Expiry Manager Modal */}
      <BatchManagerModal
        isOpen={!!batchTarget}
        product={batchTarget}
        onClose={() => setBatchTarget(null)}
        onStockChanged={loadProducts}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onProductFound={(p) => {
          setScannerOpen(false);
          setSearch(p.name);
          addToast('success', `${p.name} — ${t('barcodeFound')}`);
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function EmptyStock({
  hasSearch,
  onAdd,
  onClear,
  t,
}: {
  hasSearch: boolean;
  onAdd: () => void;
  onClear: () => void;
  t: Translator;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-20 h-20 bg-[#DFF5E8] rounded-3xl flex items-center justify-center mb-4 text-[#087F5B] shadow-xs border border-[#C1EBD2]">
        <Package size={36} />
      </div>
      <p className="text-[#20352C] font-bold mb-1 text-base">
        {hasSearch ? t('noProducts') : t('emptyShopTitle')}
      </p>
      <p className="text-[#6B7C72] font-medium mb-5 text-xs max-w-xs leading-relaxed">
        {hasSearch ? t('noProductsSearchDesc') : t('emptyShopMsg')}
      </p>
      {hasSearch ? (
        <Button variant="secondary" onClick={onClear} id="stock-clear-filters">
          <RefreshCw size={15} />
          {t('clearFilters')}
        </Button>
      ) : (
        <Button onClick={onAdd} id="stock-empty-add">
          <Plus size={18} />
          {t('addProduct')}
        </Button>
      )}
    </div>
  );
}
