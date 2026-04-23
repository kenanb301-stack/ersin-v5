
import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show IOS prompt after a delay if not standalone
    if (isIosDevice && !isStandalone) {
        setTimeout(() => setIsVisible(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[200] animate-fade-in-up">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row items-center gap-4 relative overflow-hidden">
        
        {/* Background Decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
        >
            <X size={16} />
        </button>

        <div className="flex items-center gap-4 w-full">
            {/* LOGO DISPLAY */}
            <div className="w-14 h-14 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center flex-shrink-0">
                <img src="logo.svg?v=2" alt="Omaks Logo" className="w-10 h-10 object-contain" />
            </div>

            <div className="flex-1 min-w-0 text-left">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Omaks Depo</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {isIOS 
                        ? "Hızlı erişim için Ana Ekrana Ekleyin." 
                        : "Daha hızlı ve çevrimdışı kullanım için uygulamayı yükleyin."}
                </p>
            </div>
        </div>

        {isIOS ? (
            <div className="w-full sm:w-auto bg-slate-100 dark:bg-slate-700/50 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-1 font-bold">
                    <Share size={14} /> butonuna basın
                </div>
                <div>ve <strong>"Ana Ekrana Ekle"</strong> seçeneğini kullanın.</div>
            </div>
        ) : (
            <button 
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-transform active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
            >
                <Download size={18} />
                Yükle
            </button>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;
