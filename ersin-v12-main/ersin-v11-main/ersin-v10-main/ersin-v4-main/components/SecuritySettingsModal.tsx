
import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Smartphone, CheckCircle, XCircle, Trash2, Key, RefreshCw, AlertCircle, Monitor, Tablet, Globe } from 'lucide-react';
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

// Helpers for Device and Browser parsing
const parseDeviceName = (name: string) => {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match) {
    return { model: match[1], browser: match[2] };
  }
  return { model: name || 'Bilinmeyen Cihaz', browser: 'Bilinmeyen Tarayıcı' };
};

const getDeviceIcon = (model: string) => {
  const m = model.toLowerCase();
  if (m.includes('pc') || m.includes('windows') || m.includes('mac') || m.includes('linux')) {
    return <Monitor size={22} className="text-slate-500 dark:text-slate-400" />;
  }
  if (m.includes('ipad') || m.includes('tablet')) {
    return <Tablet size={22} className="text-slate-500 dark:text-slate-400" />;
  }
  return <Smartphone size={22} className="text-slate-500 dark:text-slate-400" />;
};

const getBrowserColor = (browser: string) => {
  const b = browser.toLowerCase();
  if (b.includes('chrome')) return 'text-blue-500 dark:text-blue-400';
  if (b.includes('safari')) return 'text-sky-500 dark:text-sky-400';
  if (b.includes('firefox')) return 'text-orange-500 dark:text-orange-400';
  if (b.includes('edge')) return 'text-emerald-500 dark:text-emerald-400';
  if (b.includes('opera')) return 'text-red-500 dark:text-red-400';
  return 'text-slate-500 dark:text-slate-400';
};

interface GroupedSession {
  device_id: string;
  device_name: string;
  model: string;
  browser: string;
  is_authorized: boolean;
  updated_at: string;
  is_current: boolean;
  ip_address?: string;
}

interface GroupedDevice {
  hardware_fingerprint: string;
  primary_model: string;
  is_any_current: boolean;
  sessions: GroupedSession[];
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

  const groupedDevices = useMemo(() => {
    const groups: { [key: string]: GroupedDevice } = {};

    devices.forEach(dev => {
      // Grouping key: use hardware_fingerprint if exists and is not empty, otherwise treat as individual legacy device
      const key = (dev.hardware_fingerprint && dev.hardware_fingerprint.trim() !== "") 
        ? dev.hardware_fingerprint 
        : `legacy-${dev.device_id}`;

      const parsed = parseDeviceName(dev.device_name || '');
      const isCurrent = dev.device_id === currentDeviceId;

      if (!groups[key]) {
        groups[key] = {
          hardware_fingerprint: dev.hardware_fingerprint || "",
          primary_model: parsed.model,
          is_any_current: isCurrent,
          sessions: []
        };
      }

      if (isCurrent) {
        groups[key].is_any_current = true;
      }

      groups[key].sessions.push({
        device_id: dev.device_id,
        device_name: dev.device_name || 'Bilinmeyen Cihaz',
        model: parsed.model,
        browser: parsed.browser,
        is_authorized: !!dev.is_authorized,
        updated_at: dev.updated_at || '',
        is_current: isCurrent,
        ip_address: dev.ip_address || ''
      });
    });

    const groupedArray = Object.values(groups);

    // Sort sessions in each group by updated_at descending
    groupedArray.forEach(group => {
      group.sessions.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      // update primary model with the newest one
      if (group.sessions.length > 0) {
        group.primary_model = group.sessions[0].model;
      }
    });

    // Sort groups so current device is on top, then by newest session update date
    groupedArray.sort((a, b) => {
      if (a.is_any_current && !b.is_any_current) return -1;
      if (!a.is_any_current && b.is_any_current) return 1;

      const newestA = a.sessions[0]?.updated_at || "";
      const newestB = b.sessions[0]?.updated_at || "";
      return newestB.localeCompare(newestA);
    });

    return groupedArray;
  }, [devices, currentDeviceId]);

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

