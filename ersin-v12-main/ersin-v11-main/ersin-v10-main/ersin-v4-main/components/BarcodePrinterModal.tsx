import React, { useEffect, useState, useMemo } from 'react';
import { X, Printer, Check, Search, Settings, Ruler, Plus, Minus } from 'lucide-react';
import { Product } from '../types';
import JsBarcode from 'jsbarcode';

interface BarcodePrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

interface PrintSettings {
    marginTop: number;
    marginLeft: number;
    paddingX: number;
    paddingY: number;
    labelHeight: number; 
    scale: number;
    gap: number;
    showPartCode: boolean;
    showLocation: boolean;
    showProductName: boolean;
    posPartCode: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM';
    posLocation: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM';
    posProductName: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM';
    fontSizePartCode: number;
    fontSizeLocation: number;
    fontSizeProductName: number;
}

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
    marginTop: 0,
    marginLeft: 0,
    paddingX: 3,
    paddingY: 2,
    labelHeight: 40,
    scale: 100,
    gap: 0,
    showPartCode: true,
    showLocation: true,
    showProductName: true,
    posPartCode: 'TOP_LEFT',
    posLocation: 'TOP_RIGHT',
    posProductName: 'BOTTOM',
    fontSizePartCode: 18,
    fontSizeLocation: 12,
    fontSizeProductName: 12
};

