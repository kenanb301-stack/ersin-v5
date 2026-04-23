
import React, { useState, useRef } from 'react';
import { X, Upload, AlertTriangle, Download, ClipboardCheck, Search, CheckCircle2, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';

interface OrderSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

interface SimulationResult {
  productName: string;
  requiredQty: number;
  currentStock: number;
  missingQty: number;
  unit: string;
  status: 'OK' | 'SHORTAGE' | 'NOT_FOUND';
  matchType?: 'KOD' | 'İSİM' | '-';
  excelCode?: string; // Excelden gelen kod (debug için)
}

const OrderSimulatorModal: React.FC<OrderSimulatorModalProps> = ({ isOpen, onClose, products }) => {
  const [step, setStep] = useState<'UPLOAD' | 'RESULT'>('UPLOAD');
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('UPLOAD');
    setResults([]);
    setFileName('');
    setError('');
  };

  const handleDownloadTemplate = () => {
    const data = [
      { "Parça Kodu": "P-00003", "Ürün Adı": "Örnek Parça", "Miktar": 50 },
      { "Parça Kodu": "1040", "Ürün Adı": "Sadece İsimle de Bulunabilir", "Miktar": 10 }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SimulasyonSablonu");
    XLSX.writeFile(wb, "siparis_simulasyon_sablonu.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setError('Excel dosyası boş veya okunamadı.');
          return;
        }

        processSimulation(data);
      } catch (err) {
        setError('Dosya formatı hatalı. Lütfen geçerli bir Excel yükleyin.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processSimulation = (data: any[]) => {
    const simResults: SimulationResult[] = [];
    
    // Helper: Clean and Normalize Strings
    const clean = (val: any) => {
        if (val === undefined || val === null) return '';
        return String(val).trim().replace(/\s+/g, ' ').toLowerCase(); // Remove extra spaces
    };

    // Helper: Get value from multiple possible column names
    const getValue = (row: any, keys: string[]) => {
        for (const key of keys) {
            if (row[key] !== undefined) return row[key];
            // Case-insensitive check
            const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
            if (foundKey) return row[foundKey];
        }
        return undefined;
    };

    data.forEach((row: any) => {
      // 1. Extract Data
      const codeRaw = getValue(row, ['ParcaKodu', 'Parça Kodu', 'Kod', 'PartCode', 'Stok Kodu', 'Malzeme Kodu']);
      const nameRaw = getValue(row, ['Urun', 'Ürün', 'Aciklama', 'Ürün Adı', 'UrunAdi', 'Tanım']);
      const qtyRaw = getValue(row, ['GerekliMiktar', 'Miktar', 'Adet', 'Qty', 'Sipariş']);

      // Skip empty quantity rows
      if (!qtyRaw) return;

      const requiredQty = Number(qtyRaw);
      const searchCode = clean(codeRaw);
      const searchName = clean(nameRaw);

      if (!searchName && !searchCode) return;

      let matchType: 'KOD' | 'İSİM' | '-' = '-';
      
      // 2. Find Product Logic
      const product = products.find(p => {
          const pCode = clean(p.part_code);
          const pBarcode = clean(p.barcode);
          const pShortId = clean(p.short_id);
          const pName = clean(p.product_name);

          // Priority 1: Exact Code Match (Part Code, Barcode, Short ID)
          if (searchCode) {
              if (pCode === searchCode || pBarcode === searchCode || pShortId === searchCode) {
                  matchType = 'KOD';
                  return true;
              }
          }
          
          // Priority 2: Exact Name Match
          if (searchName && pName === searchName) {
              matchType = 'İSİM';
              return true;
          }

          return false;
      });

      // 3. Fallback: Fuzzy Name Search (if not found yet)
      let finalProduct = product;
      if (!finalProduct && searchName) {
           finalProduct = products.find(p => clean(p.product_name).includes(searchName));
           if (finalProduct) matchType = 'İSİM';
      }

      if (!finalProduct) {
        simResults.push({
          productName: nameRaw || codeRaw || "Bilinmeyen Ürün",
          requiredQty,
          currentStock: 0,
          missingQty: requiredQty,
          unit: '-',
          status: 'NOT_FOUND',
          matchType: '-',
          excelCode: codeRaw ? String(codeRaw) : ''
        });
      } else {
        const missing = requiredQty - finalProduct.current_stock;
        simResults.push({
          productName: finalProduct.product_name,
          requiredQty,
          currentStock: finalProduct.current_stock,
          missingQty: missing > 0 ? missing : 0,
          unit: finalProduct.unit,
          status: missing > 0 ? 'SHORTAGE' : 'OK',
          matchType: matchType,
          excelCode: codeRaw ? String(codeRaw) : ''
        });
      }
    });

    if (simResults.length === 0) {
        setError('Listede okunabilir veri bulunamadı. Sütun başlıklarını kontrol edin (Parça Kodu, Miktar vb).');
        return;
    }

    // Sort: Shortage -> Not Found -> OK
    simResults.sort((a, b) => {
        const score = (status: string) => {
            if (status === 'SHORTAGE') return 0;
            if (status === 'NOT_FOUND') return 1;
            return 2;
        }
        return score(a.status) - score(b.status);
    });

    setResults(simResults);
    setStep('RESULT');
  };

  const shortageCount = results.filter(r => r.status === 'SHORTAGE').length;
  const notFoundCount = results.filter(r => r.status === 'NOT_FOUND').length;
  const okCount = results.filter(r => r.status === 'OK').length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20">
          <h2 className="text-lg font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2">
            <ClipboardCheck size={24} />
            Akıllı Sipariş Simülasyonu
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {step === 'UPLOAD' && (
            <div className="space-y-6">
               <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 text-sm">
                   <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                       <HelpCircle size={16}/> Nasıl Çalışır?
                   </h3>
                   <ul className="list-disc pl-4 space-y-1 text-blue-700 dark:text-blue-400">
                       <li>Sistem yüklediğiniz Excel dosyasını tarar.</li>
                       <li><strong>"Parça Kodu"</strong>, <strong>"Kod"</strong>, <strong>"Stok Kodu"</strong> sütunlarını veritabanı ile eşleştirir.</li>
                       <li>Kod bulamazsa <strong>"Ürün Adı"</strong> veya <strong>"Açıklama"</strong> sütununa bakar.</li>
                       <li>Büyük/küçük harf veya boşluk hatalarını otomatik düzeltir.</li>
                   </ul>
               </div>

               <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative group cursor-pointer">
                  <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".xlsx, .xls, .csv"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="group-hover:scale-105 transition-transform duration-200">
                      <Upload className="mx-auto text-purple-400 mb-4" size={48} />
                      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Listenizi Yükleyin</h3>
                      <p className="text-slate-400 mt-1 text-sm">Excel (.xlsx) dosyası seçin</p>
                  </div>
               </div>

               <div className="text-center">
                 <button onClick={handleDownloadTemplate} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center justify-center gap-1">
                   <Download size={14} /> Örnek Şablonu İndir
                 </button>
               </div>

               {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2 border border-red-100 dark:border-red-900/30">
                    <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" /> 
                    <div>
                        <span className="font-bold">Hata:</span> {error}
                    </div>
                </div>
               )}
            </div>
          )}

          {step === 'RESULT' && (
            <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-center">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{okCount}</div>
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Stok Yeterli</div>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{shortageCount}</div>
                        <div className="text-xs font-bold text-red-800 dark:text-red-300 uppercase">Eksik Stok</div>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-center">
                        <div className="text-2xl font-bold text-slate-600 dark:text-slate-300">{notFoundCount}</div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase">Bilinmeyen</div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white">Simülasyon Sonucu</h3>
                    <div className="text-xs text-slate-400 flex gap-2">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Kod ile</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> İsim ile</span>
                    </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-medium border-b dark:border-slate-600">
                            <tr>
                                <th className="p-3 text-left">Ürün</th>
                                <th className="p-3 text-center">İstenen</th>
                                <th className="p-3 text-center">Eldeki</th>
                                <th className="p-3 text-center">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {results.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-3">
                                        <div className="font-medium text-slate-800 dark:text-slate-200">
                                            {row.productName}
                                            {row.matchType !== '-' && (
                                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded text-white ${row.matchType === 'KOD' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                                                    {row.matchType}
                                                </span>
                                            )}
                                        </div>
                                        {row.status === 'NOT_FOUND' && row.excelCode && (
                                            <div className="text-xs text-red-400 mt-0.5">Aranan Kod: {row.excelCode}</div>
                                        )}
                                        {row.status === 'SHORTAGE' && (
                                            <div className="text-xs text-red-600 dark:text-red-400 font-bold mt-0.5">
                                                {row.missingQty} {row.unit} EKSİK
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-center font-medium text-slate-600 dark:text-slate-300">{row.requiredQty}</td>
                                    <td className="p-3 text-center text-slate-400 dark:text-slate-500">{row.currentStock}</td>
                                    <td className="p-3 text-center">
                                        {row.status === 'OK' && (
                                            <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">HAZIR</span>
                                        )}
                                        {row.status === 'SHORTAGE' && (
                                            <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold">YETERSİZ</span>
                                        )}
                                        {row.status === 'NOT_FOUND' && (
                                            <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold">BULUNAMADI</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            {step === 'RESULT' ? (
                <>
                    <button onClick={handleReset} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-medium">
                        Yeni Sorgu
                    </button>
                    <button 
                        onClick={onClose}
                        className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-slate-900 dark:hover:bg-slate-600 active:scale-95 transition-transform"
                    >
                        Tamam
                    </button>
                </>
            ) : (
                <div className="w-full flex justify-end">
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium">
                        İptal
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default OrderSimulatorModal;
