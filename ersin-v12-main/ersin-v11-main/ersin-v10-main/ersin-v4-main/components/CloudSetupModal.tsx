
import React, { useState } from 'react';
import { X, Database, Copy, CheckCircle, ShieldCheck, Zap, Loader2, AlertTriangle, Share2, QrCode } from 'lucide-react';
import { CloudConfig } from '../types';
import { testConnection } from '../services/supabase';
import { sanitizeInput } from '../utils/security';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string, key: string) => void;
  currentConfig: CloudConfig | null;
}

const CloudSetupModal: React.FC<CloudSetupModalProps> = ({ isOpen, onClose, onSave, currentConfig }) => {
  const [activeTab, setActiveTab] = useState<'SETUP' | 'SHARE'>('SETUP');
  
  const [url, setUrl] = useState(currentConfig?.supabaseUrl || '');
  const [apiKey, setApiKey] = useState(currentConfig?.supabaseKey || '');
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
      setIsTesting(true);
      const result = await testConnection(url.trim(), apiKey.trim());
      setIsTesting(false);
      setTestResult(result);
  };

  const sqlCode = `
-- 1. TABLOLARI OLUŞTUR
create table if not exists products (
  id text primary key,
  product_name text,
  part_code text,
  location text,
  material text,
  min_stock_level numeric,
  unit text,
  current_stock numeric,
  barcode text,
  short_id text,
  created_at text,
  last_counted_at text,
  updated_at timestamp with time zone default now()
);

create table if not exists transactions (
  id text primary key,
  product_id text,
  product_name text,
  type text,
  quantity numeric,
  date text,
  description text,
  created_by text,
  previous_stock numeric,
  new_stock numeric,
  updated_at timestamp with time zone default now()
);

create table if not exists orders (
  id text primary key,
  name text,
  status text,
  created_at text,
  items jsonb,
  picked_items jsonb,
  note text,
  updated_at timestamp with time zone default now()
);

create table if not exists cycle_counts (
  id text primary key,
  date text,
  location text,
  total_items numeric,
  correct_items numeric,
  accuracy numeric,
  created_by text,
  updated_at timestamp with time zone default now()
);

create table if not exists app_settings (
  key text primary key,
  value text
);

-- 2. GÜVENLİK (RLS)
alter table products enable row level security;
alter table transactions enable row level security;
alter table orders enable row level security;
alter table cycle_counts enable row level security;
alter table app_settings enable row level security;

-- Politikaları Temizle ve Yeniden Oluştur
drop policy if exists "Public Access Products" on products;
drop policy if exists "Public Access Transactions" on transactions;
drop policy if exists "Public Access Orders" on orders;
drop policy if exists "Public Access Counts" on cycle_counts;
drop policy if exists "Public Access Settings" on app_settings;

create policy "Public Access Products" on products for all using (true) with check (true);
create policy "Public Access Transactions" on transactions for all using (true) with check (true);
create policy "Public Access Orders" on orders for all using (true) with check (true);
create policy "Public Access Counts" on cycle_counts for all using (true) with check (true);
create policy "Public Access Settings" on app_settings for all using (true) with check (true);
  `.trim();

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWrapper = () => {
      onSave(sanitizeInput(url), apiKey.trim()); 
      onClose();
  }

  const generateShareLink = () => {
      if (!currentConfig?.supabaseUrl || !currentConfig?.supabaseKey) return null;
      const configPayload = JSON.stringify({
          supabaseUrl: currentConfig.supabaseUrl,
          supabaseKey: currentConfig.supabaseKey,
          restrictedMode: true, 
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
            <Database size={24} className="text-green-600" /> Bulut Kurulumu (Supabase)
          </h2>
          <button onClick={onClose}><X size={24} className="text-slate-400" /></button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button onClick={() => setActiveTab('SETUP')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'SETUP' ? 'border-green-600 text-green-700 bg-green-50 dark:bg-green-900/10' : 'text-slate-500'}`}><Database size={16}/> Bağlantı Ayarları</button>
            <button onClick={() => setActiveTab('SHARE')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'SHARE' ? 'border-blue-600 text-blue-700 bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500'}`}><Share2 size={16}/> İzleyici İçin Paylaş</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'SETUP' && (
                <>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <h3 className="font-bold text-indigo-800 dark:text-indigo-300 text-sm mb-2 flex items-center gap-2"><ShieldCheck size={16}/> Veri Güvenliği & Tablolar</h3>
                    <p className="text-xs text-indigo-700 dark:text-indigo-200">Aşağıdaki SQL kodunu Supabase panelindeki "SQL Editor" bölümünde bir kez çalıştırın.</p>
                </div>
                <div className="relative bg-slate-900 rounded-lg p-3 group border border-slate-700">
                    <pre className="text-[10px] font-mono text-green-400 overflow-x-auto h-48 whitespace-pre-wrap">{sqlCode}</pre>
                    <button onClick={() => handleCopy(sqlCode)} className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded">{copied ? <CheckCircle size={16} /> : <Copy size={16} />}</button>
                </div>
                <div className="space-y-4">
                    <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Supabase URL" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white font-mono text-sm" />
                    <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Supabase API Key" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white font-mono text-sm" />
                </div>
                {testResult && <div className={`p-3 rounded text-sm font-bold ${testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{testResult.message}</div>}
                <div className="flex gap-3">
                    <button onClick={handleTest} disabled={isTesting || !url || !apiKey} className="px-4 py-3 bg-slate-100 rounded font-bold text-slate-700 flex items-center gap-2 disabled:opacity-50">{isTesting ? <Loader2 className="animate-spin"/> : <Zap/>} Test Et</button>
                    <button onClick={handleSaveWrapper} disabled={!url || !apiKey} className="flex-1 bg-green-600 text-white rounded font-bold shadow-lg disabled:bg-slate-400">Kaydet</button>
                </div>
                </>
            )}
            {activeTab === 'SHARE' && (
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                    {shareLink && (
                        <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareLink)}`} alt="QR" className="w-48 h-48" />
                            <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-mono break-all">{shareLink}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
export default CloudSetupModal;
