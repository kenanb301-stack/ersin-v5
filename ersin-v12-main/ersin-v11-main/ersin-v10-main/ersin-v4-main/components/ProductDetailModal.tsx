
import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Calendar, ArrowRightLeft, ArrowDownLeft, ArrowUpRight, MapPin, Hash, Barcode, History, AlertTriangle, Search, Activity, Layers, Copy, TrendingDown } from 'lucide-react';
import { Product, Transaction, TransactionType } from '../types';
import BarcodeScanner from './BarcodeScanner';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions: Transaction[];
  initialProductId?: string;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, products, transactions, initialProductId }) => {
  const [showScanner, setShowScanner] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [manualSearch, setManualSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (initialProductId) {
            const p = products.find(p => p.id === initialProductId);
            if (p) {
                setSelectedProduct(p);
                setShowScanner(false);
            } else {
                 setShowScanner(true);
            }
        } else {
            setShowScanner(true);
            setSelectedProduct(null);
        }
        setError('');
        setManualSearch('');
    }
  }, [isOpen, initialProductId, products]);

  const handleScan = (code: string) => {
      const cleanCode = code.trim();
      const product = products.find(p => 
          String(p.short_id) === cleanCode || 
          p.barcode === cleanCode || 
          p.part_code === cleanCode
      );

      if (product) {
          setSelectedProduct(product);
          setShowScanner(false);
          setError('');
      } else {
          setError(`Ürün bulunamadı: ${cleanCode}`);
      }
  };

  const handleManualSearch = (e: React.FormEvent) => {
      e.preventDefault();
      handleScan(manualSearch);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("Kopyalandı: " + text);
  };

  const productStats = useMemo(() => {
      if (!selectedProduct) return null;
      
      const filtered = transactions.filter(t => t.product_id === selectedProduct.id);
      
      const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Son 30 günlük tüketim (ÇIKIŞ)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const monthlyConsumption = filtered
        .filter(t => t.type === TransactionType.OUT && new Date(t.date) >= thirtyDaysAgo)
        .reduce((sum, t) => sum + t.quantity, 0);

      const totalIn = filtered.filter(t => t.type === TransactionType.IN).reduce((sum, t) => sum + t.quantity, 0);
      const totalOut = filtered.filter(t => t.type === TransactionType.OUT).reduce((sum, t) => sum + t.quantity, 0);

      return {
          history: sorted.slice(0, 10),
          monthlyConsumption,
          totalIn,
          totalOut,
          lastMove: sorted[0]?.date
      };
  }, [selectedProduct, transactions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        {showScanner && !selectedProduct && (
            <div className="absolute inset-0 z-[110]">
                <BarcodeScanner 
                    onScanSuccess={handleScan} 
                    onClose={onClose} 
                />
                
                {/* Overlay UI for Scanner */}
                <div className="absolute top-20 left-4 right-4 flex flex-col items-center gap-4 pointer-events-none">
                    {error && (
                        <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-xl font-bold animate-bounce flex items-center gap-2 pointer-events-auto">
                            <AlertTriangle size={20} />
                            {error}
                        </div>
                    )}
                </div>

                <div className="absolute bottom-10 left-4 right-4 z-[120] pointer-events-auto">
                    <form onSubmit={handleManualSearch} className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg flex gap-2">
                        <input 
                            type="text" 
                            value={manualSearch}
                            onChange={(e) => setManualSearch(e.target.value)}
                            placeholder="Kod ile ara..."
                            className="flex-1 bg-transparent px-3 py-2 outline-none dark:text-white"
                        />
                        <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg">
                            <Search size={20} />
                        </button>
                    </form>
                </div>
            </div>
        )}

        {selectedProduct && productStats && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] z-[130] animate-fade-in-up">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Package size={20} className="text-blue-500" /> Ürün Kartı
                        </h2>
                        <span className="text-xs text-slate-400">ID: #{selectedProduct.short_id}</span>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Critical Alert */}
                    {selectedProduct.current_stock <= selectedProduct.min_stock_level && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-4 animate-pulse">
                            <div className="bg-red-100 dark:bg-red-800 p-2 rounded-full text-red-600 dark:text-red-200">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-800 dark:text-red-300 text-lg">Kritik Stok Seviyesi!</h3>
                                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                    Mevcut stok ({selectedProduct.current_stock}), minimum seviyenin ({selectedProduct.min_stock_level}) altında. 
                                    Acil sipariş veya üretim gereklidir.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Main Info */}
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{selectedProduct.product_name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedProduct.material || 'Hammadde Belirtilmemiş'}</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => copyToClipboard(selectedProduct.part_code || '')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-mono font-bold text-slate-700 dark:text-slate-200 border dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                    <Hash size={14} className="text-slate-400"/> 
                                    {selectedProduct.part_code || '-'}
                                    <Copy size={12} className="opacity-50"/>
                                </button>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm font-bold text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-800">
                                    <MapPin size={14}/> 
                                    {selectedProduct.location || 'Konum Yok'}
                                </div>
                            </div>
                        </div>

                        {/* Big Stock Number */}
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 text-center min-w-[150px] flex flex-col justify-center shadow-inner">
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Mevcut Stok</span>
                            <div className={`text-4xl font-black mt-2 ${selectedProduct.current_stock <= selectedProduct.min_stock_level ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>
                                {selectedProduct.current_stock}
                            </div>
                            <span className="text-sm font-bold text-slate-400 mt-1">{selectedProduct.unit}</span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <div className="text-blue-500 mb-1"><TrendingDown size={20}/></div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{productStats.monthlyConsumption}</div>
                            <div className="text-[10px] uppercase font-bold text-blue-400">Son 30 Gün Çıkış</div>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <div className="text-emerald-500 mb-1"><ArrowDownLeft size={20}/></div>
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{productStats.totalIn}</div>
                            <div className="text-[10px] uppercase font-bold text-emerald-400">Toplam Giriş</div>
                        </div>
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800">
                            <div className="text-rose-500 mb-1"><ArrowUpRight size={20}/></div>
                            <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">{productStats.totalOut}</div>
                            <div className="text-[10px] uppercase font-bold text-rose-400">Toplam Çıkış</div>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-100 dark:border-slate-600">
                            <div className="text-slate-400 mb-1"><Layers size={20}/></div>
                            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{selectedProduct.min_stock_level}</div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Min. Stok Limiti</div>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <History size={18} className="text-blue-500"/> Hareket Geçmişi
                            </h4>
                            <span className="text-xs text-slate-400">Son {productStats.history.length} İşlem</span>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                            {productStats.history.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">Henüz işlem kaydı bulunmuyor.</div>
                            ) : (
                                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {productStats.history.map((t, idx) => (
                                        <div key={t.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                    t.type === TransactionType.IN ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 
                                                    t.type === TransactionType.OUT ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30' : 
                                                    'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                                                }`}>
                                                    {t.type === TransactionType.IN ? <ArrowDownLeft size={16}/> : t.type === TransactionType.OUT ? <ArrowUpRight size={16}/> : <ArrowRightLeft size={16}/>}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                        {t.type === TransactionType.IN ? 'Stok Girişi' : t.type === TransactionType.OUT ? 'Stok Çıkışı' : 'Düzeltme'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Calendar size={10}/> {new Date(t.date).toLocaleDateString('tr-TR')} &bull; {t.created_by}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold ${t.type === TransactionType.IN ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {t.type === TransactionType.IN ? '+' : '-'}{t.quantity}
                                                </div>
                                                {t.description && <div className="text-[10px] text-slate-400 max-w-[100px] truncate">{t.description}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between gap-3">
                    <button 
                        onClick={() => { setSelectedProduct(null); setShowScanner(true); setManualSearch(''); }}
                        className="flex-1 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                    >
                        <Search size={18} /> Başka Ara
                    </button>
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 active:scale-95 transition-transform"
                    >
                        Tamam
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProductDetailModal;
