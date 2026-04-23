import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { Package, Menu, X, FileSpreadsheet, Moon, Sun, Printer, ScanLine, LogOut, Database as DatabaseIcon, RefreshCw, Loader2, Info, Clock, Home, Activity, FileDown, Shield } from 'lucide-react';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import TransactionHistory from './components/TransactionHistory';
import TransactionModal from './components/TransactionModal';
import ProductModal from './components/ProductModal';
import OrderManagerModal from './components/OrderManagerModal';
import BarcodeScanner from './components/BarcodeScanner';
import Login from './components/Login';
import DataBackupModal from './components/DataBackupModal';
import CloudSetupModal from './components/CloudSetupModal';
import CycleCountModal from './components/CycleCountModal'; 
import ProductDetailModal from './components/ProductDetailModal';
import OrderReconciliationModal from './components/OrderReconciliationModal';
import AutoExportModal from './components/AutoExportModal'; 
import InstallPrompt from './components/InstallPrompt'; 
import BarcodePrinterModal from './components/BarcodePrinterModal';
import SecuritySettingsModal from './components/SecuritySettingsModal';
import { saveToSupabase, loadFromSupabase } from './services/supabase';
import { generateAndDownloadExcel } from './utils/excelExport'; 
import { INITIAL_PRODUCTS, INITIAL_TRANSACTIONS } from './constants';
import { Product, Transaction, TransactionType, ViewState, User, CloudConfig, Order, CycleCount } from './types';

const Analytics = lazy(() => import('./components/Analytics'));

const generateId = () => Math.random().toString(36).substring(2, 11);
const generateShortId = () => Math.floor(100000 + Math.random() * 900000).toString();