            <div className="space-y-4">
              {groupedDevices.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                  <Smartphone size={32} className="mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-sm font-medium">Kayıtlı cihaz veya yetki bekleyen istek bulunamadı.</p>
                  <p className="text-xs text-slate-400 mt-1">Sisteme girmek isteyen mobil cihazlar burada görünür.</p>
                </div>
              ) : (
                groupedDevices.map(group => {
                  const hasAuthorized = group.sessions.some(s => s.is_authorized);
                  return (
                    <div 
                      key={group.hardware_fingerprint || group.sessions[0]?.device_id}
                      className={`bg-slate-50 dark:bg-slate-800/20 rounded-2xl border p-4.5 space-y-4.5 transition-all ${
                        group.is_any_current 
                          ? 'border-blue-200 dark:border-blue-900/60 ring-1 ring-blue-400/20 bg-blue-50/10 dark:bg-blue-950/5' 
                          : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-800/20'
                      }`}
                    >
                      {/* Physical Device Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className={`p-3 rounded-2xl ${
                            hasAuthorized 
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                          }`}>
                            {getDeviceIcon(group.primary_model)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                                {group.primary_model}
                              </span>
                              {group.is_any_current && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                  Bu Cihaz
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                hasAuthorized 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              }`}>
                                {hasAuthorized ? 'Yetkili Cihaz' : 'Yetki Bekliyor'}
                              </span>
                            </div>
                            
                            {group.hardware_fingerprint && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                Donanım Kimliği: {group.hardware_fingerprint}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sessions (Browsers list) inside the device */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase px-1">
                          Aktif Tarayıcı Oturumları / Girişler
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/40">
                          {group.sessions.map(session => (
                            <div 
                              key={session.device_id} 
                              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3.5 transition-all ${
                                session.is_current 
                                  ? 'bg-blue-50/20 dark:bg-blue-950/10' 
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Globe size={16} className={`${getBrowserColor(session.browser)} flex-shrink-0`} />
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                      {session.browser}
                                    </span>
                                    {session.is_current && (
                                      <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wide">
                                        Aktif Tarayıcı
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                    <span>ID: ...{session.device_id.slice(-8)}</span>
                                    {session.ip_address && (
                                      <>
                                        <span className="opacity-40">•</span>
                                        <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">IP: {session.ip_address}</span>
                                      </>
                                    )}
                                    {session.updated_at && (
                                      <>
                                        <span className="opacity-40">•</span>
                                        <span>Görülme: {new Date(session.updated_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                  session.is_authorized 
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                                }`}>
                                  {session.is_authorized ? 'Yetkili' : 'Yetkisiz'}
                                </span>

                                <button 
                                  onClick={() => handleToggleAuth(session.device_id, session.is_authorized)}
                                  disabled={isLoading}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                    session.is_authorized 
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300' 
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                  } disabled:opacity-50`}
                                >
                                  {session.is_authorized ? 'Yetkiyi Kaldır' : 'Yetki Ver'}
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteDevice(session.device_id, session.device_name)}
                                  disabled={isLoading}
                                  title="Oturumu Sil"
                                  className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/40 p-4 rounded-2xl text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed space-y-2">
              <div>
                <p className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-200 text-xs">
                  <Shield size={14} /> Donanımsal Akıllı Eşleştirme Sistemi
                </p>
                <p className="mt-0.5">
                  Bir fiziksel cihazın herhangi bir tarayıcısına (örneğin Chrome) yetki verilmesi, o cihazdaki diğer tüm tarayıcıların (örneğin Firefox, Safari) donanımsal özellikleri sayesinde otomatik olarak güvenli şekilde tanınmasını sağlar. Tarayıcı farklarından ötürü ayrı ayrı onaylama yapmanıza gerek kalmaz.
                </p>
              </div>
              <div className="border-t border-blue-100/40 dark:border-blue-900/20 pt-1.5">
                <p className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-200 text-xs">
                  <Globe size={13} /> IP Adresiyle Güvenli Kimlik Doğrulama
                </p>
                <p className="mt-0.5">
                  Sistem, yetkilendirilmiş cihazların IP adreslerini de kaydeder. Cihazın çerezleri veya yerel depolama alanı tamamen temizlense dahi, yetkilendirilmiş bir IP adresine sahip tanıdık cihazlar güvenli bir şekilde otomatik olarak tespit edilip yetkilendirilir.
                </p>
              </div>
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