const BarcodePrinterModal: React.FC<BarcodePrinterModalProps> = ({ isOpen, onClose, products }) => {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>({});
  const [barcodeImages, setBarcodeImages] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('ALL');
  const [showSettings, setShowSettings] = useState(false);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
      const saved = localStorage.getItem('print_align_settings');
      return saved ? { ...DEFAULT_PRINT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_PRINT_SETTINGS;
  });

  const uniqueLocations = useMemo(() => {
      const locs = new Set(products.map(p => p.location ? p.location.split('-')[0] : '').filter(Boolean));
      return Array.from(locs).sort();
  }, [products]);
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        const matchesSearch = searchTerm === '' || 
          p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.part_code && p.part_code.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesLocation = filterLocation === 'ALL' || (p.location && p.location.startsWith(filterLocation));
        return matchesSearch && matchesLocation;
      });
  }, [products, searchTerm, filterLocation]);

  useEffect(() => {
    if (isOpen) regenerateBarcodes();
  }, [isOpen, selectedProductIds]); 

  const regenerateBarcodes = () => {
    const targets = products.filter(p => selectedProductIds.has(p.id));
    if (targets.length === 0 && products.length > 0) targets.push(products[0]);

    setTimeout(() => {
        const newImages: Record<string, string> = {};
        const canvas = document.createElement('canvas'); 
        targets.forEach(product => {
            try {
                const codeToUse = product.short_id || product.barcode || product.part_code;
                if (codeToUse) {
                    JsBarcode(canvas, codeToUse, { format: "CODE128", lineColor: "#000", width: 2, height: 50, displayValue: false, margin: 0, background: "#ffffff" });
                    newImages[product.id] = canvas.toDataURL("image/png");
                }
            } catch (e) {}
        });
        setBarcodeImages(prev => ({...prev, ...newImages}));
    }, 50);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(id)) newSet.delete(id);
    else { newSet.add(id); if (!printQuantities[id]) setPrintQuantities(prev => ({...prev, [id]: 1})); }
    setSelectedProductIds(newSet);
  };

  const updateQty = (id: string, delta: number) => {
      setPrintQuantities(prev => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) + delta) }));
  };

  const toggleAllFiltered = () => {
    const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.has(p.id));
    const newSet = new Set(selectedProductIds);
    const newQtys = {...printQuantities};
    if (allFilteredSelected) filteredProducts.forEach(p => newSet.delete(p.id));
    else filteredProducts.forEach(p => { newSet.add(p.id); if (!newQtys[p.id]) newQtys[p.id] = 1; });
    setPrintQuantities(newQtys);
    setSelectedProductIds(newSet);
  };

  const saveAlignSettings = () => {
      localStorage.setItem('print_align_settings', JSON.stringify(printSettings));
      alert("Ayarlar kaydedildi.");
  };

  const printItems = useMemo(() => {
    const items: { product: Product; index: number }[] = [];
    Array.from(selectedProductIds).forEach(id => {
      const product = products.find(p => p.id === id);
      if (product) {
        const qty = printQuantities[id] || 1;
        for (let i = 0; i < qty; i++) {
          items.push({ product, index: i });
        }
      }
    });
    return items;
  }, [selectedProductIds, printQuantities, products]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in no-print">
        <style>{`
          @media print {
              @page { 
                size: 55mm auto; 
                margin: 0mm; 
              }
              html, body { 
                height: auto !important;
                overflow: visible !important;
                margin: 0 !important; 
                padding: 0 !important; 
                background: white !important; 
              }
              body * { visibility: hidden; }
               #print-area, #print-area * { visibility: visible !important; color: #000 !important; border-color: #000 !important; }
              #print-area { 
                display: block !important; 
                position: absolute !important; 
                left: 0 !important; 
                top: 0 !important; 
                width: 55mm !important; 
                visibility: visible !important;
              }
              .label-container { 
                width: 55mm; 
                height: ${printSettings.labelHeight}mm; 
                page-break-after: always !important; 
                break-after: page !important; 
                position: relative; 
                background: white; 
                display: block !important; 
                padding-top: ${printSettings.marginTop}mm !important; 
                padding-left: ${printSettings.marginLeft}mm !important; 
                overflow: hidden !important;
                border: none !important;
              }
              .label-content-wrapper { 
                display: flex; 
                flex-direction: column; 
                width: 100%; 
                height: 100%; 
                padding: ${printSettings.paddingY}mm ${printSettings.paddingX}mm; 
                transform: scale(${printSettings.scale / 100}); 
                transform-origin: top left; 
                color: #000 !important;
              }
              .lbl-header { flex: 0 0 auto; min-height: 8mm; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; margin-bottom: 1mm; padding-bottom: 1mm; }
              .lbl-center { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 12mm; }
              .lbl-footer { flex: 0 0 auto; border-top: 1px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 1mm; }
              .lbl-item-top { max-width: 50%; overflow: hidden; }
              .lbl-item-bottom { width: 100%; text-align: center; }
              img { max-width: 100%; filter: contrast(2); }
          }
        `}</style>

        <div className="bg-white dark:bg-slate-900 w-full h-full md:h-[90vh] md:w-[95vw] md:max-w-[1200px] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-3"><Printer size={24} className="text-blue-600" /><h2 className="text-xl font-bold">Baskı Merkezi</h2></div>
              <div className="flex gap-2">
                  <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 shadow-sm'}`}><Settings size={20}/></button>
                  <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><X size={20} /></button>
              </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="w-full md:w-4/12 flex flex-col border-r dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="p-4 space-y-3 border-b dark:border-slate-800">
                      <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Ara..." className="w-full pl-9 pr-3 py-2 rounded-lg border dark:bg-slate-800" />
                      </div>
                      <div className="flex gap-2">
                          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="flex-1 py-2 px-3 border rounded-lg dark:bg-slate-800 text-xs">
                              <option value="ALL">Tüm Reyonlar</option>
                              {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                          </select>
                          <button onClick={toggleAllFiltered} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Tümü</button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {filteredProducts.map(product => {
                          const isSelected = selectedProductIds.has(product.id);
                          return (
                              <div key={product.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-800 border-transparent shadow-sm'}`}>
                                  <div onClick={() => toggleSelection(product.id)} className={`w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                      {isSelected && <Check size={16} strokeWidth={3} />}
                                  </div>
                                  <div className="flex-1 min-w-0" onClick={() => toggleSelection(product.id)}>
                                      <div className="font-bold text-sm truncate">{product.product_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">{product.part_code}</div>
                                  </div>
                                  {isSelected && (
                                      <div className="flex items-center bg-white dark:bg-slate-700 rounded-lg border shadow-sm px-1">
                                          <button onClick={() => updateQty(product.id, -1)} className="p-1 text-slate-400"><Minus size={14}/></button>
                                          <span className="px-2 font-black text-sm">{printQuantities[product.id] || 1}</span>
                                          <button onClick={() => updateQty(product.id, 1)} className="p-1 text-blue-600"><Plus size={14}/></button>
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>

              <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 flex flex-col">
                  {showSettings ? (
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border dark:border-slate-800 max-w-lg mx-auto w-full space-y-6 animate-fade-in overflow-y-auto max-h-full">
                          <h3 className="font-bold flex items-center gap-2"><Ruler size={18} className="text-blue-500"/> Hizalama Ayarları</h3>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-400">Üst Kenar (mm)</label><input type="number" step="0.5" value={printSettings.marginTop} onChange={e => setPrintSettings({...printSettings, marginTop: Number(e.target.value)})} className="w-full p-2 border rounded-lg dark:bg-slate-800"/></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-400">Sol Kenar (mm)</label><input type="number" step="0.5" value={printSettings.marginLeft} onChange={e => setPrintSettings({...printSettings, marginLeft: Number(e.target.value)})} className="w-full p-2 border rounded-lg dark:bg-slate-800"/></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-400">Etiket Yükseklik (mm)</label><input type="number" value={printSettings.labelHeight} onChange={e => setPrintSettings({...printSettings, labelHeight: Number(e.target.value)})} className="w-full p-2 border rounded-lg dark:bg-slate-800"/></div>
                              <div className="space-y-1"><label className="text-xs font-bold text-slate-400">Ölçek (%)</label><input type="number" value={printSettings.scale} onChange={e => setPrintSettings({...printSettings, scale: Number(e.target.value)})} className="w-full p-2 border rounded-lg dark:bg-slate-800"/></div>
                          </div>

                          <div className="pt-4 border-t dark:border-slate-800 space-y-4">
                              <h4 className="text-sm font-bold">Alan Gizleme ve Konum</h4>
                              
                              <div className="space-y-4">
                                  {/* Part Code */}
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                                      <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                              <input type="checkbox" checked={printSettings.showPartCode} onChange={e => setPrintSettings({...printSettings, showPartCode: e.target.checked})} className="w-4 h-4" />
                                              <span className="text-xs font-bold">Parça Kodu</span>
                                          </div>
                                          <select value={printSettings.posPartCode} onChange={e => setPrintSettings({...printSettings, posPartCode: e.target.value as any})} className="text-[10px] p-1 border rounded bg-white dark:bg-slate-700">
                                              <option value="TOP_LEFT">Üst Sol</option>
                                              <option value="TOP_RIGHT">Üst Sağ</option>
                                              <option value="BOTTOM">Alt Orta</option>
                                          </select>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <label className="text-[10px] text-slate-400 font-bold">Yazı Boyutu (px):</label>
                                          <input type="number" value={printSettings.fontSizePartCode} onChange={e => setPrintSettings({...printSettings, fontSizePartCode: Number(e.target.value)})} className="w-16 p-1 text-[10px] border rounded dark:bg-slate-700" />
                                      </div>
                                  </div>

                                  {/* Location */}
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                                      <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                              <input type="checkbox" checked={printSettings.showLocation} onChange={e => setPrintSettings({...printSettings, showLocation: e.target.checked})} className="w-4 h-4" />
                                              <span className="text-xs font-bold">Reyon / Raf</span>
                                          </div>
                                          <select value={printSettings.posLocation} onChange={e => setPrintSettings({...printSettings, posLocation: e.target.value as any})} className="text-[10px] p-1 border rounded bg-white dark:bg-slate-700">
                                              <option value="TOP_LEFT">Üst Sol</option>
                                              <option value="TOP_RIGHT">Üst Sağ</option>
                                              <option value="BOTTOM">Alt Orta</option>
                                          </select>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <label className="text-[10px] text-slate-400 font-bold">Yazı Boyutu (px):</label>
                                          <input type="number" value={printSettings.fontSizeLocation} onChange={e => setPrintSettings({...printSettings, fontSizeLocation: Number(e.target.value)})} className="w-16 p-1 text-[10px] border rounded dark:bg-slate-700" />
                                      </div>
                                  </div>

                                  {/* ProductName */}
                                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                                      <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                              <input type="checkbox" checked={printSettings.showProductName} onChange={e => setPrintSettings({...printSettings, showProductName: e.target.checked})} className="w-4 h-4" />
                                              <span className="text-xs font-bold">Açıklama (Ad)</span>
                                          </div>
                                          <select value={printSettings.posProductName} onChange={e => setPrintSettings({...printSettings, posProductName: e.target.value as any})} className="text-[10px] p-1 border rounded bg-white dark:bg-slate-700">
                                              <option value="TOP_LEFT">Üst Sol</option>
                                              <option value="TOP_RIGHT">Üst Sağ</option>
                                              <option value="BOTTOM">Alt Orta</option>
                                          </select>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <label className="text-[10px] text-slate-400 font-bold">Yazı Boyutu (px):</label>
                                          <input type="number" value={printSettings.fontSizeProductName} onChange={e => setPrintSettings({...printSettings, fontSizeProductName: Number(e.target.value)})} className="w-16 p-1 text-[10px] border rounded dark:bg-slate-700" />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <button onClick={saveAlignSettings} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">Ayarları Kaydet</button>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-fade-in">
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {Array.from(selectedProductIds).slice(0, 6).map(id => {
                                  const p = products.find(x => x.id === id);
                                  if (!p) return null;
                                  return (
                                      <div key={id} className="bg-white dark:bg-slate-900 p-2 rounded border-2 border-dashed border-slate-300 dark:border-slate-700 w-32 h-20 flex flex-col items-center justify-center">
                                          <div className="text-[8px] font-black truncate w-full text-center">{p.part_code}</div>
                                          <div className="h-8 w-full bg-slate-100 dark:bg-slate-800 rounded my-1 flex items-center justify-center"><Printer size={16} className="text-slate-300"/></div>
                                          <div className="text-[10px] font-bold text-blue-600">x{printQuantities[id]} Adet</div>
                                      </div>
                                  );
                              })}
                           </div>
                           <button onClick={() => window.print()} disabled={selectedProductIds.size === 0} className="w-full max-w-xs bg-blue-600 text-white py-5 rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-95 disabled:bg-slate-400 transition-all flex items-center justify-center gap-3">
                              <Printer size={24}/>
                              {selectedProductIds.size > 0 ? `${Array.from(selectedProductIds).reduce((acc, id) => acc + (printQuantities[id] || 0), 0)} Etiketi Yazdır` : 'Etiket Seçin'}
                          </button>
                      </div>
                  )}
              </div>
          </div>
        </div>
      </div>

      {/* Print area moved to be a sibling of the modal wrapper to avoid fixed container issues in browsers */}
      <div id="print-area">
         {printItems.map((item, i) => (
             <div key={`${item.product.id}-${item.index}`} className="label-container">
                <div className="label-content-wrapper">
                    <div className="lbl-header">
                        <div className="lbl-item-top" style={{ textAlign: 'left' }}>
                            {printSettings.showPartCode && printSettings.posPartCode === 'TOP_LEFT' && <div className="font-black truncate" style={{ fontSize: `${printSettings.fontSizePartCode}px` }}>{item.product.part_code}</div>}
                            {printSettings.showLocation && printSettings.posLocation === 'TOP_LEFT' && <div className="border-2 border-black px-1 rounded-sm font-bold truncate" style={{ fontSize: `${printSettings.fontSizeLocation}px` }}>{item.product.location}</div>}
                            {printSettings.showProductName && printSettings.posProductName === 'TOP_LEFT' && <div className="font-bold truncate" style={{ fontSize: `${printSettings.fontSizeProductName}px` }}>{item.product.product_name}</div>}
                        </div>
                        <div className="lbl-item-top" style={{ textAlign: 'right' }}>
                            {printSettings.showPartCode && printSettings.posPartCode === 'TOP_RIGHT' && <div className="font-black truncate" style={{ fontSize: `${printSettings.fontSizePartCode}px` }}>{item.product.part_code}</div>}
                            {printSettings.showLocation && printSettings.posLocation === 'TOP_RIGHT' && <div className="border-2 border-black px-1 rounded-sm font-bold truncate" style={{ fontSize: `${printSettings.fontSizeLocation}px` }}>{item.product.location}</div>}
                            {printSettings.showProductName && printSettings.posProductName === 'TOP_RIGHT' && <div className="font-bold truncate" style={{ fontSize: `${printSettings.fontSizeProductName}px` }}>{item.product.product_name}</div>}
                        </div>
                    </div>
                    <div className="lbl-center">
                        {barcodeImages[item.product.id] ? (
                           <img src={barcodeImages[item.product.id]} className="max-w-full max-h-full" alt="barcode" />
                        ) : (
                           <div className="text-[8px] text-slate-300">Barkod hazırlanıyor...</div>
                        )}
                    </div>
                    <div className="lbl-footer">
                        <div className="lbl-item-bottom">
                            {printSettings.showPartCode && printSettings.posPartCode === 'BOTTOM' && <div className="font-black truncate" style={{ fontSize: `${printSettings.fontSizePartCode}px` }}>{item.product.part_code}</div>}
                            {printSettings.showLocation && printSettings.posLocation === 'BOTTOM' && <div className="font-bold truncate" style={{ fontSize: `${printSettings.fontSizeLocation}px` }}>{item.product.location}</div>}
                            {printSettings.showProductName && printSettings.posProductName === 'BOTTOM' && <div className="font-bold truncate" style={{ fontSize: `${printSettings.fontSizeProductName}px` }}>{item.product.product_name}</div>}
                        </div>
                    </div>
                </div>
             </div>
         ))}
      </div>
    </>
  );
};

export default BarcodePrinterModal;