
import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, CheckCircle, XCircle, Trash2, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { getAuthorizedDevices, updateDeviceAuthorization, saveAppSetting } from '../services/supabase';
import { getDeviceId } from '../utils/device';
import { hashPassword } from '../utils/security';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudConfig: { supabaseUrl: string; supabaseKey: string } | null;
}

const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({ isOpen, onClose, cloudConfig }) => {
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
    const res = await getAuthorizedDevices(cloudConfig.supabaseUrl, cloudConfig.supabaseKey);
    if (res.success) {
      setDevices(res.data);
    }
    setIsLoading(false);
  };

  const handleToggleAuth = async (deviceId: string, currentAuth: boolean) => {
    if (!cloudConfig || isLoading) return;
    setIsLoading(true);
    const res = await updateDeviceAuthorization(cloudConfig.supabaseUrl, cloudConfig.supabaseKey, deviceId, !currentAuth);
    if (res.success) {
      await fetchDevices();
      setMessage({ type: 'success', text: `Cihaz yetkisi ${!currentAuth ? 'verildi' : 'kaldırıldı'}.` });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsLoading(false);
  };

  const handleChangePassword = async () => {
    if (!cloudConfig || !newPassword) return;
    setIsLoading(true);
    const hash = await hashPassword(newPassword);
    const res = await saveAppSetting(cloudConfig.supabaseUrl, cloudConfig.supabaseKey, 'admin_password_hash', hash);
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
              <button onClick={fetchDevices} className="text-blue-600 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="space-y-2">
              {devices.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                  Kayıtlı cihaz bekleyen istek yok.
                </div>
              ) : (
                devices.map(device => (
                  <div key={device.device_id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${device.device_id === currentDeviceId ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${device.is_authorized ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-sm dark:text-white flex items-center gap-2">
                          {device.device_name}
                          {device.device_id === currentDeviceId && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">BU CİHAZ</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: ...{device.device_id.slice(-8)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleAuth(device.device_id, device.is_authorized)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${device.is_authorized ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700'}`}
                      >
                        {device.is_authorized ? 'Yetkiyi Kaldır' : 'Yetki Ver'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              * Listede bulunmayan veya "Yetki Ver" butonu tıklanmamış cihazlar, doğru şifre girilse dahi yönetici paneline erişemez.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsModal;
