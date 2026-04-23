
import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Zap, ZapOff, ZoomIn, ZoomOut, AlertTriangle, RefreshCw, Info, Lock } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
  onClose: () => void;
  children?: ReactNode;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomCap, setZoomCap] = useState<{min: number, max: number} | null>(null);
  const [status, setStatus] = useState<string>('Hazırlanıyor...');
  const [isSecureContext, setIsSecureContext] = useState(true);
  
  // Refs for logic lock without re-renders
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(`reader-${Math.random().toString(36).substring(2, 9)}`);
  const isMounted = useRef<boolean>(true);
  const isProcessing = useRef<boolean>(false); // Lock for start/stop operations
  const scanLock = useRef<boolean>(false); // Lock to prevent multiple success triggers

  // --- 1. Audio Feedback ---
  const playBeep = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square'; 
        osc.frequency.setValueAtTime(1500, ctx.currentTime); 
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  // --- 2. Initialize Logic ---
  useEffect(() => {
    isMounted.current = true;
    isProcessing.current = false;
    scanLock.current = false;

    // HTTPS Check
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    if (!isLocal && !isHttps) {
        setIsSecureContext(false);
        setError("Kamera için HTTPS veya Localhost gereklidir.");
        return;
    }

    const startScanner = async (retryCount = 0) => {
        if (!isMounted.current) return;
        if (isProcessing.current) return; // Prevent double init

        const element = document.getElementById(containerId.current);
        if (!element) {
            // DOM not ready, wait slightly
            if(retryCount < 10) setTimeout(() => startScanner(retryCount + 1), 100);
            else setError("Kamera arayüzü oluşturulamadı.");
            return;
        }

        isProcessing.current = true;

        try {
            // Cleanup old instance if exists (Safety)
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        await scannerRef.current.stop();
                    }
                    scannerRef.current.clear();
                } catch (e) { /* ignore cleanup errors */ }
            }

            const html5QrCode = new Html5Qrcode(containerId.current, {
                verbose: false,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.CODE_39,
                ]
            });
            
            scannerRef.current = html5QrCode;

            // Get Cameras
            const cameras = await Html5Qrcode.getCameras().catch(() => {
                throw new Error("Kamera izni verilmedi.");
            });

            if (!cameras || cameras.length === 0) throw new Error("Kamera bulunamadı.");

            // Prefer Back Camera
            let cameraId = cameras[0].id;
            const backCamera = cameras.find(c => 
                c.label.toLowerCase().includes('back') || 
                c.label.toLowerCase().includes('arka') || 
                c.label.toLowerCase().includes('environment')
            );
            if (backCamera) cameraId = backCamera.id;

            if (!isMounted.current) { isProcessing.current = false; return; }

            setStatus(""); 

            await html5QrCode.start(
                cameraId,
                {
                    fps: 15, // Higher FPS for faster scanning
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    disableFlip: false, 
                },
                (decodedText) => {
                    // SUCCESS CALLBACK
                    if (scanLock.current || !isMounted.current) return;
                    
                    scanLock.current = true; // Lock immediately
                    playBeep();
                    
                    // CRITICAL FIX: Do NOT await stop(). Just callback. 
                    // The component unmount will handle the cleanup.
                    // This prevents the "restart" feeling.
                    onScanSuccess(decodedText);
                },
                () => { /* Ignore frame errors */ }
            );

            // Capabilities (Zoom/Torch)
            try {
                const capabilities = html5QrCode.getRunningTrackCameraCapabilities() as any;
                if (capabilities) {
                    if ('torch' in capabilities) setHasTorch(true);
                    if ('zoom' in capabilities) {
                        setZoomCap({ min: capabilities.zoom.min, max: capabilities.zoom.max });
                        setZoom(capabilities.zoom.min);
                    }
                }
            } catch (e) {}

        } catch (err: any) {
            console.error("Scanner Start Error:", err);
            
            // Retry logic for "Camera in use" errors
            if (retryCount < 4 && (err.message?.includes("busy") || err.message?.includes("starting") || err.message?.includes("NotReadableError") || err.name === 'NotAllowedError')) {
                setTimeout(() => {
                    isProcessing.current = false;
                    startScanner(retryCount + 1);
                }, 800);
            } else {
                if (isMounted.current) {
                    setError("Kamera başlatılamadı. İzinleri kontrol edip tekrar deneyin.");
                    setStatus("");
                }
            }
        } finally {
            isProcessing.current = false;
        }
    };

    startScanner();

    // --- 3. Cleanup Logic ---
    return () => {
        isMounted.current = false;
        // Robust cleanup sequence
        if (scannerRef.current) {
            const scanner = scannerRef.current;
            // We don't await here because unmount must be fast.
            // Html5Qrcode handles internal state eventually.
            try {
                scanner.stop().then(() => {
                    try { scanner.clear(); } catch(e){}
                }).catch(() => {
                    try { scanner.clear(); } catch(e){}
                });
            } catch(e) {}
        }
    };
  }, [onScanSuccess]);

  // --- Torch & Zoom Handlers ---
  const toggleTorch = () => {
      if (scannerRef.current && hasTorch) {
          const newStatus = !torchOn;
          scannerRef.current.applyVideoConstraints({ advanced: [{ torch: newStatus }] } as any)
            .then(() => setTorchOn(newStatus))
            .catch(() => {});
      }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = Number(e.target.value);
      setZoom(newZoom);
      if (scannerRef.current) {
          scannerRef.current.applyVideoConstraints({ advanced: [{ zoom: newZoom }] } as any).catch(() => {});
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center touch-none">
      
      {/* ERROR STATE */}
      {error && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 p-6 text-center text-white">
            <div className="bg-red-500/20 p-4 rounded-full mb-4">
                <AlertTriangle size={48} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Kamera Hatası</h3>
            <p className="text-slate-300 mb-6 max-w-xs">{error}</p>
            
            {!isSecureContext && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-200 mb-6 text-left max-w-xs">
                    <div className="flex items-center gap-2 mb-1 font-bold"><Lock size={12}/> Çözüm:</div>
                    <p>Güvenlik nedeniyle kamera sadece <strong>HTTPS</strong> veya <strong>Localhost</strong> üzerinde çalışır.</p>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <button onClick={() => window.location.reload()} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                    <RefreshCw size={18}/> Sayfayı Yenile
                </button>
                <button onClick={onClose} className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold flex items-center justify-center transition-all">
                    İptal Et
                </button>
            </div>
        </div>
      )}

      {/* Top Bar - Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-safe-top flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
        <div className="text-white flex items-center gap-2">
            <Camera className="text-blue-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wider">TARAYICI</span>
        </div>
        <div className="flex gap-4">
            {hasTorch && !error && (
                <button 
                    onClick={toggleTorch}
                    className={`p-2 rounded-full transition-colors ${torchOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'}`}
                >
                    {torchOn ? <Zap size={24} fill="black" /> : <ZapOff size={24} />}
                </button>
            )}
            <button 
                onClick={onClose}
                className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
            >
                <X size={24} />
            </button>
        </div>
      </div>

      {/* Main Scanner Area */}
      <div className="w-full h-full relative flex items-center justify-center bg-black overflow-hidden">
            
            {/* The Random ID Container */}
            <div id={containerId.current} className="w-full h-full"></div>
            
            {/* Status Overlay */}
            {status && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-40 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white text-sm font-medium animate-pulse">{status}</p>
                    </div>
                </div>
            )}

            {/* Default UI if no error and running */}
            {!status && !error && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                    {/* Aim Frame */}
                    <div className="w-64 h-64 border-2 border-white/40 rounded-3xl relative overflow-hidden bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-[scan-vertical_2s_ease-in-out_infinite]"></div>
                        {/* Corners */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                    </div>

                    {/* Zoom Control */}
                    {zoomCap && (
                            <div className="absolute bottom-24 w-64 pointer-events-auto flex items-center gap-3 bg-black/60 p-3 rounded-2xl backdrop-blur-md border border-white/10 z-50">
                            <ZoomOut size={16} className="text-white/70" />
                            <input 
                                type="range" 
                                min={zoomCap.min} 
                                max={zoomCap.max} 
                                step="0.1" 
                                value={zoom} 
                                onChange={handleZoomChange}
                                className="w-full h-1 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                            <ZoomIn size={16} className="text-white/70" />
                            </div>
                    )}
                    
                    <div className="absolute bottom-10 px-6 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
                            <Info size={16} className="text-blue-400" />
                            <span className="text-xs text-white/90">Barkodu karenin içine hizalayın</span>
                    </div>
                </div>
            )}
      </div>
      
      <style>{`
        @keyframes scan-vertical {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        #${containerId.current} video { 
            object-fit: cover !important; 
            width: 100% !important; 
            height: 100% !important; 
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