const APP_VERSION = "4.6.0 (Final-Stable)";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const sessionUser = sessionStorage.getItem('depopro_user_session');
    if (sessionUser) return JSON.parse(sessionUser);
    const rememberedUser = localStorage.getItem('depopro_remembered_user');
    return rememberedUser ? JSON.parse(rememberedUser) : null;
  });

  const handleLogin = (user: User, remember: boolean) => {
    setCurrentUser(user);
    if (remember) localStorage.setItem('depopro_remembered_user', JSON.stringify(user));
    sessionStorage.setItem('depopro_user_session', JSON.stringify(user));
  };

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('depopro_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch (e) { return INITIAL_PRODUCTS; }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('depopro_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch (e) { return INITIAL_TRANSACTIONS; }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
      try {
          const saved = localStorage.getItem('depopro_orders');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  const [countHistory, setCountHistory] = useState<CycleCount[]>(() => {
      try {
          const saved = localStorage.getItem('depopro_count_history');
          return saved ? JSON.parse(saved) : [];
      } catch (e) { return []; }
  });

  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(() => {
      const saved = localStorage.getItem('depopro_cloud_config');
      return saved ? JSON.parse(saved) : null;
  });

  const [isAutoExportEnabled, setIsAutoExportEnabled] = useState(() => {
      return localStorage.getItem('depopro_auto_export_enabled') === 'true';
  });

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // THEME MANAGEMENT FIXED
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Auto-sync on mount
  useEffect(() => {
    if (currentUser && cloudConfig?.supabaseUrl && cloudConfig?.supabaseKey) {
        handleCloudSync(true);
    }
  }, [currentUser]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.IN);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [preSelectedBarcode, setPreSelectedBarcode] = useState<string>('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); 
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<'TRANSACTION' | 'PRODUCT'>('TRANSACTION');
  const [isOrderManagerOpen, setIsOrderManagerOpen] = useState(false);
  const [isBarcodePrinterOpen, setIsBarcodePrinterOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  const [isCloudSetupOpen, setIsCloudSetupOpen] = useState(false);
  const [isCycleCountOpen, setIsCycleCountOpen] = useState(false);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);
  const [isAutoExportModalOpen, setIsAutoExportModalOpen] = useState(false); 
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // URL Setup Handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setupStr = params.get('setup');
    if (setupStr) {
      try {
        const decoded = atob(setupStr);
        const config = JSON.parse(decoded);
        if (config.supabaseUrl && config.supabaseKey) {
            localStorage.setItem('depopro_cloud_config', JSON.stringify({
                supabaseUrl: config.supabaseUrl,
                supabaseKey: config.supabaseKey
            }));
            if (config.restrictedMode) localStorage.setItem('depopro_device_restriction', 'true');
            if (config.autoLogin) {
                 const autoUser = { username: 'user', name: 'İzleyici (Oto)', role: 'VIEWER' };
                 sessionStorage.setItem('depopro_user_session', JSON.stringify(autoUser));
                 setCurrentUser(autoUser as any);
            }
            window.location.href = window.location.pathname; 
        }
      } catch (e) { console.error("Auto setup failed", e); }
    }
  }, []);

  const saveData = useCallback((newProducts: Product[], newTransactions: Transaction[], newOrders?: Order[], silent: boolean = false) => {
      setProducts(newProducts);
      setTransactions(newTransactions);
      if (newOrders) setOrders(newOrders);
      localStorage.setItem('depopro_products', JSON.stringify(newProducts));
      localStorage.setItem('depopro_transactions', JSON.stringify(newTransactions));
      if (newOrders) localStorage.setItem('depopro_orders', JSON.stringify(newOrders));
      if (cloudConfig?.supabaseUrl && !silent) {
          saveToSupabase(cloudConfig.supabaseUrl, cloudConfig.supabaseKey, newProducts, newTransactions, newOrders || orders);
      }
  }, [cloudConfig, orders]);

  const handleCloudSync = async (silent: boolean = false) => {
    if (!cloudConfig?.supabaseUrl || !cloudConfig?.supabaseKey) {
        if (!silent) setIsCloudSetupOpen(true);
        return;
    }
    setIsSyncing(true);
    try {
        const result = await loadFromSupabase(cloudConfig.supabaseUrl, cloudConfig.supabaseKey);
        if (result.success && result.data) {
            setProducts(result.data.products);
            setTransactions(result.data.transactions);
            setOrders(result.data.orders);
            localStorage.setItem('depopro_products', JSON.stringify(result.data.products));
            localStorage.setItem('depopro_transactions', JSON.stringify(result.data.transactions));
            localStorage.setItem('depopro_orders', JSON.stringify(result.data.orders));
            if (!silent) alert("✅ Veriler buluttan güncellendi.");
        }
    } catch (e) {
        if (!silent) alert("Bağlantı hatası.");
    } finally {
        setIsSyncing(false);
    }
  };

  const handleLogout = () => { 
      setCurrentUser(null); 
      sessionStorage.removeItem('depopro_user_session');
      localStorage.removeItem('depopro_remembered_user');
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Özet', icon: Home },
    { id: 'INVENTORY', label: 'Stok', icon: Package },
    { id: 'SCAN', label: 'Oku', icon: ScanLine, isPrimary: true },
    { id: 'ANALYTICS', label: 'Analiz', icon: Activity }, 
    { id: 'HISTORY', label: 'Geçmiş', icon: Clock },
  ];

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const MinimalSettingsBar = () => (
    <div className="flex items-center justify-around gap-1 w-full bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
      <button onClick={handleCloudSync} disabled={isSyncing} title="Senkronize Et" className="p-2 rounded-xl text-emerald-500 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm">
        <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''}/>
      </button>
      <button onClick={toggleDarkMode} title="Görünüm Değiştir" className="p-2 rounded-xl text-amber-500 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm">
        {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
      </button>
      {currentUser.role === 'ADMIN' && (
        <>
          <button onClick={() => setIsSecurityModalOpen(true)} title="Güvenlik Merkezi" className="p-2 rounded-xl text-amber-600 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm"><Shield size={20}/></button>
          <button onClick={() => setIsCloudSetupOpen(true)} title="Bulut Ayarları" className="p-2 rounded-xl text-indigo-500 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm"><DatabaseIcon size={20}/></button>
          <button onClick={() => setIsAutoExportModalOpen(true)} title="Otomatik Excel" className="p-2 rounded-xl text-blue-500 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm"><FileSpreadsheet size={20}/></button>
          <button onClick={() => setIsDataBackupOpen(true)} title="Veri Yönetimi" className="p-2 rounded-xl text-rose-500 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm"><FileDown size={20}/></button>
        </>
      )}
    </div>
  );

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300 overflow-hidden">
      
      {isGlobalScannerOpen && (
          <BarcodeScanner 
            onScanSuccess={(code) => {
                setIsGlobalScannerOpen(false);
                const product = products.find(p => String(p.short_id) === code.trim() || p.barcode === code.trim() || p.part_code === code.trim());
                if (product) {
                    if (confirm(`Ürün: ${product.product_name}\n\nTamam: İşlem Yap | İptal: Detay`)) {
                        setPreSelectedBarcode(code);
                        setModalType(TransactionType.IN);
                        setIsModalOpen(true);
                    } else {
                        setDetailProductId(product.id);
                        setIsProductDetailOpen(true);
                    }
                }
            }}
            onClose={() => setIsGlobalScannerOpen(false)}
          />
      )}

      {/* --- MOBILE SIDEBAR --- */}
      {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileSidebarOpen(false)}>
              <div className="w-72 h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col p-6 animate-slide-in-left" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="font-bold text-blue-600 flex items-center gap-2"><Package size={24}/> Omaks Depo</h2>
                      <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1 text-slate-400"><X/></button>
                  </div>
                  <div className="flex-1"><MinimalSettingsBar /></div>
                  <button onClick={handleLogout} className="mt-auto flex items-center gap-3 p-4 text-red-600 font-bold border-t dark:border-slate-800"><LogOut size={20}/> Çıkış</button>
              </div>
          </div>
      )}

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full z-40 transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2"><Package size={26} /><span className="dark:text-white text-slate-800">Omaks Depo</span></h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">v{APP_VERSION}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            {navItems.filter(i => !i.isPrimary).map(item => (
                <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as ViewState)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        currentView === item.id 
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                    <item.icon size={20} />
                    {item.label}
                </button>
            ))}
        </nav>
        <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
             <MinimalSettingsBar />
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-500 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><LogOut size={18}/> Oturumu Kapat</button>
        </div>
      </aside>

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden fixed top-0 w-full z-[55] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-between items-center shadow-sm">
          <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 dark:text-slate-300"><Menu size={26} /></button>
          <div className="flex items-center gap-2"><Package className="text-blue-600" size={24} /><h1 className="text-lg font-bold dark:text-white">Omaks Depo</h1></div>
          <button onClick={handleCloudSync} disabled={isSyncing} className={`p-2 rounded-lg transition-all ${isSyncing ? 'text-blue-500' : 'text-emerald-500'}`}><RefreshCw size={22} className={isSyncing ? 'animate-spin' : ''} /></button>
      </div>

      <main className="flex-1 overflow-y-auto mt-14 md:mt-0 pb-20 md:pb-8">
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500"/></div>}>
            <div className="max-w-5xl mx-auto p-4 md:p-8">
                {currentView === 'DASHBOARD' && (
                    <Dashboard 
                        products={products} transactions={transactions} currentUser={currentUser}
                        onQuickAction={(type) => { setModalType(type); setIsModalOpen(true); }}
                        onProductClick={() => setCurrentView('INVENTORY')}
                        onBulkTransaction={() => setIsBulkModalOpen(true)}
                        onViewNegativeStock={() => setCurrentView('NEGATIVE_STOCK')}
                        onOrderManager={() => setIsOrderManagerOpen(true)}
                        onScan={() => setIsGlobalScannerOpen(true)}
                        onReportSent={(ids) => {
                            const updated = products.map(p => ids.includes(p.id) ? { ...p, last_alert_sent_at: new Date().toISOString() } : p);
                            saveData(updated, transactions, orders);
                        }}
                        onOpenProductDetail={() => setIsProductDetailOpen(true)}
                        onAddProduct={() => setIsProductModalOpen(true)}
                        onCycleCount={() => setIsCycleCountOpen(true)} 
                        onOrderReconciliation={() => setIsReconciliationOpen(true)} 
                    />
                )}
                {currentView === 'ANALYTICS' && <Analytics products={products} transactions={transactions} />}
                {currentView === 'INVENTORY' && (
                    <InventoryList 
                        products={products} currentUser={currentUser}
                        onDelete={(id) => saveData(products.filter(p => p.id !== id), transactions, orders)}
                        onEdit={(p) => { setEditingProduct(p); setIsProductModalOpen(true); }}
                        onProductClick={(p) => { setDetailProductId(p.id); setIsProductDetailOpen(true); }}
                        onAddProduct={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                        onBulkAdd={() => { setBulkModalMode('PRODUCT'); setIsBulkModalOpen(true); }}
                        onPrintBarcodes={() => setIsBarcodePrinterOpen(true)}
                    />
                )}
                {currentView === 'HISTORY' && (
                    <TransactionHistory 
                        transactions={transactions} products={products} currentUser={currentUser}
                        onEdit={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
                        onDelete={(id) => {
                             const tx = transactions.find(t => t.id === id);
                             if(tx) {
                                const upProds = products.map(p => p.id === tx.product_id ? {...p, current_stock: p.current_stock - (tx.type === 'IN' ? tx.quantity : -tx.quantity)} : p);
                                saveData(upProds, transactions.filter(t => t.id !== id), orders);
                             }
                        }}
                    />
                )}
            </div>
        </Suspense>
      </main>

      {/* --- MOBILE NAV --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 flex items-center justify-around z-[60] h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { if (item.id === 'SCAN') setIsGlobalScannerOpen(true); else setCurrentView(item.id as ViewState); }}
                className={`flex flex-col items-center justify-center p-2 transition-all ${
                    item.isPrimary 
                    ? 'bg-blue-600 text-white -mt-10 w-14 h-14 rounded-full shadow-xl shadow-blue-500/30 active:scale-90 border-4 border-slate-50 dark:border-slate-950' 
                    : currentView === item.id ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                  <item.icon size={item.isPrimary ? 28 : 24} />
                  {!item.isPrimary && <span className="text-[10px] font-bold mt-0.5">{item.label}</span>}
              </button>
          ))}
      </nav>

      <CloudSetupModal 
        isOpen={isCloudSetupOpen} onClose={() => setIsCloudSetupOpen(false)} 
        onSave={(url, key) => { setCloudConfig({ supabaseUrl: url, supabaseKey: key }); localStorage.setItem('depopro_cloud_config', JSON.stringify({ supabaseUrl: url, supabaseKey: key })); window.location.reload(); }}
        currentConfig={cloudConfig}
      />
      <AutoExportModal 
        isOpen={isAutoExportModalOpen} onClose={() => setIsAutoExportModalOpen(false)} 
        products={products} transactions={transactions} isAutoExportEnabled={isAutoExportEnabled}
        onToggleAutoExport={(val) => { setIsAutoExportEnabled(val); localStorage.setItem('depopro_auto_export_enabled', String(val)); }}
      />
      <BarcodePrinterModal isOpen={isBarcodePrinterOpen} onClose={() => setIsBarcodePrinterOpen(false)} products={products} />
      <CycleCountModal
          isOpen={isCycleCountOpen} onClose={() => setIsCycleCountOpen(false)} products={products} history={countHistory}
          onCompleteSession={(summary) => {
              const newCount = { ...summary, id: generateId(), date: new Date().toISOString(), created_by: currentUser.name };
              const updated = [newCount, ...countHistory];
              setCountHistory(updated);
              localStorage.setItem('depopro_count_history', JSON.stringify(updated));
          }}
          onSubmitCount={(pid, qty) => {
              const product = products.find(p => p.id === pid);
              if (!product) return;
              const diff = qty - product.current_stock;
              const now = new Date().toISOString();
              const updatedProducts = products.map(p => p.id === pid ? { ...p, current_stock: qty, last_counted_at: now } : p);
              let updatedTransactions = [...transactions];
              if (diff !== 0) {
                  updatedTransactions = [{
                      id: `t-${generateId()}`, product_id: pid, product_name: product.product_name, type: TransactionType.CORRECTION, quantity: Math.abs(diff), date: now, description: `SAYIM: ${diff > 0 ? '+' : ''}${diff}`, created_by: currentUser.name, previous_stock: product.current_stock, new_stock: qty
                  }, ...transactions];
              }
              saveData(updatedProducts, updatedTransactions, orders);
          }}
      />
      <TransactionModal 
          isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
          initialType={modalType} products={products} transactionToEdit={editingTransaction} defaultBarcode={preSelectedBarcode} orders={orders}
          onSubmit={(data) => {
              const prod = products.find(p => p.id === data.productId);
              if(prod) {
                  const change = data.type === 'IN' ? data.quantity : -data.quantity;
                  const newStock = prod.current_stock + change;
                  const newTx: Transaction = { id: data.id || `t-${generateId()}`, product_id: data.productId, product_name: prod.product_name, type: data.type, quantity: data.quantity, date: new Date().toISOString(), description: data.description, created_by: currentUser.name, previous_stock: prod.current_stock, new_stock: newStock };
                  const upProds = products.map(p => p.id === data.productId ? {...p, current_stock: newStock} : p);
                  const upTx = data.id ? transactions.map(t => t.id === data.id ? newTx : t) : [newTx, ...transactions];
                  saveData(upProds, upTx, orders);
                  setIsModalOpen(false);
              }
          }}
      />
      <ProductModal
          isOpen={isProductModalOpen} onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
          products={products} productToEdit={editingProduct}
          onSubmit={(data) => {
              if (editingProduct) saveData(products.map(p => p.id === editingProduct.id ? { ...p, ...data } : p), transactions, orders);
              else saveData([...products, { ...data, id: `p-${generateId()}`, short_id: generateShortId(), created_at: new Date().toISOString() }], transactions, orders);
          }}
      />
      <ProductDetailModal isOpen={isProductDetailOpen} onClose={() => setIsProductDetailOpen(false)} products={products} transactions={transactions} initialProductId={detailProductId || undefined} />
      <DataBackupModal isOpen={isDataBackupOpen} onClose={() => setIsDataBackupOpen(false)} onBackup={() => generateAndDownloadExcel(products, transactions, 'Depo_Yedek')} onRestore={async (file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target?.result as string);
                    if (data.products) { setProducts(data.products); setTransactions(data.transactions || []); alert("Veriler yüklendi."); window.location.reload(); }
                } catch(err) { alert("Format hatası."); }
            };
            reader.readAsText(file);
        }} />
      <OrderManagerModal isOpen={isOrderManagerOpen} onClose={() => setIsOrderManagerOpen(false)} products={products} orders={orders} onSaveOrder={(newOrder) => saveData(products, transactions, [...orders, newOrder])} onDeleteOrder={(id) => saveData(products, transactions, orders.filter(o => o.id !== id))} onUpdateOrderStatus={(id, s) => saveData(products, transactions, orders.map(o => o.id === id ? {...o, status: s} : o))} onUpdateOrderProgress={(id, picked) => saveData(products, transactions, orders.map(o => o.id === id ? {...o, picked_items: picked} : o), true)} currentUser={currentUser} />
      <SecuritySettingsModal isOpen={isSecurityModalOpen} onClose={() => setIsSecurityModalOpen(false)} cloudConfig={cloudConfig} />
      <InstallPrompt />
    </div>
  );
}
export default App;