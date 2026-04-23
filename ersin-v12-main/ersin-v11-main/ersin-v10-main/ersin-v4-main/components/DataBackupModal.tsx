
import React, { useRef, useState } from 'react';
import { X, Download, Upload, Database, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackup: () => void;
  onRestore: (file: File) => Promise<void>;
}

const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose, onBackup, onRestore }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transition-colors">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database size={24} className="text-blue-600 dark:text-blue-400" />
            Veri Yönetimi ve Eşitleme
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                <p><strong>Neden verilerimi görmüyorum?</strong></p>
                <p className="mt-1 opacity-80">Veriler tarayıcı hafızasında saklanır. Cihazlar arası aktarım yapmak için PC'den yedeği indirip, Mobile yükleyebilirsiniz.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* BACKUP */}
                <button 
                    onClick={onBackup}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                >
                    <div className="p-3 bg-white dark:bg-slate-600 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <Download size={24} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-200">Yedeği İndir</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">Tüm verileri .json olarak kaydet</span>
                </button>

                {/* RESTORE */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group relative overflow-hidden"
                >
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json"
                        className="hidden"
                    />
                    
                    {isRestoring ? (
                        <RefreshCw size={24} className="animate-spin text-green-600 dark:text-green-400 mb-3" />
                    ) : restoreStatus === 'SUCCESS' ? (
                        <CheckCircle size={24} className="text-green-600 dark:text-green-400 mb-3" />
                    ) : restoreStatus === 'ERROR' ? (
                        <AlertTriangle size={24} className="text-red-500 mb-3" />
                    ) : (
                        <div className="p-3 bg-white dark:bg-slate-600 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <Upload size={24} className="text-green-600 dark:text-green-400" />
                        </div>
                    )}

                    <span className="font-bold text-slate-700 dark:text-slate-200">
                        {isRestoring ? 'Yükleniyor...' : restoreStatus === 'SUCCESS' ? 'Başarılı!' : 'Yedeği Yükle'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                        {restoreStatus === 'ERROR' ? 'Hatalı dosya formatı' : '.json dosyasını seç'}
                    </span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DataBackupModal;
