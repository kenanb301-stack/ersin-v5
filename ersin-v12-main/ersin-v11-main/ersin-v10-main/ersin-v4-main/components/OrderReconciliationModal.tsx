import React, { useState, useRef } from 'react';
import { X, Upload, ClipboardCheck, Download, AlertTriangle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';

interface OrderReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

interface ReconciliationResult {
  externalCode: string;
  qty: number;
  matchStatus: 'FOUND' | 'NOT_FOUND';
  internalProduct?: Product;
}

const OrderReconciliationModal: React.FC<OrderReconciliationModalProps> = ({ isOpen, onClose, products }) => {
  const [step, setStep] = useState<'UPLOAD' | 'RESULT'>('UPLOAD');
  const [fileName, setFileName] = useState('');
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('UPLOAD');
    setResults([]);
    setFileName('');
    setError('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const ab = evt.target?.result;
        const wb = XLSX.read(ab, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (data.length < 2) {
          setError('Dosya boş veya format hatalı.');
          return;
        }

        const processed: ReconciliationResult[] = [];
        
        for (let i = 1; i < data.length; i++) {
            const row: any = data[i];
            if (!row || row.length === 0) continue;

            const code = row[0] ? String(row[0]).trim() : '';
            const qty = row[1] ? Number(row[1]) : 0;

            if (!code) continue;

            const internal = products.find(p => 
                (p.part_code && p.part_code.toLowerCase() === code.toLowerCase()) ||
                (p.product_name && p.product_name.toLowerCase() === code.toLowerCase()) ||
                (p.barcode === code)
            );

            processed.push({
                externalCode: code,
                qty: qty,
                matchStatus: internal ? 'FOUND' : 'NOT_FOUND',
                internalProduct: internal
            });
        }

        if (processed.length === 0) {
            setError('Okunabilir veri bulunamadı. Lütfen A sütununda Kod, B sütununda Miktar olduğundan emin olun.');
            return;
        }

        setResults(processed);
        setStep('RESULT');

      } catch (e) {
        setError('Excel okuma hatası.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // STRICT 4-COLUMN VLOOKUP EXPORT
  const handleDownloadReport = () => {
      const exportData = results.map(r => ({
          "Parça Kodu": r.externalCode,
          "Miktar": r.qty,
          "Reyon": r.internalProduct?.location || '-',
          "Mevcut Depo Adeti": r.internalProduct ? r.internalProduct.current_stock : 0
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Siparis_Stok_Kontrol");
      XLSX.writeFile(wb, "Siparis_Kontrol_Sonuc.xlsx");
  };

  const foundCount = results.filter(r => r.matchStatus === 'FOUND').length;
  const missingCount = results.length - foundCount;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-cyan-50 dark:bg-cyan-900/20">
          <h2 className="text-lg font-bold text-cyan-800 dark:text-cyan-300 flex items-center gap-2">
            <ClipboardCheck size={24} />
            Sipariş Stok Kontrolü (VLOOKUP)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            {step === 'UPLOAD' ? (
                <div className="space-y-6 text-center">
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 text-sm text-left">
                        <p className="font-bold text-blue-800 dark:text-blue-300 mb-2">Nasıl Çalışır?</p>
                        <p className="text-blue-700 dark:text-blue-400">
                            Excel listenizi yükleyin (Sütun A: Kod, Sütun B: Miktar). Sistem, kodları eşleştirip yanına <strong>Reyon</strong> ve <strong>Mevcut Stok</strong> bilgilerini ekleyerek size yeni bir Excel dosyası verir.
                        </p>
                    </div>

                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                        <Upload className="mx-auto text-cyan-500 mb-4 group-hover:scale-110 transition-transform" size={48} />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Excel Dosyası Seçin</h3>
                        <p className="text-sm text-slate-400 mt-1">Sütun A: Kod | Sütun B: Miktar</p>
                    </div>
                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center justify-center gap-2"><AlertTriangle size={16}/>{error}</div>}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl text-center">
                            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{foundCount}</div>
                            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Eşleşen</div>
                        </div>
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-xl text-center">
                            <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{missingCount}</div>
                            <div className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase">Bulunamayan</div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2"><FileSpreadsheet size={18} /> Önizleme</h3>
                        <div className="text-sm space-y-2">
                            {results.slice(0, 5).map((r, i) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                                    <span className="font-mono font-bold dark:text-slate-200">{r.externalCode}</span>
                                    {r.internalProduct ? (
                                        <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded">Stok: {r.internalProduct.current_stock}</span>
                                    ) : <span className="text-xs text-slate-400 italic">Bulunamadı</span>}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-2">... ve {results.length - 5} satır daha.</p>
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            {step === 'RESULT' ? (
                <>
                    <button onClick={handleReset} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 font-medium text-sm">Yeni Yükleme</button>
                    <button onClick={handleDownloadReport} className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-transform">
                        <Download size={18} /> Excel Olarak İndir
                    </button>
                </>
            ) : (
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 w-full text-center">İptal</button>
            )}
        </div>
      </div>
    </div>
  );
};

export default OrderReconciliationModal;