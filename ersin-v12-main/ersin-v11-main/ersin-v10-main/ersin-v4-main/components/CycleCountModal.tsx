import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Eye, EyeOff, ClipboardList, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Product, CycleCount } from '../types';

interface CycleCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  history: CycleCount[];
  onSubmitCount: (productId: string, countedQty: number) => void;
  onCompleteSession?: (summary: Omit<CycleCount, 'id' | 'date'>) => void;
}

type ModalView = 'HISTORY' | 'COUNT' | 'REPORT';

const CycleCountModal: React.FC<CycleCountModalProps> = ({ isOpen, onClose, products, history, onSubmitCount, onCompleteSession }) => {
  const [view, setView] = useState<ModalView>('HISTORY');
  const [blindMode, setBlindMode] = useState(true);
  const [sessionData, setSessionData] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
        const savedSession = localStorage.getItem('cycle_count_session');
        if (savedSession) {
            try {
                const parsedSession = JSON.parse(savedSession);
                if (parsedSession && Object.keys(parsedSession).length > 0) {
                    if (confirm("Yarım kalan bir sayım işleminiz bulundu. Devam etmek ister misiniz?")) {
                        setSessionData(parsedSession);
                        setView('COUNT');
                    } else { clearSession(); setView('HISTORY'); }
                }
            } catch (e) { clearSession(); }
        } else { setView('HISTORY'); }
    }
  }, [isOpen]);

  const clearSession = () => {
    localStorage.removeItem('cycle_count_session');
    setSessionData({});
  };

  const sortedProducts = useMemo(() => {
      let filtered = products;
      const term = searchTerm.toLowerCase().trim();
      
      if (term) {
          filtered = products.filter(p => 
              p.product_name.toLowerCase().includes(term) || 
              p.part_code?.toLowerCase().includes(term) ||
              p.location?.toLowerCase().includes(term)
          );
      } else {
          filtered = products.slice(0, 150); // Performans için başlangıçta sınırlı
      }

      // Reyona göre alfabetik ve sayısal sıralama (A1, A2, B1...)
      return [...filtered].sort((a, b) => {
          const locA = a.location || 'ZZZ';
          const locB = b.location || 'ZZZ';
          return locA.localeCompare(locB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [products, searchTerm]);

  const sessionSummary = useMemo(() => {
      let correct = 0;
      // SADECE GİRİŞ YAPILAN (Sayılan) KALEMLERİ FİLTRELE
      const countEntries = Object.entries(sessionData).filter(([_, qty]) => qty !== undefined && qty !== null);
      const actuallyCountedCount = countEntries.length;
      const variances: any[] = [];
      
      countEntries.forEach(([pid, qty]) => {
          const p = products.find(prod => prod.id === pid);
          if (p) {
              if (p.current_stock === Number(qty)) {
                  correct++;
              } else {
                  variances.push({ 
                      name: p.product_name, 
                      code: p.part_code,
                      sys: p.current_stock, 
                      counted: Number(qty) 
                  });
              }
          }
      });

      // Başarı oranı artık sadece sayılan kalemler üzerinden hesaplanıyor.
      return { 
          totalCounted: actuallyCountedCount, 
          correct, 
          accuracy: actuallyCountedCount > 0 ? Math.round((correct / actuallyCountedCount) * 100) : 0, 
          variances 
      };
  }, [sessionData, products]);

  const handleFinalize = () => {
      Object.entries(sessionData).forEach(([pid, qty]) => onSubmitCount(pid, qty));
      if (onCompleteSession) {
          onCompleteSession({
              location: 'Genel Depo',
              total_items: sessionSummary.totalCounted,
              correct_items: sessionSummary.correct,
              accuracy: sessionSummary.accuracy,
              created_by: 'Sistem'
          });
      }
      clearSession();
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-950/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-none md:rounded-2xl shadow-xl w-full max-w-5xl h-full md:h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
              {view !== 'HISTORY' && (
                  <button onClick={() => setView('HISTORY')} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"><ArrowLeft/></button>
              )}
              <h2 className="text-lg font-bold flex items-center gap-2">
                  <ClipboardList className="text-blue-600" />
                  {view === 'HISTORY' ? 'Sayım Arşivi' : 'Genel Depo Sayımı'}
              </h2>
          </div>
          <button onClick={onClose} className="text-slate-400"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            {view === 'COUNT' && (
                <div className="space-y-4">
                    <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 pb-4 border-b dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                            <input 
                                type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Ürün adı, kod veya reyon arayın..."
                                className="w-full pl-10 p-3 rounded-xl border dark:bg-slate-800 outline-none focus:border-blue-500 font-bold"
                            />
                        </div>
                        <div className="flex justify-between items-center mt-3 px-1">
                            <button onClick={() => setBlindMode(!blindMode)} className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm">
                                {blindMode ? <EyeOff size={14}/> : <Eye size={14}/>} {blindMode ? 'Kör Sayım' : 'Stok Açık'}
                            </button>
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full uppercase shadow-sm">{sessionSummary.totalCounted} Ürün Girildi</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-20">
                        {sortedProducts.map(product => (
                            <div key={product.id} className={`p-4 rounded-2xl border-2 transition-all ${sessionData[product.id] !== undefined ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h4 className="font-black text-sm truncate font-mono text-slate-700 dark:text-slate-200">{product.part_code || 'KODSUZ'}</h4>
                                        <p className="text-[10px] text-slate-400 uppercase truncate font-bold">{product.product_name}</p>
                                    </div>
                                    {product.location && (
                                        <div className="bg-orange-50 text-orange-600 text-[9px] font-black px-2 py-1 rounded-lg border border-orange-200 shadow-sm">{product.location}</div>
                                    )}
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="text-center px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-xl min-w-[4rem] border dark:border-slate-600 shadow-inner">
                                        <span className="block text-[8px] text-slate-400 uppercase font-black">Sistem</span>
                                        <span className={`text-sm font-black ${blindMode ? 'text-transparent blur-md select-none' : 'text-slate-700 dark:text-slate-300'}`}>{product.current_stock}</span>
                                    </div>
                                    <input 
                                        type="number" placeholder="Sayılan?" value={sessionData[product.id] ?? ''} 
                                        onChange={(e) => {
                                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                                            const newSession = {...sessionData};
                                            if (val === undefined) delete newSession[product.id];
                                            else newSession[product.id] = val;
                                            setSessionData(newSession);
                                            localStorage.setItem('cycle_count_session', JSON.stringify(newSession));
                                        }} 
                                        className="flex-1 p-3 text-center font-black text-xl rounded-xl border-2 dark:bg-slate-950 outline-none focus:border-blue-500 shadow-sm" 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'REPORT' && (
                <div className="max-w-2xl mx-auto space-y-6 py-10 animate-fade-in">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-black dark:text-white text-slate-800">Sayım Analiz Raporu</h3>
                        <p className="text-slate-400 text-sm font-medium">Sadece veri girişi yaptığınız {sessionSummary.totalCounted} kalem üzerinden hesaplanmıştır.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border-2 dark:border-slate-800 text-center shadow-md">
                            <div className="text-4xl font-black text-blue-600">{sessionSummary.totalCounted}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest">Sayılan</div>
                        </div>
                        <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-3xl border-2 border-emerald-100 dark:border-emerald-800 text-center shadow-md">
                            <div className="text-4xl font-black">%{sessionSummary.accuracy}</div>
                            <div className="text-[10px] font-bold uppercase mt-2 tracking-widest">Doğruluk</div>
                        </div>
                        <div className="p-6 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-3xl border-2 border-rose-100 dark:border-rose-800 text-center shadow-md">
                            <div className="text-4xl font-black">{sessionSummary.variances.length}</div>
                            <div className="text-[10px] font-bold uppercase mt-2 tracking-widest">Farklı</div>
                        </div>
                    </div>
                    {sessionSummary.variances.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 dark:border-slate-800 shadow-sm">
                            <h4 className="font-black text-xs mb-4 text-rose-600 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={16}/> Bulunan Stok Farkları</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {sessionSummary.variances.map((v, i) => (
                                    <div key={i} className="flex justify-between text-xs p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <span className="font-black block text-slate-800 dark:text-white truncate">{v.code || 'KODSUZ'}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase truncate block">{v.name}</span>
                                        </div>
                                        <span className="font-mono font-black text-rose-500 whitespace-nowrap bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-lg self-center">Sist: {v.sys} / Say: {v.counted}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {view === 'HISTORY' && (
                <div className="text-center py-20">
                     <button onClick={() => setView('COUNT')} className="bg-blue-600 text-white px-16 py-6 rounded-3xl font-black text-xl shadow-2xl shadow-blue-500/30 active:scale-95 transition-all transform hover:-translate-y-1">SAYIMA BAŞLA</button>
                     <div className="mt-16 max-w-xl mx-auto space-y-3 px-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest text-left mb-4 border-l-4 border-blue-500 pl-3">Geçmiş Sayım Kayıtları</h4>
                        {history.length === 0 ? <p className="text-slate-400 italic font-medium py-10">Henüz bir sayım kaydı bulunmamaktadır.</p> : history.map(h => (
                            <div key={h.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 dark:border-slate-800 flex items-center justify-between shadow-sm hover:border-blue-400 transition-colors">
                                <div className="text-left">
                                    <div className="font-black text-slate-800 dark:text-white uppercase text-sm">Reyon Genel Sayım</div>
                                    <div className="text-[11px] text-slate-400 font-bold flex gap-2 mt-1"><span>{new Date(h.date).toLocaleDateString('tr-TR')}</span><span>&bull;</span><span>{h.total_items} Ürün</span></div>
                                </div>
                                <div className={`font-black text-xl px-4 py-2 rounded-xl ${h.accuracy > 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>%{h.accuracy}</div>
                            </div>
                        ))}
                     </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
            {view === 'COUNT' && (
                <button onClick={() => setView('REPORT')} disabled={sessionSummary.totalCounted === 0} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-500/20 disabled:opacity-50 uppercase tracking-widest">SAYIMI ANALİZ ET</button>
            )}
            {view === 'REPORT' && (
                <div className="flex gap-4">
                    <button onClick={() => setView('COUNT')} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-2xl font-black uppercase tracking-widest">DÜZENLE</button>
                    <button onClick={handleFinalize} className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 uppercase tracking-widest">ONAYLA VE BİTİR</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CycleCountModal;