
import React, { useState, useEffect } from 'react';
import { Package, ShieldCheck, Eye, ArrowRight, AlertTriangle, Lock, Cloud, Wifi, WifiOff, CheckCircle, ScanLine } from 'lucide-react';
import { User as UserType } from '../types';
import { verifyCredentials } from '../utils/security';
import { loadAppSettings, registerDevice } from '../services/supabase';
import { getDeviceId, getDeviceName } from '../utils/device';

interface LoginProps {
  onLogin: (user: UserType, remember: boolean) => void;
  onQuickScan?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onQuickScan }) => {
  const [mode, setMode] = useState<'ADMIN' | 'VIEWER'>('ADMIN');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'CHECKING' | 'SYNCED' | 'OFFLINE'>('IDLE');
  const [deviceId] = useState(getDeviceId());

  // Device Restriction Check
  const isRestrictedDevice = localStorage.getItem('depopro_device_restriction') === 'true';

  useEffect(() => {
      // If restricted device, force viewer mode
      if (isRestrictedDevice) {
          setMode('VIEWER');
      }
  }, [isRestrictedDevice]);

  // Attempt to sync password hash from cloud on mount or mode change to Admin
  useEffect(() => {
      const syncPassword = async () => {
          if (mode !== 'ADMIN') return;
          
          const cloudConfigStr = localStorage.getItem('depopro_cloud_config');
          if (!cloudConfigStr) {
              setSyncStatus('OFFLINE');
              return;
          }

          try {
              setSyncStatus('CHECKING');
              const config = JSON.parse(cloudConfigStr);
              if (config.supabaseUrl && config.supabaseKey) {
                  const result = await loadAppSettings(config.supabaseUrl, config.supabaseKey);
                  if (result.success && result.data && result.data['admin_password_hash']) {
                      // Update local hash silently
                      const cloudHash = result.data['admin_password_hash'];
                      const localHash = localStorage.getItem('depopro_admin_hash');
                      
                      if (cloudHash !== localHash) {
                          localStorage.setItem('depopro_admin_hash', cloudHash);
                      }
                      setSyncStatus('SYNCED');
                  } else {
                      setSyncStatus('OFFLINE'); // Connected but no hash found
                  }
              }
          } catch (e) {
              setSyncStatus('OFFLINE');
          }
      };

      if (mode === 'ADMIN') {
          syncPassword();
      }
  }, [mode]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRestrictedDevice) {
        setError("⛔ Bu cihaz Kısıtlı Moddadır. Yönetici girişi yapılamaz.");
        return;
    }

    setError('');
    setIsLoading(true);

    try {
        const cloudConfigStr = localStorage.getItem('depopro_cloud_config');
        const cloudConfig = cloudConfigStr ? JSON.parse(cloudConfigStr) : null;

        // Proactively register/update device info so it appears in the admin panel
        if (cloudConfig) {
            await registerDevice(cloudConfig.supabaseUrl, cloudConfig.supabaseKey, deviceId, getDeviceName());
        }

        // Verify with device and cloud support
        const res = await verifyCredentials('admin', password, cloudConfig);

        if (res.success) {
            const user: UserType = { username: 'admin', name: 'Depo Sorumlusu', role: 'ADMIN' };
            onLogin(user, rememberMe);
        } else {
            setError(res.message || 'Hatalı şifre!');
        }
    } catch (err) {
        setError('Giriş işlemi sırasında hata oluştu.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleViewerLogin = async () => {
      setIsLoading(true);
      await new Promise(r => setTimeout(r, 600)); // UX delay
      const user: UserType = { username: 'user', name: 'İzleyici', role: 'VIEWER' };
      onLogin(user, rememberMe);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 overflow-hidden">
      
      {/* Left Side - Hero / Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-blue-600 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center mix-blend-overlay"></div>
          
          <div className="relative z-10 w-full h-full flex flex-col justify-between p-16 text-white">
              <div className="flex items-center gap-3">
                   <div className="bg-white p-1 rounded-xl shadow-lg">
                        <img src="/logo.svg?v=4" className="w-10 h-10 object-contain" alt="Logo" />
                   </div>
                   <span className="text-2xl font-bold tracking-tight">Omaks Depo</span>
              </div>
              
              <div>
                  <h1 className="text-5xl font-bold mb-6 leading-tight">Akıllı Stok Yönetim Sistemi</h1>
                  <p className="text-lg text-blue-100 max-w-md">Depo hareketlerinizi, siparişlerinizi ve envanterinizi tek bir yerden güvenle yönetin.</p>
              </div>

              <div className="flex gap-8 text-sm text-blue-200 font-medium">
                  <div className="flex items-center gap-2">
                      <ShieldCheck size={18} /> Güvenli Altyapı
                  </div>
                  <div className="flex items-center gap-2">
                      <Cloud size={18} /> Bulut Senkronize
                  </div>
              </div>
          </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 relative">
        <div className="w-full max-w-md animate-fade-in-up">
            
            <div className="lg:hidden text-center mb-8">
                 <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4 p-2">
                    <img src="/logo.svg?v=4" className="w-full h-full object-contain" alt="Logo" />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Omaks Depo</h2>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 md:p-10 relative overflow-hidden">
                
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Hoşgeldiniz</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Devam etmek için giriş yöntemini seçin.</p>
                    
                    {onQuickScan && (
                        <button 
                            onClick={onQuickScan}
                            className="w-full py-4 mb-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-slate-700/50 shadow-lg"
                        >
                            <ScanLine size={24} className="text-blue-400" />
                            Hızlı Barkod Sorgula
                        </button>
                    )}
                </div>

                {/* MODE TABS */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl mb-6">
                    <button 
                        onClick={() => setMode('ADMIN')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${mode === 'ADMIN' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        disabled={isRestrictedDevice}
                    >
                        <ShieldCheck size={16} /> Yönetici
                    </button>
                    <button 
                        onClick={() => setMode('VIEWER')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${mode === 'VIEWER' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                    >
                        <Eye size={16} /> İzleyici
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-3 border border-red-100 dark:border-red-900/30">
                        <AlertTriangle size={18} className="flex-shrink-0"/>
                        {error}
                    </div>
                )}

                {/* ADMIN LOGIN FORM */}
                {mode === 'ADMIN' && (
                    <form onSubmit={handleAdminLogin} className="space-y-5 animate-fade-in">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 ml-1">Yönetici Şifresi</label>
                                {syncStatus === 'SYNCED' ? (
                                    <span className="text-[10px] text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full"><Wifi size={10}/> Bulut Güncel</span>
                                ) : (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1"><WifiOff size={10}/> Yerel Kayıt</span>
                                )}
                            </div>
                            <div className="relative group">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                                {rememberMe && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-300 select-none">Beni Hatırla</span>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !password}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Yönetici Olarak Gir <ArrowRight size={20} /></>
                            )}
                        </button>
                    </form>
                )}

                {/* VIEWER LOGIN */}
                {mode === 'VIEWER' && (
                    <div className="space-y-6 animate-fade-in text-center py-4">
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Eye size={40} />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 px-4">
                            İzleyici modunda stokları görüntüleyebilir ve arama yapabilirsiniz, ancak değişiklik yapamazsınız.
                        </p>
                        
                        <div className="flex items-center justify-center gap-2 cursor-pointer mb-4" onClick={() => setRememberMe(!rememberMe)}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'}`}>
                                {rememberMe && <CheckCircle size={14} className="text-white" />}
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-300 select-none">Beni Hatırla</span>
                        </div>

                        <button
                            onClick={handleViewerLogin}
                            disabled={isLoading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>İzlemeye Başla <ArrowRight size={20} /></>
                            )}
                        </button>
                    </div>
                )}

                {isRestrictedDevice && mode === 'ADMIN' && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-200 text-xs font-medium">
                        <Lock size={16} />
                        <span>Kısıtlı Mod: Bu cihazda yönetici girişi engellenmiştir.</span>
                    </div>
                )}
            </div>
            
            <p className="text-center text-xs text-slate-400 mt-6">
                &copy; {new Date().getFullYear()} Omaks Depo Yönetim Sistemi
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
