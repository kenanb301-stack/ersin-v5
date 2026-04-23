
import React, { useState, useEffect } from 'react';
import { X, PackagePlus, AlertCircle, Save, Lock, Trash2, MapPin, Hexagon, Hash } from 'lucide-react';
import { UNITS, MATERIALS } from '../constants';
import { Product } from '../types';
import { sanitizeInput } from '../utils/security';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete?: (id: string) => void;
  productToEdit?: Product | null;
  products: Product[];
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSubmit, onDelete, productToEdit, products }) => {
  const [name, setName] = useState('');
  const [partCode, setPartCode] = useState('');
  const [location, setLocation] = useState('');
  const [material, setMaterial] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [minStock, setMinStock] = useState<number>(10);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setName(productToEdit.product_name);
        setPartCode(productToEdit.part_code || '');
        setLocation(productToEdit.location || '');
        setMaterial(productToEdit.material || '');
        setUnit(productToEdit.unit);
        setMinStock(productToEdit.min_stock_level);
        setInitialStock(productToEdit.current_stock);
      } else {
        setName('');
        setPartCode('');
        setLocation('');
        setMaterial('');
        setUnit(UNITS[0]);
        setMinStock(10);
        setInitialStock(0);
      }
      setError('');
    }
  }, [isOpen, productToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Açıklama (Ürün Adı) zorunludur.');
      return;
    }

    // DUPLICATE CHECK
    if (!productToEdit) {
        // Check 1: Part Code (if exists)
        if (partCode.trim()) {
            const isDuplicateCode = products.some(p => 
                p.part_code && p.part_code.trim().toLocaleLowerCase('tr-TR') === partCode.trim().toLocaleLowerCase('tr-TR')
            );
            if (isDuplicateCode) {
                setError(`Bu parça kodu (${partCode}) sistemde zaten kayıtlı!`);
                return;
            }
        }
        
        // Check 2: Product Name (Exact match check only if part code is empty to avoid ambiguity)
        if (!partCode.trim()) {
             const isDuplicateName = products.some(p => 
                p.product_name.trim().toLocaleLowerCase('tr-TR') === name.trim().toLocaleLowerCase('tr-TR')
            );
            if (isDuplicateName) {
                 setError(`Bu isimde bir ürün zaten var! Parça kodu girin veya ismi değiştirin.`);
                 return;
            }
        }
    }

    // SECURITY: Sanitize all inputs before saving
    const formData = {
      product_name: sanitizeInput(name),
      part_code: sanitizeInput(partCode),
      location: sanitizeInput(location),
      material: sanitizeInput(material),
      unit: sanitizeInput(unit),
      min_stock_level: Math.max(0, Number(minStock)), // Prevent negative
      current_stock: Math.max(0, Number(initialStock)), // Prevent negative
    };

    onSubmit(formData);
    onClose();
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {productToEdit ? (
                <>
                    <Save size={20} className="text-blue-600 dark:text-blue-400" />
                    Parça/Ürün Düzenle
                </>
            ) : (
                <>
                    <PackagePlus size={20} className="text-green-600 dark:text-green-400" />
                    Yeni Parça Ekle
                </>
            )}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 pb-0">
          <form id="productForm" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Parça Kodu</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={partCode}
                            onChange={(e) => setPartCode(e.target.value)}
                            placeholder="Örn: P-00003"
                            className="w-full pl-9 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono"
                        />
                        <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reyon / Raf</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Örn: B1-06-06"
                            className="w-full pl-9 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-mono uppercase"
                        />
                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                    </div>
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama / Parça Adı</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: BASKI LAMASI"
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none font-bold"
              />
            </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hammadde / Çeşit</label>
                <div className="relative">
                    <input
                        list="material-options"
                        type="text"
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        placeholder="Listeden seçin veya yazın..."
                        className="w-full pl-9 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    <datalist id="material-options">
                        {MATERIALS.map((mat, idx) => (
                            <option key={idx} value={mat} />
                        ))}
                    </datalist>
                    <Hexagon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Birim</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kritik Stok (Min)</label>
                <input
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  min="0"
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {productToEdit ? 'Mevcut Stok' : 'Açılış Stoğu'}
                </label>
                <div className="relative">
                  <input
                      type="number"
                      value={initialStock}
                      onChange={(e) => setInitialStock(Number(e.target.value))}
                      disabled={!!productToEdit}
                      min="0"
                      className={`w-full p-3 rounded-lg border outline-none ${productToEdit ? 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border-slate-200 dark:border-slate-600 focus:border-primary focus:ring-2 focus:ring-primary/20'}`}
                  />
                  {productToEdit && (
                      <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mt-auto flex gap-3">
             {productToEdit && onDelete && (
                <button
                    type="button"
                    onClick={() => onDelete(productToEdit.id)}
                    className="p-3.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors shadow-sm active:scale-95"
                    title="Ürünü Sil"
                >
                    <Trash2 size={20} />
                </button>
            )}
            <button
              type="submit"
              form="productForm"
              className={`flex-1 py-3.5 rounded-xl text-white font-bold shadow-lg dark:shadow-none transition-transform transform active:scale-95 ${productToEdit ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}
            >
              {productToEdit ? 'Değişiklikleri Kaydet' : 'Kaydet'}
            </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default ProductModal;