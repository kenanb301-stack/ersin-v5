
import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Calendar, Search, Edit2, ArrowRight, Trash2, Filter, RotateCcw, Clock } from 'lucide-react';
import { Transaction, TransactionType, User, Product } from '../types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  products: Product[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  currentUser: User;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, products, onEdit, onDelete, currentUser }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [descSearch, setDescSearch] = useState('');

  // Quick Date Helper
  const setQuickDate = (type: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH') => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (type === 'TODAY') {
        const d = formatDate(now);
        setDateRange({ start: d, end: d });
    } else if (type === 'YESTERDAY') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const d = formatDate(y);
        setDateRange({ start: d, end: d });
    } else if (type === 'THIS_WEEK') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(now.setDate(diff));
        const sunday = new Date(now.setDate(monday.getDate() + 6));
        setDateRange({ start: formatDate(monday), end: formatDate(sunday) });
    } else if (type === 'THIS_MONTH') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateRange({ start: formatDate(start), end: formatDate(end) });
    }
  };

  const filteredTransactions = transactions
    .filter(t => {
      // 1. Type Filter
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      
      const product = products.find(p => p.id === t.product_id);

      // 2. Main Search (Product Name, Part Code OR Description)
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          const matchesName = t.product_name?.toLowerCase().includes(lower);
          const matchesDesc = t.description?.toLowerCase().includes(lower);
          const matchesPartCode = product?.part_code?.toLowerCase().includes(lower);
          const matchesShortId = product?.short_id?.toLowerCase().includes(lower);
          
          if (!matchesName && !matchesDesc && !matchesPartCode && !matchesShortId) return false;
      }
      
      // 3. Description Search (Advanced Filter)
      if (descSearch && !t.description?.toLowerCase().includes(descSearch.toLowerCase())) return false;

      // 4. Quantity Range Filter
      if (amountRange.min && t.quantity < Number(amountRange.min)) return false;
      if (amountRange.max && t.quantity > Number(amountRange.max)) return false;

      // 5. Date Range Filter
      if (dateRange.start || dateRange.end) {
          const tDate = new Date(t.date);
          if (dateRange.start) {
              const start = new Date(dateRange.start);
              start.setHours(0, 0, 0, 0);
              if (tDate < start) return false;
          }
          if (dateRange.end) {
              const end = new Date(dateRange.end);
              end.setHours(23, 59, 59, 999);
              if (tDate > end) return false;
          }
      }

      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const clearFilters = () => {
      setDateRange({ start: '', end: '' });
      setAmountRange({ min: '', max: '' });
      setDescSearch('');
      setSearchTerm('');
      setFilterType('ALL');
  };

  const activeFilterCount = [
      dateRange.start, dateRange.end, 
      amountRange.min, amountRange.max, 
      descSearch
  ].filter(Boolean).length;

  const handleExport = () => {
    const headers = ["Tarih", "İşlem Tipi", "Parça Kodu", "Ürün Adı", "Miktar", "Önceki Stok", "Sonraki Stok", "Açıklama", "Kullanıcı"];
    const rows = filteredTransactions.map(t => {
        const product = products.find(p => p.id === t.product_id);
        return [
            new Date(t.date).toLocaleString('tr-TR'),
            t.type === TransactionType.IN ? 'GİRİŞ' : 'ÇIKIŞ',
            product?.part_code || '-',
            t.product_name || '-',
            t.quantity.toString(),
            t.previous_stock !== undefined ? t.previous_stock.toString() : '-',
            t.new_stock !== undefined ? t.new_stock.toString() : '-',
            `"${t.description}"`,
            t.created_by
        ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "stok_hareketleri.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Bu işlem kaydını silmek istediğinize emin misiniz? Stok bakiyesi işlem öncesine dönecektir.')) {
      onDelete(id);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      
      {/* Top Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button 
                onClick={() => setFilterType('ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'ALL' ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
            >
                Tümü
            </button>
            <button 
                onClick={() => setFilterType('IN')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'IN' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'}`}
            >
                Girişler
            </button>
            <button 
                onClick={() => setFilterType('OUT')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filterType === 'OUT' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400'}`}
            >
                Çıkışlar
            </button>
            </div>
            
            <div className="flex gap-2">
                <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Kod, Ürün veya Açıklama ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:border-primary outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                </div>
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        showFilters || activeFilterCount > 0 
                        ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600'
                    }`}
                >
                    <Filter size={18} />
                    {activeFilterCount > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
                <button 
                    onClick={handleExport}
                    className="flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    title="Excel'e Aktar"
                >
                    <Download size={18} />
                </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Açıklama İçerir (Ek)</label>
                          <input 
                              type="text" 
                              value={descSearch}
                              onChange={(e) => setDescSearch(e.target.value)}
                              placeholder="Örn: Fiş no, teslim alan..."
                              className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-primary outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tarih Aralığı</label>
                          {/* Quick Date Buttons */}
                          <div className="flex gap-1 mb-1.5 overflow-x-auto no-scrollbar">
                              <button onClick={() => setQuickDate('TODAY')} className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 whitespace-nowrap">Bugün</button>
                              <button onClick={() => setQuickDate('YESTERDAY')} className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 whitespace-nowrap">Dün</button>
                              <button onClick={() => setQuickDate('THIS_WEEK')} className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 whitespace-nowrap">Bu Hafta</button>
                              <button onClick={() => setQuickDate('THIS_MONTH')} className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300 whitespace-nowrap">Bu Ay</button>
                          </div>
                          <div className="flex gap-2">
                              <input 
                                  type="date" 
                                  value={dateRange.start}
                                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-primary outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:[color-scheme:dark]"
                              />
                              <input 
                                  type="date" 
                                  value={dateRange.end}
                                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-primary outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:[color-scheme:dark]"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Miktar Aralığı</label>
                          <div className="flex gap-2 items-center">
                              <input 
                                  type="number" 
                                  placeholder="Min"
                                  value={amountRange.min}
                                  onChange={(e) => setAmountRange({...amountRange, min: e.target.value})}
                                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-primary outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              />
                              <span className="text-slate-300">-</span>
                              <input 
                                  type="number" 
                                  placeholder="Max"
                                  value={amountRange.max}
                                  onChange={(e) => setAmountRange({...amountRange, max: e.target.value})}
                                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:border-primary outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              />
                          </div>
                      </div>

                      <div className="flex items-end">
                          <button 
                            onClick={clearFilters}
                            className="w-full p-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                              <RotateCcw size={14} />
                              Filtreleri Temizle
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.map(t => {
            const product = products.find(p => p.id === t.product_id);
            return (
              <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center relative overflow-hidden group isolate transition-colors">
                {/* Color bar indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === TransactionType.IN ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                
                <div className="pl-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {t.type === TransactionType.IN ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-0.5 rounded">
                        <ArrowDownLeft size={12} /> GİRİŞ
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 px-2 py-0.5 rounded">
                        <ArrowUpRight size={12} /> ÇIKIŞ
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(t.date).toLocaleDateString('tr-TR')} {new Date(t.date).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  
                  {/* MAIN CHANGE: PART CODE IS PRIMARY */}
                  <h4 className="font-bold text-slate-800 dark:text-white font-mono text-lg">
                      {product?.part_code || t.product_name || 'Kodsuz'}
                  </h4>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {product?.product_name}
                  </div>
                  
                  <p className="text-sm text-slate-400 dark:text-slate-500 line-clamp-1 mt-1">{t.description}</p>
                  <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">İşlem Yapan: {t.created_by}</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 pl-4 z-20 relative">
                  <div className="text-right">
                      <span className={`block text-lg font-bold ${t.type === TransactionType.IN ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {t.type === TransactionType.IN ? '+' : '-'}{t.quantity}
                      </span>
                      {t.previous_stock !== undefined && t.new_stock !== undefined && (
                        <div className="flex items-center justify-end gap-1 text-[10px] sm:text-xs text-slate-400 font-medium">
                            <span>{t.previous_stock}</span>
                            <ArrowRight size={12} />
                            <span className="text-slate-600 dark:text-slate-300 font-bold">{t.new_stock}</span>
                        </div>
                      )}
                  </div>
                  
                  {currentUser.role === 'ADMIN' && (
                    <div className="flex items-center gap-1">
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(t);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 rounded-lg transition-colors active:scale-95 cursor-pointer"
                            title="İşlemi Düzenle"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(t.id);
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-lg transition-colors active:scale-95 cursor-pointer"
                            title="İşlemi Sil"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                  )}
                </div>
              </div>
            );
        })}

        {filteredTransactions.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                <Search className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={48} />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Kayıt bulunamadı.</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Filtre kriterlerinizi kontrol edin.</p>
                {(activeFilterCount > 0 || searchTerm) && (
                    <button 
                        onClick={clearFilters}
                        className="mt-4 text-blue-600 dark:text-blue-400 text-sm hover:underline font-medium"
                    >
                        Filtreleri Temizle
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
