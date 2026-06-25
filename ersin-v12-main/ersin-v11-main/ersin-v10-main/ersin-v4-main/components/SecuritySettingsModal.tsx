
import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, CheckCircle, XCircle, Trash2, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { getAuthorizedDevices, updateDeviceAuthorization, saveAppSetting, deleteDevice } from '../services/firebase';
import { getDeviceId } from '../utils/device';
import { hashPassword } from '../utils/security';
import { CloudConfig } from '../types';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudConfig: CloudConfig | null;
  onRecalculateStocks?: () => void;
}

const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({ isOpen, onClose, cloudConfig, onRecalculateStocks }) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [currentDeviceId] = useState(getDeviceId());
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (isOpen && cloudConfig) {
      fetchDevices();
    }
  }, [isOpen, cloudConfig]);

  const fetchDevices = async () => {
    if (!cloudConfig) return;
    setIsLoading(true);
    const res = await getAuthorizedDevices();
    if (res.success) {
      setDevices(res.data);
    }
    setIsLoading(false);
  };

  const handleToggleAuth = async (deviceId: string, currentAuth: boolean) => {
    if (!cloudConfig || isLoading) return;
    setIsLoading(true);
    const res = await updateDeviceAuthorization(deviceId, !currentAuth);
    if (res.success) {
      await fetchDevices();
      setMessage({ type: 'success', text: `Cihaz yetkisi ${!currentAuth ? 'verildi' : 'kaldırıldı'}.` });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsLoading(false);
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    if (!cloudConfig || isLoading) return;
    if (!confirm(`"${deviceName || 'Bilinmeyen Cihaz'}" isimli cihazı yetkili cihazlar listesinden tamamen silmek istiyor musunuz?`)) {
      return;
    }
    
    setIsLoading(true);
    const res = await deleteDevice(deviceId);
    if (res.success) {
      await fetchDevices();
      setMessage({ type: 'success', text: 'Cihaz listeden başarıyla silindi.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: 'Cihaz silinirken hata oluştu.' });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsLoading(false);
  };

  const handleChangePassword = async () => {
    if (!cloudConfig || !newPassword) return;
    setIsLoading(true);
    const hash = await hashPassword(newPassword);
    const res = await saveAppSetting('admin_password_hash', hash);
    if (res.success) {
      setMessage({ type: 'success', text: 'Yönetici şifresi başarıyla güncellendi!' });
      setNewPassword('');
    } else {
      setMessage({ type: 'error', text: 'Şifre güncellenirken hata oluştu.' });
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">Güvenlik Merkezi</h2>
              <p className="text-xs text-slate-500">Cihaz yetkileri ve sistem güvenliği</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <XCircle size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8">
          {/* PASSWORD SECION */}
          <section className="space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2">
              <Key size={16} /> Yönetici Şifresini Güncelle
            </h3>
            <div className="flex gap-2">
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifre girin..."
                className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleChangePassword}
                disabled={isLoading || !newPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                Güncelle
              </button>
            </div>
            {message && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {message.type === 'success' ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
                {message.text}
              </div>
            )}
          </section>

          {/* DEVICES SECTION */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2">
                <Smartphone size={16} /> Yetkili Cihazlar
              </h3>
              <button 
                onClick={fetchDevices} 
                disabled={isLoading}
                className="text-blue-600 dark:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Yenile
              </button>
            </div>

            <div className="space-y-3">
              {devices.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                  <Smartphone size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-sm font-medium">Kayıtlı cihaz veya yetki bekleyen istek bulunamadı.</p>
                  <p className="text-xs text-slate-400 mt-1">Sisteme girmek isteyen mobil cihazlar burada görünür.</p>
                </div>
              ) : (
                devices.map(device => {
                  const isCurrent = device.device_id === currentDeviceId;
                  return (
                    <div 
                      key={device.device_id} 
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-2xl border transition-all gap-4 ${
                        isCurrent 
                          ? 'border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/10 ring-1 ring-blue-400/30' 
                          : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`p-3 rounded-2xl ${
                          device.is_authorized 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                        }`}>
                          <Smartphone size={22} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                              {device.device_name || 'Bilinmeyen Cihaz'}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                Bu Cihaz
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              device.is_authorized 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                              {device.is_authorized ? 'Yetkili' : 'Yetki Bekliyor'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-mono">
                            <span>ID: {device.device_id}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-2 sm:self-center">
                        <button 
                          onClick={() => handleToggleAuth(device.device_id, device.is_authorized)}
                          disabled={isLoading}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            device.is_authorized 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/10'
                          } disabled:opacity-50`}
                        >
                          {device.is_authorized ? 'Yetkiyi Kaldır' : 'Yetki Ver'}
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteDevice(device.device_id, device.device_name)}
                          disabled={isLoading}
                          title="Cihazı Tamamen Sil"
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition-all disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
              * Listede bulunmayan veya "Yetki Ver" butonu tıklanmamış mobil cihazlar, doğru yönetici şifresini girseler dahi paneli kullanamazlar.
            </p>
          </section>

          {/* MAINTENANCE SECTION */}
          <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-black uppercase text-slate-400 flex items-center gap-2">
              <RefreshCw size={16} /> Sistem Bakımı
            </h3>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold dark:text-white">Stokları Yeniden Hesapla</p>
                        <p className="text-xs text-slate-500">Mevcut stokları tüm işlem geçmişini tarayarak düzeltir. (Hatalı/Eksi stoklar için)</p>
                    </div>
                    <button 
                        onClick={() => {
                            if (confirm('Tüm ürünlerin stokları, işlem geçmişindeki giriş-çıkışlara göre sıfırdan hesaplanacaktır. Devam edilsin mi?')) {
                                onRecalculateStocks?.();
                            }
                        }}
                        className="p-3 bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl transition-all"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsModal;
