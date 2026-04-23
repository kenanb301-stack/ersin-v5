
import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, X, Loader2, Download, Table } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any[], mode: 'PRODUCT' | 'TRANSACTION') => void;
  existingProducts: Product[];
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImport, existingProducts }) => {
  const [importMode, setImportMode] = useState<'PRODUCT' | 'TRANSACTION'>('PRODUCT');
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

          let mappedData: any[] = [];
          if (importMode === 'PRODUCT') {
            mappedData = json.map(row => ({
              product_name: row['Açıklama / Parça Adı'] || row['product_name'] || row['Ürün Adı'],
              part_code: row['Parça Kodu'] || row['part_code'],
              location: row['Reyon / Raf'] || row['location'],
              material: row['Hammadde / Çeşit'] || row['material'],
              unit: row['Birim'] || row['unit'] || 'Adet',
              min_stock_level: Number(row['Kritik Stok (Min)']) || Number(row['min_stock']) || 0,
              current_stock: Number(row['Açılış Stoğu']) || Number(row['current_stock']) || 0
            }));
          } else {
            mappedData = json.map(row => ({
              part_code: row['Parça Kodu'] || row['part_code'],
              quantity: Number(row['Miktar']) || 0,
              type: String(row['İşlem Tipi'] || row['IslemTipi'] || 'GİRİŞ').toUpperCase().includes('ÇIK') ? 'OUT' : 'IN',
              description: row['Açıklama / Not'] || row['Aciklama'] || 'Toplu Hareket'
            }));
          }

          // Validate headers (basic check)
          if (importMode === 'PRODUCT') {
              const required = ['product_name'];
              const firstRow = mappedData[0];
              if (!firstRow || !firstRow.product_name) {
                  setError(`Eksik Bilgi: "Açıklama / Parça Adı" sütunu zorunludur.`);
                  setIsLoading(false);
                  return;
              }
          } else {
              const firstRow = mappedData[0];
              if (!firstRow || !firstRow.part_code || !firstRow.quantity) {
                  setError(`Eksik Bilgi: "Parça Kodu" ve "Miktar" sütunları zorunludur.`);
                  setIsLoading(false);
                  return;
              }
          }

          setPreviewData(mappedData);
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
    let template = [];
    let fileName = "";
    
    if (importMode === 'PRODUCT') {
        template = [{
            'Parça Kodu': 'P-001',
            'Reyon / Raf': 'A1-01',
            'Açıklama / Parça Adı': 'Örnek Ürün',
            'Hammadde / Çeşit': 'ST37',
            'Birim': 'Adet',
            'Kritik Stok (Min)': 5,
            'Açılış Stoğu': 10
        }];
        fileName = "Omaks_Urun_Sablon.xlsx";
    } else {
        template = [{
            'Parça Kodu': 'P-001',
            'Miktar': 10,
            'İşlem Tipi': 'GİRİŞ',
            'Açıklama / Not': 'Üretimden giriş'
        }, {
            'Parça Kodu': 'P-001',
            'Miktar': 5,
            'İşlem Tipi': 'ÇIKIŞ',
            'Açıklama / Not': 'Sevkiyat'
        }];
        fileName = "Omaks_Hareket_Sablon.xlsx";
    }
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sablon");
    XLSX.writeFile(wb, fileName);
  };

  const handleCompleteImport = () => {
    onImport(previewData, importMode);
    setPreviewData([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Tabs */}
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl text-white">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold dark:text-white">Excel Toplu İşlem</h2>
                <p className="text-xs text-slate-500">Dosyadan toplu veri aktarımı</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          {previewData.length === 0 && (
            <div className="flex px-6 gap-6">
                <button 
                    onClick={() => setImportMode('PRODUCT')}
                    className={`pb-4 text-sm font-bold transition-all relative ${importMode === 'PRODUCT' ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                    Yeni Ürün Listesi
                    {importMode === 'PRODUCT' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 rounded-full" />}
                </button>
                <button 
                    onClick={() => setImportMode('TRANSACTION')}
                    className={`pb-4 text-sm font-bold transition-all relative ${importMode === 'TRANSACTION' ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    Stok Hareketleri (Giriş/Çıkış)
                    {importMode === 'TRANSACTION' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                </button>
            </div>
          )}
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
                    <h3 className="text-lg font-bold dark:text-white mb-2">Excel Dosyasını Sürükleyin</h3>
                    <p className="text-slate-500 text-sm mb-6">Veya bilgisayarınızdan seçin</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileInput} accept=".xlsx, .xls, .csv" className="hidden" />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={`px-6 py-3 ${importMode === 'PRODUCT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl font-bold transition-all shadow-md active:scale-95`}
                    >
                      Dosya Seç
                    </button>
                  </>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-emerald-600 mt-0.5" />
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold dark:text-white">İpucu</h4>
                    <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                      {importMode === 'PRODUCT' ? (
                        <>
                          <li><b>Açıklama / Parça Adı</b> zorunludur.</li>
                          <li>Parça kodu verilirse sistem barkodu otomatik üretir.</li>
                          <li>Aynı parça kodu varsa veriler güncellenir.</li>
                        </>
                      ) : (
                        <>
                          <li><b>Parça Kodu</b> ve <b>Miktar</b> zorunludur.</li>
                          <li>İşlem tipi GİRİŞ veya ÇIKIŞ (OUT) olabilir.</li>
                          <li>Ürün bulunamazsa bu satır atlanır.</li>
                        </>
                      )}
                    </ul>
                    <button 
                      onClick={downloadTemplate}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
                    >
                      <Download size={14} /> Şablonu İndir
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
                  Önizleme ({previewData.length} Satır)
                </h3>
                <button onClick={() => setPreviewData([])} className="text-xs text-red-600 font-bold hover:underline">Vazgeç</button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-black tracking-tighter">
                    {importMode === 'PRODUCT' ? (
                      <tr>
                        <th className="px-4 py-3">Ürün Adı</th>
                        <th className="px-4 py-3">Parça Kodu</th>
                        <th className="px-4 py-3">Reyon</th>
                        <th className="px-4 py-3">Açılış Stoğu</th>
                        <th className="px-4 py-3">Birim</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3">Parça Kodu</th>
                        <th className="px-4 py-3">Miktar</th>
                        <th className="px-4 py-3">Tip</th>
                        <th className="px-4 py-3">Açıklama</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="dark:text-slate-300">
                        {importMode === 'PRODUCT' ? (
                          <>
                            <td className="px-4 py-3 font-bold">{row.product_name}</td>
                            <td className="px-4 py-3 font-mono">{row.part_code || '-'}</td>
                            <td className="px-4 py-3">{row.location || '-'}</td>
                            <td className="px-4 py-3 text-emerald-600 font-bold">{row.current_stock || 0}</td>
                            <td className="px-4 py-3">{row.unit || 'Adet'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-mono font-bold">{row.part_code}</td>
                            <td className="px-4 py-3 font-bold">{row.quantity}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {row.type === 'IN' ? 'GİRİŞ' : 'ÇIKIŞ'}
                                </span>
                            </td>
                            <td className="px-4 py-3 italic text-slate-400">{row.description}</td>
                          </>
                        )}
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
              className={`px-8 py-3 ${importMode === 'PRODUCT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2`}
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
