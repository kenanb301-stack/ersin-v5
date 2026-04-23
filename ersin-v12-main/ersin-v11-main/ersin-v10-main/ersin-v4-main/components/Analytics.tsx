
import React, { useMemo, useState } from 'react';
import { Product, Transaction, TransactionType } from '../types';
import { TrendingUp, BarChart3, Hexagon, Archive, Map, Activity, Zap, Calendar, Download, FileSpreadsheet, PackageCheck, PackageMinus, Layers, Filter, Search, X, ChevronRight, MousePointerClick } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AnalyticsProps {
  products: Product[];
  transactions: Transaction[];
}

const Analytics: React.FC<AnalyticsProps> = ({ products, transactions }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'YEAR_REPORT'>('OVERVIEW');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [trendRange, setTrendRange] = useState<7 | 14 | 30>(7);
  const [filterKeyword, setFilterKeyword] = useState('');
  
  // Detail State for ABC
  const [selectedAbcGroup, setSelectedAbcGroup] = useState<'A' | 'B' | 'C' | null>(null);

  // --- 0. FILTERING LOGIC ---
  const filteredProducts = useMemo(() => {
      if (!filterKeyword.trim()) return products;
      const lower = filterKeyword.toLowerCase();
      return products.filter(p => 
          p.product_name.toLowerCase().includes(lower) || 
          (p.part_code && p.part_code.toLowerCase().includes(lower)) ||
          (p.material && p.material.toLowerCase().includes(lower)) ||
          (p.location && p.location.toLowerCase().includes(lower))
      );
  }, [products, filterKeyword]);

  const filteredTransactions = useMemo(() => {
      if (!filterKeyword.trim()) return transactions;
      const validProductIds = new Set(filteredProducts.map(p => p.id));
      return transactions.filter(t => validProductIds.has(t.product_id));
  }, [transactions, filteredProducts, filterKeyword]);

  // --- 1. KPI ---
  const criticalStockCount = filteredProducts.filter(p => p.current_stock <= p.min_stock_level).length;
  const healthScore = filteredProducts.length > 0 
    ? Math.max(0, Math.round(100 - ((criticalStockCount / filteredProducts.length) * 100))) 
    : 100;

  // --- 2. TRENDS (OVERVIEW) ---
  const trendData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = trendRange - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayTrans = filteredTransactions.filter(t => t.date.startsWith(dateStr));
        data.push({
            date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
            in: dayTrans.filter(t => t.type === TransactionType.IN).length,
            out: dayTrans.filter(t => t.type === TransactionType.OUT).length,
        });
    }
    return data;
  }, [filteredTransactions, trendRange]);
  
  const maxChartValue = Math.max(...trendData.map(d => Math.max(d.in, d.out)), 1);

  // --- 3. ANNUAL REPORT CALCULATION ---
  const annualReport = useMemo(() => {
      const yearlyTransactions = filteredTransactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate.getFullYear() === selectedYear && t.type === TransactionType.OUT;
      });

      const usageMap: Record<string, number> = {};
      const monthlyData = Array(12).fill(0);

      yearlyTransactions.forEach(t => {
          usageMap[t.product_id] = (usageMap[t.product_id] || 0) + t.quantity;
          const month = new Date(t.date).getMonth(); // 0-11
          monthlyData[month] += t.quantity;
      });

      const reportItems = Object.entries(usageMap).map(([pid, qty]) => {
          const product = filteredProducts.find(p => p.id === pid); 
          if (!product) return null; 
          return {
              id: pid,
              name: product.product_name,
              code: product.part_code || '-',
              unit: product.unit || 'Adet',
              totalUsed: qty,
              category: product.location?.split('-')[0] || 'Genel'
          };
      }).filter(Boolean) as any[];

      reportItems.sort((a, b) => b.totalUsed - a.totalUsed);

      const totalConsumption = yearlyTransactions.reduce((acc, t) => acc + t.quantity, 0);

      return { items: reportItems, totalConsumption, monthlyData };
  }, [filteredTransactions, filteredProducts, selectedYear]);

  // --- 4. EXPORT FUNCTION ---
  const handleExportAnnualReport = () => {
      if (annualReport.items.length === 0) {
          alert("Bu kriterler için veri bulunamadı.");
          return;
      }
      const exportData = annualReport.items.map(item => ({
          "Parça Kodu": item.code,
          "Ürün Adı": item.name,
          "Toplam Kullanım": item.totalUsed,
          "Birim": item.unit,
          "Kategori/Reyon": item.category,
          "Yıl": selectedYear
      }));

      const filename = filterKeyword ? `Tuketim_${filterKeyword}_${selectedYear}.xlsx` : `Depo_Tuketim_Raporu_${selectedYear}.xlsx`;

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${selectedYear}_Rapor`);
      XLSX.writeFile(wb, filename);
  };

  // --- 5. ABC & DEAD STOCK (For Overview) ---
  const abcAnalysis = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredTransactions.forEach(t => { counts[t.product_id] = (counts[t.product_id] || 0) + 1; });
      
      const sortedProducts = filteredProducts.map(p => ({ ...p, count: counts[p.id] || 0 })).sort((a, b) => b.count - a.count);
      const totalOps = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      
      const groupA: Product[] = [];
      const groupB: Product[] = [];
      const groupC: Product[] = [];

      let accum = 0;
      sortedProducts.forEach(p => {
          accum += p.count;
          const pct = (accum / totalOps) * 100;
          if (pct <= 80) groupA.push(p);
          else if (pct <= 95) groupB.push(p);
          else groupC.push(p);
      });
      return { groupA, groupB, groupC, countA: groupA.length, countB: groupB.length, countC: groupC.length };
  }, [filteredProducts, filteredTransactions]);

  const deadStock = useMemo(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeProductIds = new Set(filteredTransactions.filter(t => new Date(t.date) > thirtyDaysAgo).map(t => t.product_id));
      return filteredProducts.filter(p => p.current_stock > 0 && !activeProductIds.has(p.id)).sort((a, b) => b.current_stock - a.current_stock).slice(0, 5);
  }, [filteredProducts, filteredTransactions]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        
        {/* HEADER & FILTER */}
        <div className="flex flex-col gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <BarChart3 className="text-blue-600" /> Analiz Merkezi
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Verimlilik, Tüketim ve Stok Analizleri</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('OVERVIEW')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'OVERVIEW' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        Genel Bakış
                    </button>
                    <button 
                        onClick={() => setActiveTab('YEAR_REPORT')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'YEAR_REPORT' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                    >
                        <FileSpreadsheet size={16} />
                        Yıllık Rapor
                    </button>
                </div>
            </div>

            {/* PRODUCT GROUP FILTER INPUT */}
            <div className="mt-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.target.value)}
                    placeholder="Belirli bir grubu analiz et (Örn: Rulman, Motor, A1 Reyonu...)"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                />
                {filterKeyword && (
                    <button 
                        onClick={() => setFilterKeyword('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
            
            {filterKeyword && (
                <div className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                    <Filter size={14} />
                    Filtrelendi: "{filterKeyword}" içeren {filteredProducts.length} ürün ve {filteredTransactions.length} işlem analiz ediliyor.
                </div>
            )}
        </div>

        {activeTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-fade-in-up">
                {/* Health Score Card */}
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                    <div>
                        <h3 className="text-lg font-bold opacity-90">
                            {filterKeyword ? `"${filterKeyword}" Grubu Sağlığı` : "Depo Sağlık Puanı"}
                        </h3>
                        <p className="text-sm opacity-75">Kritik stok seviyesine göre hesaplanır.</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                            <Activity size={32} className="opacity-80" />
                            <span className="text-5xl font-black">{healthScore}</span>
                        </div>
                    </div>
                </div>

                {/* Trend Chart */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <TrendingUp className="text-blue-500" size={18} /> Hareket Trendi {filterKeyword && <span className="text-xs font-normal text-slate-400">({filterKeyword})</span>}
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 text-[10px] font-bold">
                            {[7, 14, 30].map(d => (
                                <button key={d} onClick={() => setTrendRange(d as any)} className={`px-2 py-1 rounded transition-colors ${trendRange === d ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}>{d} Gün</button>
                            ))}
                        </div>
                    </div>
                    {filteredProducts.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Veri yok.</div>
                    ) : (
                        <div className="h-48 flex items-end justify-between gap-1 sm:gap-3">
                            {trendData.map((d, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                                    <div className="w-full flex gap-1 items-end justify-center h-full">
                                        <div style={{ height: `${(d.in / maxChartValue) * 80}%` }} className="w-2 sm:w-6 bg-emerald-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity relative group-hover:scale-110 duration-200"></div>
                                        <div style={{ height: `${(d.out / maxChartValue) * 80}%` }} className="w-2 sm:w-6 bg-rose-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity relative group-hover:scale-110 duration-200"></div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center border-t border-slate-100 dark:border-slate-700 pt-2">{d.date}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-center gap-6 mt-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-400 rounded-sm"></div>Giriş İşlemleri</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-400 rounded-sm"></div>Çıkış İşlemleri</div>
                    </div>
                </div>

                {/* ABC & Dead Stock Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2"><Hexagon className="text-purple-500" size={18} /> ABC Analizi</h3>
                        <p className="text-xs text-slate-400 mb-4 flex items-center gap-1"><MousePointerClick size={12}/> Detaylar için kutulara tıklayın</p>
                        
                        {/* ABC SUMMARY CARDS (Clickable) */}
                        <div className="space-y-3">
                            <div 
                                onClick={() => setSelectedAbcGroup('A')}
                                className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors group"
                            >
                                <div><span className="font-bold text-emerald-800 dark:text-emerald-300 block">A Grubu</span><span className="text-xs text-emerald-600 opacity-80">En Hareketli (%80)</span></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-emerald-600">{abcAnalysis.countA}</span>
                                    <ChevronRight size={16} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                            <div 
                                onClick={() => setSelectedAbcGroup('B')}
                                className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                            >
                                <div><span className="font-bold text-blue-800 dark:text-blue-300 block">B Grubu</span><span className="text-xs text-blue-600 opacity-80">Orta Hareketli (%15)</span></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-blue-600">{abcAnalysis.countB}</span>
                                    <ChevronRight size={16} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                            <div 
                                onClick={() => setSelectedAbcGroup('C')}
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors group"
                            >
                                <div><span className="font-bold text-slate-700 dark:text-slate-300 block">C Grubu</span><span className="text-xs text-slate-500 opacity-80">Az Hareketli (%5)</span></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-slate-600 dark:text-slate-400">{abcAnalysis.countC}</span>
                                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>

                        {/* ABC Detail Modal (Inline) */}
                        {selectedAbcGroup && (
                            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-sm dark:text-white">{selectedAbcGroup} Grubu Ürünleri</h4>
                                    <button onClick={() => setSelectedAbcGroup(null)} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                                    {(abcAnalysis as any)[`group${selectedAbcGroup}`].length === 0 ? (
                                        <div className="text-xs text-slate-400 text-center py-4">Bu grupta ürün yok.</div>
                                    ) : (
                                        (abcAnalysis as any)[`group${selectedAbcGroup}`].map((p: Product) => (
                                            <div key={p.id} className="text-xs flex justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 items-center">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="font-medium dark:text-slate-200 truncate">{p.product_name}</div>
                                                    <div className="text-slate-500 font-mono text-[10px]">{p.part_code}</div>
                                                </div>
                                                <div className="font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                    {(p as any).count} İşlem
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Dead Stock */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Archive className="text-orange-500" size={18} /> Atıl Stok (30+ Gün)</h3>
                        {deadStock.length === 0 ? <div className="text-center py-10 text-slate-400 text-sm">Harika! Atıl stok yok.</div> : (
                            <div className="space-y-2">
                                {deadStock.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 text-sm">
                                        <div><span className="font-bold text-slate-800 dark:text-white block">{p.product_name}</span><span className="text-xs text-slate-500">{p.part_code}</span></div>
                                        <span className="font-bold text-orange-600">{p.current_stock} {p.unit}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'YEAR_REPORT' && (
            <div className="space-y-6 animate-fade-in-up">
                
                {/* Year Filter & Export */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm text-indigo-600 dark:text-indigo-400"><Calendar size={24} /></div>
                        <div>
                            <h3 className="font-bold text-indigo-900 dark:text-indigo-200 text-lg">Yıllık Tüketim Raporu</h3>
                            <p className="text-xs text-indigo-700 dark:text-indigo-400">{filterKeyword ? `"${filterKeyword}" için kullanım analizi` : "Genel malzeme kullanım analizi"}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 font-bold text-lg rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleExportAnnualReport}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-transform active:scale-95"
                        >
                            <Download size={18} /> Excel İndir
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-500 font-bold uppercase mb-1">Toplam Çıkış Miktarı</p>
                        <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{annualReport.totalConsumption}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                         <p className="text-xs text-slate-500 font-bold uppercase mb-1">Hareket Gören Parça</p>
                         <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400">{annualReport.items.length}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-500 font-bold uppercase mb-1">En Yoğun Ay</p>
                        <h3 className="text-xl font-black text-slate-700 dark:text-white">
                            {new Date(0, annualReport.monthlyData.indexOf(Math.max(...annualReport.monthlyData))).toLocaleString('tr-TR', { month: 'long' })}
                        </h3>
                    </div>
                </div>

                {/* Monthly Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-slate-400"/> Aylık Tüketim Dağılımı ({selectedYear})</h4>
                    <div className="h-48 flex items-end gap-2">
                        {annualReport.monthlyData.map((val, idx) => {
                            const maxVal = Math.max(...annualReport.monthlyData, 1);
                            const height = (val / maxVal) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col justify-end group">
                                    <div 
                                        style={{ height: `${height}%` }} 
                                        className="bg-indigo-400 dark:bg-indigo-600 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all relative min-h-[4px]"
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            {val} Adet
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-center text-slate-400 font-bold mt-2 uppercase">{new Date(0, idx).toLocaleString('tr-TR', { month: 'short' })}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 dark:text-white">Ürün Bazlı Tüketim Listesi</h4>
                        <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">{annualReport.items.length} Kalem</span>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 font-bold">Ürün Adı</th>
                                    <th className="p-4 font-bold">Parça Kodu</th>
                                    <th className="p-4 font-bold text-center">Toplam Tüketim</th>
                                    <th className="p-4 font-bold text-right">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {annualReport.items.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800 dark:text-white">{item.name}</div>
                                            <div className="text-xs text-slate-400">{item.category}</div>
                                        </td>
                                        <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{item.code}</td>
                                        <td className="p-4 text-center">
                                            <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg font-black text-lg">
                                                {item.totalUsed}
                                            </span>
                                            <span className="text-xs text-slate-400 ml-1">{item.unit}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {idx < 3 ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                                    <Zap size={10} fill="currentColor" /> Top {idx + 1}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {annualReport.items.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center text-slate-400">Bu kriterlere uygun kayıtlı çıkış hareketi bulunamadı.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        )}
    </div>
  );
};

export default Analytics;
