
import React from 'react';
import { AlertTriangle, ArrowLeft, Download, PackageX } from 'lucide-react';
import { Product } from '../types';

interface NegativeStockListProps {
  products: Product[];
  onBack: () => void;
}

const NegativeStockList: React.FC<NegativeStockListProps> = ({ products, onBack }) => {
  const negativeProducts = products.filter(p => p.current_stock < 0);

  const handleExport = () => {
    if (negativeProducts.length === 0) return;

    // Kategori kaldırıldı
    const headers = ["Ürün Adı", "Mevcut Stok (Eksi)", "Birim", "Min. Stok"];
    const rows = negativeProducts.map(p => [
        `"${p.product_name}"`,
        p.current_stock.toString(),
        p.unit,
        p.min_stock_level.toString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "eksi_bakiyeli_urunler.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
            <ArrowLeft size={20} />
            <span className="font-medium">Geri Dön</span>
        </button>
        <h2 className="text-xl font-bold text-red-600 dark:text-red-500 flex items-center gap-2">
            <AlertTriangle size={24} />
            Eksi Bakiyeli Ürünler
        </h2>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden transition-colors">
        <div className="p-4 border-b border-red-50 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 flex items-center justify-between">
            <div className="text-sm text-red-800 dark:text-red-400 font-medium">
                Toplam {negativeProducts.length} ürün eksi bakiyede.
            </div>
            <button 
                onClick={handleExport}
                disabled={negativeProducts.length === 0}
                className="flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-400 bg-white dark:bg-slate-700 border border-red-200 dark:border-red-900/30 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Download size={14} />
                Listeyi İndir (Excel)
            </button>
        </div>

        <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {negativeProducts.length === 0 ? (
                 <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                    <PackageX className="mx-auto mb-2 opacity-50" size={48} />
                    <p>Eksiye düşen ürün bulunmamaktadır.</p>
                 </div>
            ) : (
                negativeProducts.map(product => (
                <div key={product.id} className="p-4 hover:bg-red-50/10 dark:hover:bg-red-900/10 transition-colors flex justify-between items-center">
                    <div>
                    <div className="font-medium text-slate-800 dark:text-white">{product.product_name}</div>
                    {/* Kategori kaldırıldı */}
                    <div className="text-sm text-slate-400 dark:text-slate-500">{product.part_code}</div>
                    </div>
                    <div className="text-right">
                    <span className="block font-bold text-red-600 dark:text-red-500 text-lg">
                        {product.current_stock} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{product.unit}</span>
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Min: {product.min_stock_level}</span>
                    </div>
                </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default NegativeStockList;
