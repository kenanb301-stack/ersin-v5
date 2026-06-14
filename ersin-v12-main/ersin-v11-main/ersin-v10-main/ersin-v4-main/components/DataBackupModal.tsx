
import React, { useRef, useState } from 'react';
import { X, Download, Upload, Database, AlertTriangle, CheckCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackup: () => void;
  onRestore: (file: File) => Promise<void>;
  onRestoreExcel: (file: File) => Promise<void>;
}

const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose, onBackup, onRestore, onRestoreExcel }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestoringExcel, setIsRestoringExcel] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [excelStatus, setExcelStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("DİKKAT: Yükleyeceğiniz yedek dosyası, şu anki tüm verilerin üzerine yazılacaktır. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?")) {
        e.target.value = ''; // Reset input
        return;
    }

    setIsRestoring(true);
    setRestoreStatus('IDLE');

    try {
        await onRestore(file);
        setRestoreStatus('SUCCESS');
        setTimeout(() => {
            onClose();
            setRestoreStatus('IDLE');
        }, 1500);
    } catch (error) {
        console.error(error);
        setRestoreStatus('ERROR');
    } finally {
        setIsRestoring(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Yükleyeceğiniz Excel dosyasındaki yeni ürünler eklenecek, var olan ürünler güncellenecek ve stok/fiyat/hareket verileri sisteme aktarılacaktır. Devam etmek istiyor musunuz?")) {
        e.target.value = ''; // Reset input
        return;
    }

    setIsRestoringExcel(true);
    setExcelStatus('IDLE');

    try {
        await onRestoreExcel(file);
        setExcelStatus('SUCCESS');
        setTimeout(() => {
            onClose();
            setExcelStatus('IDLE');
        }, 1500);
    } catch (error) {
        console.error(error);
        setExcelStatus('ERROR');
    } finally {
        setIsRestoringExcel(false);
        if(excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in animate-duration-150">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden transition-colors border border-slate-200 dark:border-slate-700">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database size={24} className="text-blue-600 dark:text-blue-400" />
            Veri Yönetimi ve Eşitleme
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                <p><strong>Verilerimi nasıl yedeklerim ve aktarırım?</strong></p>
                <p className="mt-1 opacity-90">
                    Supabase'den aldığınız ya da bu sistemden indirdiğiniz otomatik Excel raporunu / yedek dosyasını kullanarak tüm ürünlerinizi, mevcut stoklarınızı ve geçmiş giriş/çıkış hareketlerini tek tıkla geri yükleyebilirsiniz.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* BACKUP */}
                <button 
                    onClick={onBackup}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                >
                    <div className="p-3 bg-white dark:bg-slate-600 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <Download size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200">Yedeği İndir</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">Tüm verileri Excel (.xlsx) olarak kaydet</span>
                </button>

                {/* RESTORE JSON */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring || isRestoringExcel}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group relative overflow-hidden"
                >
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json"
                        className="hidden"
                    />
                    
                    {isRestoring ? (
                        <RefreshCw size={24} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
                    ) : restoreStatus === 'SUCCESS' ? (
                        <CheckCircle size={24} className="text-indigo-600 dark:text-indigo-400 mb-3" />
                    ) : restoreStatus === 'ERROR' ? (
                        <AlertTriangle size={24} className="text-red-500 mb-3" />
                    ) : (
                        <div className="p-3 bg-white dark:bg-slate-600 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <Upload size={24} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                    )}

                    <span className="font-bold text-slate-700 dark:text-slate-200">
                        {isRestoring ? 'Yükleniyor...' : restoreStatus === 'SUCCESS' ? 'Başarılı!' : 'JSON Yükle'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                        {restoreStatus === 'ERROR' ? 'Hatalı dosya formatı' : '.json yedek dosyasını seç'}
                    </span>
                </button>

                {/* RESTORE EXCEL */}
                <button 
                    onClick={() => excelInputRef.current?.click()}
                    disabled={isRestoring || isRestoringExcel}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group relative overflow-hidden"
                >
                    <input 
                        type="file" 
                        ref={excelInputRef}
                        onChange={handleExcelChange}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    
                    {isRestoringExcel ? (
                        <RefreshCw size={24} className="animate-spin text-emerald-600 dark:text-emerald-400 mb-3" />
                    ) : excelStatus === 'SUCCESS' ? (
                        <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400 mb-3" />
                    ) : excelStatus === 'ERROR' ? (
                        <AlertTriangle size={24} className="text-red-500 mb-3" />
                    ) : (
                        <div className="p-3 bg-white dark:bg-slate-600 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <FileSpreadsheet size={24} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                    )}

                    <span className="font-bold text-slate-700 dark:text-slate-200">
                        {isRestoringExcel ? 'Yükleniyor...' : excelStatus === 'SUCCESS' ? 'Başarılı!' : 'Excel Raporu Yükle'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                        {excelStatus === 'ERROR' ? 'Hatalı dosya formatı' : 'Toplu Excel (.xlsx) raporunu seç'}
                    </span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DataBackupModal;
