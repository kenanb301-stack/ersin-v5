import React, { useState } from 'react';
import { AlertTriangle, ArrowRightLeft, CloudOff, Download, Mail, ScanLine, ClipboardList, Info, ChevronDown, ChevronUp, FileSpreadsheet, PackagePlus, ClipboardCheck, Clipboard, Settings, Database, Cloud, RefreshCw, FileDown, Sun, Moon, ShieldCheck } from 'lucide-react';
import { Product, Transaction, TransactionType, User } from '../types';
import { generateAndDownloadExcel } from '../utils/excelExport';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
  onQuickAction: (type: TransactionType) => void;
  onProductClick: (product: Product) => void;
  onBulkTransaction: () => void; 
  onViewNegativeStock: () => void;
  onOrderManager: () => void;
  onScan: () => void;
  onReportSent: (productIds: string[]) => void;
  onOpenProductDetail: () => void;
  onAddProduct: () => void; 
  onCycleCount?: () => void; 
  onOrderReconciliation?: () => void; 
  onOpenCloudSetup?: () => void;
  onOpenAutoExport?: () => void;
  onOpenBackup?: () => void;
  currentUser: User;
  isCloudEnabled?: boolean;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    products, transactions, onQuickAction, onProductClick, onBulkTransaction, 
    onViewNegativeStock, onOrderManager, onScan, onReportSent, onOpenProductDetail, 
    onAddProduct, onCycleCount, onOrderReconciliation, 
    currentUser
}) => {
  const [showAllCritical, setShowAllCritical] = useState(false);
  
  const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock_level && p.current_stock >= 0);
  const negativeStockProducts = products.filter(p => p.current_stock < 0);
  
  const transactionsThisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6 pb-4 md:pb-8">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Toplam Stok</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{products.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Aylık Hareket</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{transactionsThisMonth}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] text-amber-500 uppercase font-bold tracking-wider">Kritik Stok</p>
            <h3 className={`text-2xl font-black mt-1 ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-800 dark:text-white'}`}>{lowStockProducts.length}</h3>
        </div>
        <div onClick={onViewNegativeStock} className={`p-4 rounded-xl shadow-sm border cursor-pointer ${negativeStockProducts.length > 0 ? 'bg-red-50 border-red-100 dark:bg-red-900/20' : 'bg-white border-slate-100 dark:bg-slate-800'}`}>
            <p className={`text-[10px] uppercase font-bold tracking-wider ${negativeStockProducts.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>Eksi Bakiye</p>
            <h3 className={`text-2xl font-black mt-1 ${negativeStockProducts.length > 0 ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>{negativeStockProducts.length}</h3>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Yönetim Araçları</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3">
        <button onClick={onScan} className="flex flex-col items-center justify-center p-3 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 aspect-square">
          <ScanLine size={26} className="mb-1" />
          <span className="text-[10px] font-bold">QR TARA</span>
        </button>

        {currentUser.role === 'ADMIN' && (
             <button onClick={() => onQuickAction(TransactionType.IN)} className="flex flex-col items-center justify-center p-3 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-95 aspect-square text-center">
                <ArrowRightLeft size={26} className="mb-1" />
                <span className="text-[10px] font-bold leading-tight uppercase">İŞLEM</span>
            </button>
        )}
        
        <button onClick={onOpenProductDetail} className="flex flex-col items-center justify-center p-3 bg-purple-600 text-white rounded-2xl shadow-lg active:scale-95 aspect-square text-center">
            <Info size={26} className="mb-1" />
            <span className="text-[10px] font-bold leading-tight uppercase">SORGULA</span>
        </button>

        <button onClick={onOrderManager} className="flex flex-col items-center justify-center p-3 bg-orange-500 text-white rounded-2xl shadow-lg active:scale-95 aspect-square text-center">
          <ClipboardList size={26} className="mb-1" />
          <span className="text-[10px] font-bold leading-tight uppercase">SİPARİŞ</span>
        </button>

        {currentUser.role === 'ADMIN' && (
             <button onClick={onCycleCount} className="flex flex-col items-center justify-center p-3 bg-pink-600 text-white rounded-2xl shadow-lg active:scale-95 aspect-square text-center">
                <ClipboardCheck size={26} className="mb-1" />
                <span className="text-[10px] font-bold leading-tight uppercase">SAYIM</span>
            </button>
        )}

        <button onClick={onOrderReconciliation} className="flex flex-col items-center justify-center p-3 bg-cyan-600 text-white rounded-2xl shadow-lg active:scale-95 aspect-square text-center">
            <Clipboard size={26} className="mb-1" />
            <span className="text-[10px] font-bold leading-tight uppercase">KONTROL</span>
        </button>

        {currentUser.role === 'ADMIN' && (
             <button onClick={onBulkTransaction} className="flex flex-col items-center justify-center p-3 bg-emerald-600 text-white rounded-2xl shadow-lg active:scale-95 aspect-square text-center">
                <FileSpreadsheet size={26} className="mb-1" />
                <span className="text-[10px] font-bold leading-tight uppercase">EXCEL</span>
            </button>
        )}

         {currentUser.role === 'ADMIN' && (
             <button onClick={onAddProduct} className="flex flex-col items-center justify-center p-3 bg-teal-600 text-white rounded-2xl shadow-lg active:scale-95 aspect-square text-center">
                <PackagePlus size={26} className="mb-1" />
                <span className="text-[10px] font-bold leading-tight uppercase">EKLE</span>
            </button>
        )}
      </div>

      {/* Critical Stock List */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-amber-50/30 dark:bg-amber-900/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Kritik Stok ({lowStockProducts.length})</h3>
            </div>
            <button onClick={() => generateAndDownloadExcel(lowStockProducts, [], 'Kritik_Stok')} className="text-[10px] font-bold text-blue-600 hover:underline">Tümünü İndir</button>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {(showAllCritical ? lowStockProducts : lowStockProducts.slice(0, 3)).map(product => (
              <div key={product.id} className="p-3 flex justify-between items-center text-xs">
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-slate-800 dark:text-white block truncate">{product.product_name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{product.part_code || '-'}</span>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="font-black text-amber-600">{product.current_stock} {product.unit}</span>
                </div>
              </div>
            ))}
          </div>
          {lowStockProducts.length > 3 && (
              <button onClick={() => setShowAllCritical(!showAllCritical)} className="w-full py-2 text-[10px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  {showAllCritical ? 'DARALT' : `TÜMÜNÜ GÖR (${lowStockProducts.length})`}
              </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;