
import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, X, Loader2, Download, Table } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: any[]) => void;
  existingProducts: Product[];
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImport, existingProducts }) => {
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet);

          if (json.length === 0) {
            setError("Dosya boş görünüyor.");
            setIsLoading(false);
            return;
          }

          // Validate headers (basic check)
          const headers = Object.keys(json[0]);
          const required = ['product_name'];
          const missing = required.filter(h => !headers.includes(h));

          if (missing.length > 0) {
              setError(`Eksik Sütunlar: ${missing.join(', ')}. Lütfen örnek şablonu kullanın.`);
              setIsLoading(false);
              return;
          }

          setPreviewData(json);
        } catch (err) {
          setError("Excel okuma hatası. Lütfen dosya formatını kontrol edin.");
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setError("Dosya yükleme hatası.");
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        product_name: 'Örnek Ürün',
        part_code: 'OMA-001',
        barcode: '123456789',
        brand: 'Marka',
        category: 'Kategori',
        unit: 'Adet',
        current_stock: 10,
        min_stock: 5,
        location: 'A1-01',
        purchase_price: 100,
        sale_price: 150
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sablon");
    XLSX.writeFile(wb, "Omaks_Stok_Sablon.xlsx");
  };

  const handleCompleteImport = () => {
    onImport(previewData);
    setPreviewData([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">Toplu Stok Excel İçe Aktar</h2>
              <p className="text-xs text-slate-500">Excel dosyasından toplu ürün ve stok girişi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {previewData.length === 0 ? (
            <div className="space-y-6">
              <div 
                className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${dragActive ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {isLoading ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="text-emerald-500 animate-spin" />
                    <p className="text-slate-600 dark:text-slate-400">Dosya işleniyor...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload size={32} className="text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold dark:text-white mb-2">Excel Dosyasını Sürükleyip Bırakın</h3>
                    <p className="text-slate-500 text-sm mb-6">Veya bilgisayarınızdan seçin</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileInput} accept=".xlsx, .xls, .csv" className="hidden" />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                    >
                      Dosya Seç
                    </button>
                  </>
                )}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-600 mt-0.5" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300">Önemli Notlar</h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1.5 list-disc pl-4">
                      <li>Sadece .xlsx, .xls ve .csv formatları desteklenir.</li>
                      <li><b>product_name</b> sütunu zorunludur.</li>
                      <li>Eğer bir ürün <b>part_code</b> veya <b>barcode</b> ile mevcutsa, stok miktarı güncellenir.</li>
                      <li>Yeni ürünler otomatik olarak sisteme eklenir.</li>
                    </ul>
                    <button 
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-700 hover:shadow-md transition-all"
                    >
                      <Download size={14} /> Örnek Şablonu İndir
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                  <AlertCircle size={18} />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold dark:text-white flex items-center gap-2">
                  <Table size={20} className="text-emerald-600" />
                  Yüklenecek Veriler ({previewData.length} Satır)
                </h3>
                <button onClick={() => setPreviewData([])} className="text-xs text-red-600 font-bold hover:underline">Vazgeç</button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-black tracking-tighter">
                    <tr>
                      <th className="px-4 py-3">Ürün Adı</th>
                      <th className="px-4 py-3">Parça Kodu</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Stok</th>
                      <th className="px-4 py-3">Birim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="dark:text-slate-300">
                        <td className="px-4 py-3 font-bold">{row.product_name}</td>
                        <td className="px-4 py-3 font-mono">{row.part_code || '-'}</td>
                        <td className="px-4 py-3">{row.category || '-'}</td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">{row.current_stock || 0}</td>
                        <td className="px-4 py-3">{row.unit || 'Adet'}</td>
                      </tr>
                    ))}
                    {previewData.length > 10 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-center text-slate-500 italic">
                          ...ve {previewData.length - 10} satır daha
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed uppercase font-black">
                   ⚠️ "İçe Aktarmayı Tamamla" butonuna bastığınızda veriler sisteme işlenecek ve geri alınamayacaktır. Lütfen listeyi kontrol edin.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {previewData.length > 0 && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
            <button 
              onClick={() => setPreviewData([])}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              İptal
            </button>
            <button 
              onClick={handleCompleteImport}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 size={20} /> İçe Aktarmayı Tamamla
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImportModal;
