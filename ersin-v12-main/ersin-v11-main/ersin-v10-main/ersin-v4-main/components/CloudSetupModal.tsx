import React, { useState } from 'react';
import { X, Database, Copy, CheckCircle, ShieldCheck, Zap, Loader2, AlertTriangle, Share2, QrCode, CloudLightning } from 'lucide-react';
import { CloudConfig } from '../types';
import { testConnection } from '../services/firebase';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string, key: string) => void;
  currentConfig: CloudConfig | null;
}

const CloudSetupModal: React.FC<CloudSetupModalProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
  const [activeTab, setActiveTab] = useState<'SETUP' | 'SHARE'>('SETUP');
  
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
      setIsTesting(true);
      const result = await testConnection();
      setIsTesting(false);
      setTestResult(result);
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWrapper = () => {
      onSave('firebase-enabled', 'true'); 
      onClose();
  }

  const generateShareLink = () => {
      const configPayload = JSON.stringify({
          firebaseEnabled: true,
          autoLogin: true       
      });
      return `${window.location.origin}${window.location.pathname}?setup=${btoa(configPayload)}`;
  };

  const shareLink = generateShareLink();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Database size={24} className="text-blue-600" /> Bulut Kurulumu (Firebase)
          </h2>
          <button onClick={onClose}><X size={24} className="text-slate-400" /></button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button onClick={() => setActiveTab('SETUP')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'SETUP' ? 'border-blue-600 text-blue-700 bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500'}`}><Database size={16}/> Bağlantı Ayarları</button>
            <button onClick={() => setActiveTab('SHARE')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'SHARE' ? 'border-indigo-600 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/10' : 'text-slate-500'}`}><Share2 size={16}/> İzleyici İçin Paylaş</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'SETUP' && (
                <>
                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl border border-blue-100 dark:border-slate-700 flex items-start gap-4">
                    <div className="p-3 bg-blue-600 rounded-xl text-white">
                        <CloudLightning size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-1 flex items-center gap-2">
                            Tam Otomatik Firebase Entegrasyonu
                        </h3>
                        <p className="text-xs text-blue-700 dark:text-slate-300 leading-relaxed">
                            Artık herhangi bir SQL kodu çalıştırmanıza veya URL girmenize gerek yok! Sistem, güvenli Cloud Firestore veritabanına doğrudan bağlanır.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Senkronize Edilecek Modüller</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Ürünler (Products)
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Hareket Geçmişi (Transactions)
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Siparişler (Orders)
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Sayım Raporları (Cycle Counts)
                        </div>
                    </div>
                </div>

                {testResult && (
                    <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 border ${testResult.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {testResult.success ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                        {testResult.message}
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={handleTest} disabled={isTesting} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-white rounded-xl font-bold text-slate-700 flex items-center gap-2 disabled:opacity-50 transition-colors">
                        {isTesting ? <Loader2 className="animate-spin"/> : <Zap size={16}/>} Bağlantıyı Test Et
                    </button>
                    <button onClick={handleSaveWrapper} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors">
                        Bulut Servisini Etkinleştir
                    </button>
                </div>
                </>
            )}
            {activeTab === 'SHARE' && (
                <div className="flex flex-col items-center justify-center text-center space-y-8 py-4">
                    <div className="max-w-md w-full space-y-4">
                        <div className="flex flex-col items-center gap-2">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                <QrCode size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">İzleyici Erişim Paneli</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Bu QR kodu okutarak personellerin sadece stokları görmesini sağlayabilirsiniz.</p>
                        </div>

                        {shareLink ? (
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col items-center gap-6">
                                    <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-50">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareLink)}`} 
                                            alt="QR" 
                                            className="w-56 h-56" 
                                        />
                                    </div>
                                    
                                    <div className="w-full space-y-3">
                                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate text-left">
                                                {shareLink}
                                            </div>
                                            <button 
                                                onClick={() => handleCopy(shareLink)}
                                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-blue-600"
                                            >
                                                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                            <Zap size={10}/> Linki kopyalayıp WhatsApp üzerinden de paylaşabilirsiniz
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center gap-3">
                                <AlertTriangle size={48} className="text-amber-500" />
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Bağlantı Oluşturulamadı</p>
                                <p className="text-xs text-slate-500">Lütfen bulut servisini etkinleştirin.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
export default CloudSetupModal;
