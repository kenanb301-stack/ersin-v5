import React, { useState, useEffect } from 'react';
import { X, Cloud, Save, CheckCircle, HelpCircle, Unplug } from 'lucide-react';
import { FirebaseConfig } from '../services/firebase';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: FirebaseConfig) => void;
  onDisconnect: () => void;
  currentConfig: FirebaseConfig | null;
  isConnected: boolean;
}

const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose, onSave, onDisconnect, currentConfig, isConnected }) => {
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    databaseURL: ''
  });

  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (isOpen && currentConfig) {
      setConfig(currentConfig);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(config);
  };

  const handleChange = (key: keyof FirebaseConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const parseJsonConfig = (jsonStr: string) => {
      try {
          const cleanStr = jsonStr.substring(jsonStr.indexOf('{'), jsonStr.lastIndexOf('}') + 1);
          const parsed = JSON.parse(cleanStr);
          setConfig({
            apiKey: parsed.apiKey || '',
            authDomain: parsed.authDomain || '',
            projectId: parsed.projectId || '',
            storageBucket: parsed.storageBucket || '',
            messagingSenderId: parsed.messagingSenderId || '',
            appId: parsed.appId || '',
            databaseURL: parsed.databaseURL || ''
          });
      } catch (e) {
          alert("JSON formatı hatalı. Lütfen Firebase konsolundan kopyaladığınız config nesnesini yapıştırın.");
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Cloud size={24} className="text-blue-600 dark:text-blue-400" />
            Bulut Bağlantısı (Canlı Senkronizasyon)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${isConnected ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-700 dark:border-slate-600'}`}>
                {isConnected ? (
                    <>
                        <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                        <div>
                            <h3 className="font-bold text-green-800 dark:text-green-300">Bağlantı Aktif</h3>
                            <p className="text-sm text-green-700 dark:text-green-400">Verileriniz anlık olarak bulut ile eşitleniyor.</p>
                        </div>
                    </>
                ) : (
                    <>
                        <Cloud className="text-slate-400" size={24} />
                        <div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-200">Bağlantı Yok</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">PC ve Mobil senkronizasyonu için Firebase bilgilerinizi girin.</p>
                        </div>
                    </>
                )}
            </div>

            <button 
                type="button" 
                onClick={() => setShowHelp(!showHelp)}
                className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1 hover:underline"
            >
                <HelpCircle size={16} />
                Bu bilgileri nereden bulabilirim? (Firebase Rehberi)
            </button>

            {showHelp && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm space-y-2 text-slate-700 dark:text-slate-300 border border-blue-100 dark:border-blue-800">
                    <p>1. <strong>console.firebase.google.com</strong> adresine gidin ve bir proje oluşturun.</p>
                    <p>2. Soldaki menüden <strong>Build &gt; Realtime Database</strong> seçin ve veritabanı oluşturun (Test modunda başlatabilirsiniz).</p>
                    <p>3. Proje ayarlarından (Dişli ikonu) "Project Settings"e gidin.</p>
                    <p>4. Aşağı kaydırıp "Your apps" kısmından bir Web App (`&lt;/&gt;`) oluşturun.</p>
                    <p>5. Size verilen `firebaseConfig` kodunu kopyalayıp aşağıdaki alanlara yapıştırın.</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Hızlı Kurulum (JSON Yapıştır)</label>
                     <textarea 
                        rows={3}
                        placeholder='firebaseConfig nesnesini buraya yapıştırırsanız otomatik doldurulur...'
                        className="w-full p-2 text-xs font-mono border rounded-lg bg-slate-50 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-300"
                        onChange={(e) => parseJsonConfig(e.target.value)}
                     />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Key</label>
                        <input type="text" required value={config.apiKey} onChange={(e) => handleChange('apiKey', e.target.value)} className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Auth Domain</label>
                        <input type="text" required value={config.authDomain} onChange={(e) => handleChange('authDomain', e.target.value)} className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Database URL (Önemli)</label>
                        <input type="text" required value={config.databaseURL} onChange={(e) => handleChange('databaseURL', e.target.value)} placeholder="https://...firebaseio.com" className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project ID</label>
                        <input type="text" required value={config.projectId} onChange={(e) => handleChange('projectId', e.target.value)} className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Storage Bucket</label>
                        <input type="text" required value={config.storageBucket} onChange={(e) => handleChange('storageBucket', e.target.value)} className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Messaging Sender ID</label>
                        <input type="text" required value={config.messagingSenderId} onChange={(e) => handleChange('messagingSenderId', e.target.value)} className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">App ID</label>
                        <input type="text" required value={config.appId} onChange={(e) => handleChange('appId', e.target.value)} className="w-full p-2 rounded-lg border dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    {isConnected && (
                         <button 
                            type="button" 
                            onClick={() => {
                                if(confirm("Bağlantıyı kesmek istediğinize emin misiniz?")) onDisconnect();
                            }}
                            className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded-lg flex items-center gap-2"
                        >
                            <Unplug size={18} /> Bağlantıyı Kes
                        </button>
                    )}
                    <button 
                        type="submit" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                    >
                        <Save size={20} />
                        {isConnected ? 'Ayarları Güncelle' : 'Kaydet ve Bağlan'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default CloudSyncModal;