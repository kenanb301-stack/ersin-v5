
import React, { useState } from 'react';
import { X, Lock, Save, KeyRound, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { verifyCredentials, validatePasswordStrength, setAdminPassword } from '../utils/security';
import { saveAppSetting } from '../services/supabase';
import { CloudConfig } from '../types';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudConfig: CloudConfig | null;
}

const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({ isOpen, onClose, cloudConfig }) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
        // 1. Verify Current Password
        const isCurrentCorrect = await verifyCredentials('admin', currentPass);
        if (!isCurrentCorrect) {
            throw new Error("Mevcut şifre hatalı.");
        }

        // 2. Validate New Password
        if (newPass !== confirmPass) {
            throw new Error("Yeni şifreler uyuşmuyor.");
        }

        const strength = validatePasswordStrength(newPass);
        if (!strength.valid) {
            throw new Error(strength.message || "Şifre güvenli değil.");
        }

        // 3. Save Locally (Hash)
        const newHash = await setAdminPassword(newPass);

        // 4. Save to Cloud (if connected)
        if (cloudConfig?.supabaseUrl && cloudConfig?.supabaseKey) {
            const result = await saveAppSetting(
                cloudConfig.supabaseUrl, 
                cloudConfig.supabaseKey, 
                'admin_password_hash', 
                newHash
            );
            if (!result.success) {
                // Non-blocking error warning
                alert("Uyarı: Şifre yerel olarak değiştirildi ancak buluta kaydedilemedi. Bağlantınızı kontrol edin.");
            }
        }

        setSuccess("Yönetici şifresi başarıyla güncellendi.");
        setTimeout(() => {
            onClose();
            // Reset fields
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
            setSuccess('');
        }, 1500);

    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <KeyRound size={20} className="text-blue-600" />
            Yönetici Şifresi Değiştir
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                    <AlertTriangle size={16} className="flex-shrink-0" /> {error}
                </div>
            )}
            
            {success && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-2">
                    <CheckCircle size={16} className="flex-shrink-0" /> {success}
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Mevcut Şifre</label>
                <div className="relative">
                    <input 
                        type={showCurrent ? "text" : "password"} 
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="••••••"
                        required
                    />
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showCurrent ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-700 my-2" />

            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Yeni Şifre</label>
                <div className="relative">
                    <input 
                        type={showNew ? "text" : "password"} 
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all"
                        placeholder="Yeni şifre (min. 6 karakter)"
                        required
                        minLength={6}
                    />
                    <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNew ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Yeni Şifre (Tekrar)</label>
                <div className="relative">
                    <input 
                        type="password" 
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all ${newPass && confirmPass && newPass !== confirmPass ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'}`}
                        placeholder="Yeni şifreyi doğrulayın"
                        required
                    />
                    <CheckCircle size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${newPass && confirmPass && newPass === confirmPass ? 'text-green-500' : 'text-slate-400'}`} />
                </div>
                {newPass && confirmPass && newPass !== confirmPass && <p className="text-xs text-red-500 mt-1">Şifreler uyuşmuyor.</p>}
            </div>

            <button 
                type="submit" 
                disabled={isLoading || !currentPass || !newPass || newPass !== confirmPass}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
            >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Save size={20} />}
                Şifreyi Güncelle
            </button>

            {cloudConfig?.supabaseUrl && (
                <p className="text-[10px] text-center text-slate-400 mt-2">
                    Değişiklik, bulut üzerinden bağlı tüm cihazlarda geçerli olacaktır.
                </p>
            )}
        </form>
      </div>
    </div>
  );
};

export default AdminPasswordModal;
