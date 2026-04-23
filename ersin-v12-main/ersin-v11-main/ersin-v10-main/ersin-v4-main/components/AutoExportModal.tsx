
import React, { useEffect, useState } from 'react';
import { X, FileSpreadsheet, Clock, CheckCircle, AlertTriangle, Download, Power } from 'lucide-react';
import { generateAndDownloadExcel } from '../utils/excelExport';
import { Product, Transaction } from '../types';

interface AutoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions: Transaction[];
  isAutoExportEnabled: boolean;
  onToggleAutoExport: (enabled: boolean) => void;
}

const AutoExportModal: React.FC<AutoExportModalProps> = ({ 
    isOpen, onClose, products, transactions, 
    isAutoExportEnabled, onToggleAutoExport 
}) => {
  const [lastExportTime, setLastExportTime] = useState<string>('-');

  useEffect(() => {
      const savedTime = localStorage.getItem('depopro_last_auto_export');
      if (savedTime) {
          setLastExportTime(new Date(savedTime).toLocaleString('tr-TR'));
      }
  }, [isOpen]);

  const handleManualExport = () => {
      generateAndDownloadExcel(products, transactions, 'Manuel_Rapor');
      const now = new Date();
      localStorage.setItem('depopro_last_auto_export', now.toISOString());
      setLastExportTime(now.toLocaleString('tr-TR'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col transition-colors">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/20">
          <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <FileSpreadsheet size={24} />
            Otomatik Excel Raporlama
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
            
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Otomatik Yedekleme</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Her 1 saatte bir verileri bilgisayara indirir.
                    </p>
                </div>
                <button 
                    onClick={() => onToggleAutoExport(!isAutoExportEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${isAutoExportEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${isAutoExportEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
                        <Power size={14} className={isAutoExportEnabled ? 'text-emerald-500' : 'text-slate-400'} />
                    </div>
                </button>
            </div>

            {isAutoExportEnabled && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-3">
                    <Clock className="text-blue-600 dark:text-blue-400 mt-1" size={20} />
                    <div>
                        <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Modül Aktif</p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                            Tarayıcı açık kaldığı sürece her saat başı "İndirilenler" klasörüne Excel dosyası kaydedilecektir.
                        </p>
                        <p className="text-[10px] text-blue-500 mt-2 font-mono">Son Yedek: {lastExportTime}</p>
                    </div>
                </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <button 
                    onClick={handleManualExport}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <Download size={18} />
                    Şimdi Rapor Al (Manuel)
                </button>
            </div>

            <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                <AlertTriangle size={12} />
                <span>Not: Tarayıcı izinlerine bağlı olarak dosya indirme onayı isteyebilir.</span>
            </div>

        </div>
      </div>
    </div>
  );
};

export default AutoExportModal;
