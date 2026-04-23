
import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import { Search, Package, Edit, Trash2, Plus, FileSpreadsheet, Printer, MapPin, SlidersHorizontal, ArrowUpAZ, ArrowDownZA, RotateCcw, Hexagon, Scissors, PackagePlus, Eye, Info } from 'lucide-react';
import { Product, User } from '../types';
import { MATERIALS } from '../constants';

interface InventoryListProps {
  products: Product[];
  onDelete: (id: string) => void;
  onEdit: (product: Product) => void;
  onAddProduct: () => void;
  onBulkAdd: () => void;
  onPrintBarcodes: () => void;
  onProductClick: (product: Product) => void;
  currentUser: User;
}

const ITEMS_PER_PAGE = 50;

// Sort Options
type SortKey = 'location' | 'part_code' | 'current_stock' | 'product_name';
type SortDirection = 'asc' | 'desc';

// --- MEMOIZED LIST ITEM (Performance Optimization) ---
const InventoryItem = React.memo(({ product, currentUser, onDelete, onEdit, onProductClick }: { product: Product, currentUser: User, onDelete: (id: string) => void, onEdit: (p: Product) => void, onProductClick: (p: Product) => void }) => {
    const getStockStatusColor = (current: number, min: number) => {
        if (current <= 0) return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600';
        if (current <= min) return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
        if (current <= min * 1.5) return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30';
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30';
    };

    const getStockQuantityColor = (current: number, min: number) => {
      if (current <= min) return 'text-red-600 dark:text-red-400';
      if (current <= min * 1.5) return 'text-amber-600 dark:text-amber-400';
      return 'text-slate-700 dark:text-slate-200';
    };

    // Helper for robust material check
    const isScissors = product.material && product.material.toLocaleLowerCase('tr-TR') === 'çene bıçağı';

    return (
        <div 
            onClick={() => onProductClick(product)}
            title="Detayları görmek için tıklayın"
            className={`relative group p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] hover:z-10 ${getStockStatusColor(product.current_stock, product.min_stock_level)}`}
        >
            {/* Hover Indicator */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1 text-[10px] bg-blue-600 text-white px-2 py-1 rounded-full shadow-sm animate-fade-in">
                    <Info size={12} /> Detaylar
                </div>
            </div>

            <div className="flex items-start gap-4 pointer-events-none"> {/* Make children ignore pointer events to let parent handle click */}
                <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-600 shadow-sm flex-shrink-0">
                    {isScissors ? <Scissors className="text-slate-400" size={24} /> : <Package className="text-slate-400" size={24} />}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-800 dark:text-white text-base leading-tight">{product.product_name}</h4>
                        {product.material && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${isScissors ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                                {product.material}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {product.part_code && (
                            <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                                <span className="opacity-70">Kod:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{product.part_code}</span>
                            </div>
                        )}
                        {product.location && (
                            <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-900/30">
                                <MapPin size={10} className="text-orange-500" />
                                <span className="font-bold text-orange-700 dark:text-orange-400">{product.location}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <span className="opacity-70">ID:</span>
                            <span>{product.short_id}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-6 pl-16 sm:pl-0 pointer-events-auto">
                <div className="text-right pointer-events-none">
                    <span className={`block text-2xl font-black ${getStockQuantityColor(product.current_stock, product.min_stock_level)}`}>
                        {product.current_stock}
                        <span className="text-xs font-medium text-slate-400 ml-1">{product.unit}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium bg-white/50 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">
                        Min: {product.min_stock_level}
                    </span>
                </div>

                {currentUser.role === 'ADMIN' && (
                    <div className="flex gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-colors active:scale-95"
                            title="Düzenle"
                        >
                            <Edit size={18} />
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation();
                                if(window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) onDelete(product.id);
                            }}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors active:scale-95"
                            title="Sil"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

const InventoryList: React.FC<InventoryListProps> = ({ products, onDelete, onEdit, onAddProduct, onBulkAdd, onPrintBarcodes, onProductClick, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('location');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'EMPTY'>('ALL');
  const [filterMaterial, setFilterMaterial] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);

  // --- PERFORMANCE OPTIMIZATION ---
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const lastKeyTime = useRef<number>(0);
  const barcodeBuffer = useRef<string>('');

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (document.activeElement?.tagName === 'INPUT') return;

          const now = Date.now();
          const isScannerInput = now - lastKeyTime.current < 50;
          lastKeyTime.current = now;

          if (e.key === 'Enter') {
              if (barcodeBuffer.current.length > 0) {
                  const code = barcodeBuffer.current.trim();
                  const product = products.find(p => String(p.short_id).trim() === code);
                  if (product) {
                      setSearchTerm(product.part_code || '');
                  } else {
                      setSearchTerm(code);
                  }
                  barcodeBuffer.current = '';
              }
          } else if (e.key.length === 1 && isScannerInput) {
              barcodeBuffer.current += e.key;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  // --- FILTERING & SORTING LOGIC ---
  const processedProducts = useMemo(() => {
    let result = products;

    if (deferredSearchTerm) {
        const term = deferredSearchTerm.toLowerCase();
        result = result.filter(product => {
            return (
                product.product_name.toLowerCase().includes(term) || 
                (product.part_code && product.part_code.toLowerCase().includes(term)) ||
                (product.location && product.location.toLowerCase().includes(term)) ||
                (product.material && product.material.toLowerCase().includes(term)) ||
                (product.barcode && product.barcode.includes(term)) ||
                (product.id && product.id.toLowerCase() === term) ||
                (product.short_id && String(product.short_id).includes(term))
            );
        });
    }

    if (filterStatus === 'CRITICAL') {
        result = result.filter(p => p.current_stock <= p.min_stock_level && p.current_stock > 0);
    } else if (filterStatus === 'EMPTY') {
        result = result.filter(p => p.current_stock <= 0);
    }

    if (filterMaterial) {
        // Robust filtering: Case insensitive
        result = result.filter(p => p.material && p.material.toLocaleLowerCase('tr-TR') === filterMaterial.toLocaleLowerCase('tr-TR'));
    }

    result.sort((a, b) => {
        let valA: any = a[sortKey];
        let valB: any = b[sortKey];

        if (!valA) valA = '';
        if (!valB) valB = '';

        if (sortKey === 'current_stock') {
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const compareResult = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? compareResult : -compareResult;
    });

    return result;
  }, [products, deferredSearchTerm, sortKey, sortDirection, filterStatus, filterMaterial]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, filterStatus, filterMaterial]);

  const totalPages = Math.ceil(processedProducts.length / ITEMS_PER_PAGE);
  const currentData = processedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSortChange = (key: SortKey) => {
      if (sortKey === key) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortKey(key);
          setSortDirection('asc');
      }
  };

  const activeFilterCount = (filterStatus !== 'ALL' ? 1 : 0) + (filterMaterial ? 1 : 0);

  return (
    <div className="space-y-4 pb-20 h-full flex flex-col">
      
      {/* Mobile Header Actions */}
      <div className="flex justify-between items-center md:hidden gap-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Stok Listesi</h3>
          <div className="flex gap-2">
            <button 
                onClick={onPrintBarcodes}
                className="bg-slate-600 text-white p-2 rounded-lg shadow-md active:scale-95 transition-transform"
                title="Etiket Yazdır"
            >
                <Printer size={20} />
            </button>
            {currentUser.role === 'ADMIN' && (
                <>
                    <button 
                        onClick={onBulkAdd}
                        className="bg-green-600 text-white p-2 rounded-lg shadow-md active:scale-95 transition-transform"
                    >
                        <FileSpreadsheet size={20} />
                    </button>
                    <button 
                        onClick={onAddProduct}
                        className="bg-blue-600 text-white p-2 rounded-lg shadow-md active:scale-95 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </>
            )}
          </div>
      </div>

      {/* Search & Main Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 sticky top-0 z-10 transition-colors">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Parça Kodu, Adı veya Barkod ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                {searchTerm !== deferredSearchTerm && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
            
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors border ${showFilters || activeFilterCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'}`}
            >
                <SlidersHorizontal size={18} />
                <span className="hidden sm:inline">Sırala & Filtrele</span>
                {activeFilterCount > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-1">
                        {activeFilterCount}
                    </span>
                )}
            </button>

            <button
                onClick={onPrintBarcodes}
                className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors font-medium border border-slate-200 dark:border-slate-600"
            >
                <Printer size={18} />
                <span className="hidden lg:inline">Etiket</span>
            </button>
            
            {currentUser.role === 'ADMIN' && (
                <button
                    onClick={onAddProduct}
                    className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-bold shadow-sm active:scale-95"
                >
                    <PackagePlus size={18} />
                    <span className="hidden lg:inline">Yeni Ekle</span>
                </button>
            )}
          </div>
          
           <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setFilterMaterial(filterMaterial === 'Çene Bıçağı' ? '' : 'Çene Bıçağı')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                        filterMaterial === 'Çene Bıçağı'
                        ? 'bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-300' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
                    }`}
                >
                    <Scissors size={12} />
                    Çene Bıçakları
                </button>
           </div>

          {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                  
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Sıralama</label>
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleSortChange('product_name')} className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold transition-colors border ${sortKey === 'product_name' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'}`}>
                              Ürün Adı
                              {sortKey === 'product_name' && (sortDirection === 'asc' ? <ArrowUpAZ size={14}/> : <ArrowDownZA size={14}/>)}
                          </button>
                          <button onClick={() => handleSortChange('location')} className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold transition-colors border ${sortKey === 'location' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'}`}>
                              <MapPin size={14} /> Reyon
                              {sortKey === 'location' && (sortDirection === 'asc' ? <ArrowUpAZ size={14}/> : <ArrowDownZA size={14}/>)}
                          </button>
                          <button onClick={() => handleSortChange('part_code')} className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold transition-colors border ${sortKey === 'part_code' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'}`}>
                              # Parça Kodu
                              {sortKey === 'part_code' && (sortDirection === 'asc' ? <ArrowUpAZ size={14}/> : <ArrowDownZA size={14}/>)}
                          </button>
                          <button onClick={() => handleSortChange('current_stock')} className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold transition-colors border ${sortKey === 'current_stock' ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'}`}>
                              <Package size={14} /> Stok Miktarı
                              {sortKey === 'current_stock' && (sortDirection === 'asc' ? <ArrowUpAZ size={14}/> : <ArrowDownZA size={14}/>)}
                          </button>
                      </div>
                  </div>

                  <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Durum Filtresi</label>
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold outline-none"
                        >
                            <option value="ALL">Tüm Durumlar</option>
                            <option value="CRITICAL">Kritik Stok</option>
                            <option value="EMPTY">Tükenmiş</option>
                        </select>
                  </div>

                  <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Hammadde Filtresi</label>
                        <div className="relative">
                            <Hexagon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select 
                                value={filterMaterial}
                                onChange={(e) => setFilterMaterial(e.target.value)}
                                className="w-full pl-9 p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold outline-none"
                            >
                                <option value="">Tüm Hammaddeler</option>
                                {MATERIALS.map((m, i) => <option key={i} value={m}>{m}</option>)}
                            </select>
                        </div>
                  </div>

                  <div className="flex items-end justify-end md:col-span-2 lg:col-span-3">
                      <button 
                        onClick={() => {
                            setFilterStatus('ALL');
                            setFilterMaterial('');
                            setSortKey('location');
                            setSortDirection('asc');
                            setSearchTerm('');
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                      >
                          <RotateCcw size={14} />
                          Sıfırla
                      </button>
                  </div>
              </div>
          )}
      </div>

      <div className="space-y-3">
        {currentData.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                <Package className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={48} />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Sonuç bulunamadı.</p>
                {(searchTerm || activeFilterCount > 0) && (
                    <button 
                        onClick={() => { setSearchTerm(''); setFilterStatus('ALL'); setFilterMaterial(''); }}
                        className="mt-4 text-blue-600 dark:text-blue-400 text-sm hover:underline font-medium"
                    >
                        Filtreleri Temizle
                    </button>
                )}
            </div>
        ) : (
            currentData.map(product => (
                <InventoryItem 
                    key={product.id} 
                    product={product} 
                    currentUser={currentUser} 
                    onDelete={onDelete} 
                    onEdit={onEdit} 
                    onProductClick={onProductClick}
                />
            ))
        )}
      </div>

      {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4 py-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                  Önceki
              </button>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  Sayfa {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                  Sonraki
              </button>
          </div>
      )}
    </div>
  );
};

export default InventoryList;
