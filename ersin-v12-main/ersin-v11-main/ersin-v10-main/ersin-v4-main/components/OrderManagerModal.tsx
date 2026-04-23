
import React, { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import { X, Upload, Package, Trash2, Plus, AlertCircle, Search, Download, CheckCircle, AlertTriangle, MapPin, ListChecks, Lock, ArrowLeft, FileSpreadsheet, Layers, ChevronDown, ChevronUp, Tag, SortAsc, LayoutGrid, Info, BoxSelect, CheckSquare, FileType, Truck, ClipboardCheck, Clock, FileDown, ChevronRight, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, Order, OrderItem, User } from '../types';
import { sanitizeInput } from '../utils/security';

interface OrderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  orders: Order[];
  onSaveOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onUpdateOrderStatus: (id: string, status: 'PENDING' | 'COMPLETED' | 'SHIPPED') => void;
  onProcessOrderStock?: (order: Order) => void; 
  onUpdateOrderProgress: (id: string, pickedItems: Record<string, number>) => void;
  currentUser?: User;
}

type TabType = 'LIST' | 'IMPORT' | 'SHORTAGE' | 'SIMULATION';
type SortOption = 'LOCATION' | 'PART_CODE' | 'GROUP';
type ShortageViewMode = 'BY_PROJECT' | 'CONSOLIDATED';
type OrderStatusFilter = 'PENDING' | 'COMPLETED' | 'SHIPPED';

const OrderManagerModal: React.FC<OrderManagerModalProps> = ({ 
    isOpen, onClose, products, orders, 
    onSaveOrder, onDeleteOrder, onUpdateOrderStatus, onProcessOrderStock, onUpdateOrderProgress, currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('LIST');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('PENDING');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('LOCATION');
  const [shortageViewMode, setShortageViewMode] = useState<ShortageViewMode>('BY_PROJECT');
  
  const [newOrderName, setNewOrderName] = useState('');
  const [importedItems, setImportedItems] = useState<OrderItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const simFileInputRef = useRef<HTMLInputElement>(null);

  const [simResults, setSimResults] = useState<any[]>([]);
  const [expandedShortageOrders, setExpandedShortageOrders] = useState<Set<string>>(new Set());

  const isAdmin = currentUser?.role === 'ADMIN';

  // State persistence and cleanup
  useEffect(() => {
      if (!isOpen) {
          setActiveTab('LIST');
          setStatusFilter('PENDING');
          setActiveOrderId(null);
          setSimResults([]);
          setImportedItems([]);
          setSortOption('LOCATION');
          setShortageViewMode('BY_PROJECT');
          setExpandedShortageOrders(new Set());
      }
  }, [isOpen]);

  // Derived current order object - Memoized for performance
  const activeOrder = useMemo(() => {
    if (!activeOrderId) return null;
    return orders.find(o => o.id === activeOrderId) || null;
  }, [activeOrderId, orders]);

  const playPickSound = () => {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch (e) {}
  };

  const cleanStr = (val: any) => val ? String(val).trim().replace(/\s+/g, ' ').toLowerCase() : '';

  // Performance optimized product finder
  const findProduct = useMemo(() => (item: { part_code?: string, product_name: string }) => {
      const searchCode = cleanStr(item.part_code);
      const searchName = cleanStr(item.product_name);
      return products.find(p => {
          const pCode = cleanStr(p.part_code);
          const pName = cleanStr(p.product_name);
          if (searchCode && (pCode === searchCode || cleanStr(p.barcode) === searchCode || cleanStr(p.short_id) === searchCode)) return true;
          if (searchName && pName === searchName) return true;
          return false;
      });
  }, [products]);

  const sortedPickingItems = useMemo(() => {
    if (!activeOrder) return [];
    return [...activeOrder.items].sort((a, b) => {
        const pA = findProduct(a);
        const pB = findProduct(b);
        
        if (sortOption === 'LOCATION') {
            const locA = pA?.location || 'ZZZ';
            const locB = pB?.location || 'ZZZ';
            return locA.localeCompare(locB, undefined, { numeric: true });
        }
        if (sortOption === 'PART_CODE') {
            const codeA = a.part_code || 'ZZZ';
            const codeB = b.part_code || 'ZZZ';
            return codeA.localeCompare(codeB);
        }
        if (sortOption === 'GROUP') {
            const grpA = a.group || 'ZZZ';
            const grpB = b.group || 'ZZZ';
            return grpA.localeCompare(grpB);
        }
        return 0;
    });
  }, [activeOrder, sortOption, findProduct]);

  const filteredOrdersByStatus = useMemo(() => {
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const statusCounts = useMemo(() => {
    return {
        PENDING: orders.filter(o => o.status === 'PENDING').length,
        COMPLETED: orders.filter(o => o.status === 'COMPLETED').length,
        SHIPPED: orders.filter(o => o.status === 'SHIPPED').length,
    };
  }, [orders]);

  const handleExportSingleOrder = (order: Order) => {
    if (!order) return;
    const exportData = order.items.map(item => {
        const p = findProduct(item);
        return {
            "Sipariş Adı": order.name,
            "Parça Kodu": item.part_code || '-',
            "Ürün Adı": item.product_name,
            "Gerekli Miktar": item.required_qty,
            "Toplanan Miktar": order.picked_items?.[item.part_code || item.product_name] || 0,
            "Birim": item.unit || 'Adet',
            "Depo Konumu": p?.location || item.location || '-',
            "Grup/Kategori": item.group || '-'
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siparis_Detay");
    XLSX.writeFile(wb, `Siparis_${order.name.replace(/\s+/g, '_')}.xlsx`);
  };

  // Fix: Added 'calculatedShortages' to compute shortages per project for the 'BY_PROJECT' view mode.
  const calculatedShortages = useMemo(() => {
    return orders.filter(o => o.status === 'PENDING').map(order => {
      const shortageItems = order.items.map(item => {
        const product = findProduct(item);
        const picked = order.picked_items?.[item.part_code || item.product_name] || 0;
        const remainingNeed = item.required_qty - picked;
        
        if (remainingNeed > 0) {
          const availableStock = product ? product.current_stock : 0;
          const missing = Math.max(0, remainingNeed - availableStock);
          
          if (missing > 0 || !product) {
            return {
              ...item,
              product,
              missing: missing > 0 ? missing : remainingNeed,
              isSpecial: !product
            };
          }
        }
        return null;
      }).filter((i): i is any => i !== null);

      return { order, items: shortageItems };
    }).filter(res => res.items.length > 0);
  }, [orders, products, findProduct]);

  const consolidatedShortages = useMemo(() => {
      const demandMap: Record<string, { product: Product | undefined, items: OrderItem[], totalNeeded: number, isSpecial: boolean, orderDetails: {name: string, qty: number}[] }> = {};
      orders.filter(o => o.status === 'PENDING').forEach(order => {
          order.items.forEach(item => {
              const product = findProduct(item);
              const key = product ? product.id : (item.part_code || item.product_name);
              const picked = order.picked_items?.[item.part_code || item.product_name] || 0;
              const remainingNeed = item.required_qty - picked;
              if (remainingNeed > 0) {
                  if (!demandMap[key]) demandMap[key] = { product, items: [], totalNeeded: 0, isSpecial: !product, orderDetails: [] };
                  demandMap[key].items.push(item);
                  demandMap[key].totalNeeded += remainingNeed;
                  demandMap[key].orderDetails.push({ name: order.name, qty: remainingNeed });
              }
          });
      });
      return Object.entries(demandMap).map(([key, data]) => {
          const availableStock = data.product ? data.product.current_stock : 0;
          const netShortage = data.isSpecial ? data.totalNeeded : Math.max(0, data.totalNeeded - availableStock);
          if (netShortage > 0) return { key, product: data.product, totalNeeded: data.totalNeeded, availableStock, netShortage, isSpecial: data.isSpecial, name: data.product ? data.product.product_name : data.items[0].product_name, partCode: data.product ? data.product.part_code : data.items[0].part_code, orders: data.orderDetails };
          return null;
      }).filter(Boolean).sort((a: any, b: any) => (a.isSpecial !== b.isSpecial) ? (a.isSpecial ? -1 : 1) : b.netShortage - a.netShortage);
  }, [orders, products, findProduct]);

  const handlePickToggle = (item: any) => {
      if (!activeOrder) return;
      const key = item.part_code || item.product_name;
      const currentVal = activeOrder.picked_items?.[key] || 0;
      const newVal = currentVal >= item.required_qty ? 0 : item.required_qty;
      if (newVal > 0) playPickSound(); 
      const newPickedMap = { ...activeOrder.picked_items, [key]: newVal };
      onUpdateOrderProgress(activeOrder.id, newPickedMap);
  };

  const handleDownloadTemplate = (mode: 'ORDER' | 'SIM') => {
      const data = mode === 'ORDER' 
        ? [{ "Parça Kodu": "P-00003", "Ürün Adı": "Örnek", "Miktar": 10 }]
        : [{ "Parça Kodu": "P-00003", "Miktar": 50 }];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sablon");
      XLSX.writeFile(wb, mode === 'ORDER' ? "siparis_sablonu.xlsx" : "simulasyon_sablonu.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isSimulation: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'array' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const items: OrderItem[] = data.map((row: any) => ({
            part_code: String(row['Parça Kodu'] || row['ParcaKodu'] || '').trim() || undefined,
            product_name: String(row['Ürün Adı'] || row['Urun'] || row['Ürün'] || '').trim(),
            required_qty: Number(row['Miktar'] || row['Adet'] || 0),
            group: String(row['Grup'] || '').trim(),
            location: String(row['Reyon'] || '').trim(),
            unit: 'Adet'
        })).filter(i => i.required_qty > 0);
        if (isSimulation) {
            const results = items.map(item => {
                const product = findProduct(item);
                const missing = Math.max(0, item.required_qty - (product?.current_stock || 0));
                return { ...item, currentStock: product?.current_stock || 0, missing, status: !product ? 'UNKNOWN' : (missing > 0 ? 'SHORTAGE' : 'OK') };
            });
            setSimResults(results);
        } else setImportedItems(items);
      } catch (e) { alert("Dosya okunamadı."); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCreateOrder = () => {
      if (!newOrderName || importedItems.length === 0) return;
      onSaveOrder({ id: Math.random().toString(36).substr(2, 9), name: sanitizeInput(newOrderName), status: 'PENDING', items: importedItems, created_at: new Date().toISOString(), picked_items: {}, is_synced: false });
      setNewOrderName(''); setImportedItems([]); setActiveTab('LIST'); setStatusFilter('PENDING');
  };

  const toggleShortageExpand = (orderId: string) => {
    const newExpanded = new Set(expandedShortageOrders);
    if (newExpanded.has(orderId)) newExpanded.delete(orderId);
    else newExpanded.add(orderId);
    setExpandedShortageOrders(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <>
    {activeOrder ? (
        <div className="fixed inset-0 z-[200] bg-slate-50 dark:bg-slate-900 flex flex-col animate-fade-in">
            <div className="bg-white dark:bg-slate-800 shadow-md z-20">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button onClick={() => setActiveOrderId(null)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 transition-colors"><ArrowLeft size={24}/></button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold truncate">{activeOrder.name}</h2>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase">HAZIRLANIYOR</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleExportSingleOrder(activeOrder)} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 flex items-center gap-1 shadow-sm active:scale-95 transition-all"><FileDown size={20} /><span className="text-xs font-bold hidden sm:inline">İndir</span></button>
                        <select value={sortOption} onChange={(e) => setSortOption(e.target.value as SortOption)} className="bg-slate-100 dark:bg-slate-700 text-xs font-bold px-2 py-2 rounded-lg outline-none">
                            <option value="LOCATION">📍 Reyon</option>
                            <option value="PART_CODE"># Kod</option>
                            <option value="GROUP">📁 Grup</option>
                        </select>
                    </div>
                </div>
                <div className="px-4 pb-4">
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(Object.keys(activeOrder.picked_items || {}).filter(k => (activeOrder.picked_items?.[k] || 0) >= (activeOrder.items.find(i => (i.part_code || i.product_name) === k)?.required_qty || 0)).length / activeOrder.items.length) * 100}%` }} />
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sortedPickingItems.map((item, idx) => {
                    const key = item.part_code || item.product_name;
                    const isPicked = (activeOrder.picked_items?.[key] || 0) >= item.required_qty;
                    const p = findProduct(item);
                    return (
                        <div key={idx} onClick={() => handlePickToggle(item)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${isPicked ? 'bg-green-50 border-green-200 dark:bg-green-900/10 opacity-70' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400'}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="font-bold font-mono text-lg truncate">{item.part_code || 'KODSUZ'}</div>
                                    <div className="text-sm opacity-70 truncate font-medium">{item.product_name}</div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {(p?.location || item.location) && <div className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-[10px] font-black border border-orange-200"><MapPin size={10}/> {p?.location || item.location}</div>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black text-slate-800 dark:text-white">{item.required_qty}</div>
                                    <div className="mt-1">{isPicked ? <CheckCircle className="text-green-600 ml-auto" size={28}/> : <BoxSelect className="text-slate-300 dark:text-slate-600 ml-auto" size={28}/>}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    ) : (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2"><Package className="text-orange-600" size={24}/> <h2 className="text-lg font-bold">Sipariş Yönetimi</h2></div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={24} className="text-slate-400"/></button>
            </div>
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                {['LIST', 'IMPORT', 'SHORTAGE', 'SIMULATION'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={`flex-1 py-4 text-xs sm:text-sm font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/10' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                        {tab === 'LIST' ? 'Siparişler' : tab === 'IMPORT' ? 'Excel Yükle' : tab === 'SHORTAGE' ? 'Eksik Listesi' : 'Simülasyon'}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-900 flex flex-col">
                {activeTab === 'LIST' && (
                    <div className="flex flex-col h-full">
                        <div className="p-3 bg-white dark:bg-slate-800 border-b dark:border-slate-700 flex gap-2">
                            {['PENDING', 'COMPLETED', 'SHIPPED'].map((s: any) => (
                                <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${statusFilter === s ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                    {s === 'PENDING' ? 'Hazırlanacak' : s === 'COMPLETED' ? 'Paketlenen' : 'Gönderilen'} ({statusCounts[s as keyof typeof statusCounts]})
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredOrdersByStatus.map(order => (
                                <div key={order.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer flex flex-col justify-between group transition-all" onClick={() => setActiveOrderId(order.id)}>
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold truncate pr-4 text-slate-800 dark:text-white">{order.name}</h3>
                                            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-500">{new Date(order.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-sm text-slate-500 font-medium flex items-center justify-between">
                                            <span>{order.items.length} Kalem</span>
                                            <span className="text-[10px] bg-slate-50 px-2 py-0.5 rounded border text-blue-500 font-black">Detay Gör &gt;</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: order.status === 'PENDING' ? '#f97316' : order.status === 'COMPLETED' ? '#22c55e' : '#3b82f6' }}></div>
                                            <span className="text-[10px] font-black uppercase tracking-wider">{order.status === 'PENDING' ? 'Hazırlanıyor' : order.status === 'COMPLETED' ? 'Hazır' : 'Sevk Edildi'}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); if(confirm("Silmek istediğinize emin misiniz?")) onDeleteOrder(order.id); }} className="text-red-400 hover:text-red-600 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'SHORTAGE' && (
                    <div className="p-4 h-full overflow-y-auto space-y-4">
                         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit shadow-inner mb-4">
                            <button onClick={() => setShortageViewMode('BY_PROJECT')} className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${shortageViewMode === 'BY_PROJECT' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sipariş Bazlı</button>
                            <button onClick={() => setShortageViewMode('CONSOLIDATED')} className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${shortageViewMode === 'CONSOLIDATED' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Toplam İhtiyaç</button>
                         </div>

                         {shortageViewMode === 'BY_PROJECT' ? (
                            calculatedShortages.map(({order, items}, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-all mb-3">
                                    <button onClick={() => toggleShortageExpand(order.id)} className="w-full p-4 bg-slate-50 dark:bg-slate-700/30 flex justify-between items-center hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <ChevronRight size={20} className={`text-slate-400 transition-transform ${expandedShortageOrders.has(order.id) ? 'rotate-90' : ''}`} />
                                            <h4 className="font-bold text-slate-800 dark:text-white">{order.name}</h4>
                                        </div>
                                        <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-full">{items.length} Eksik</span>
                                    </button>
                                    {expandedShortageOrders.has(order.id) && (
                                        <div className="divide-y dark:divide-slate-700 animate-fade-in">
                                            {items.map((item, i) => (
                                                <div key={i} className="p-4 flex justify-between items-center text-sm">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <div className="font-bold font-mono text-slate-700 dark:text-slate-200 flex items-center gap-2">{item.part_code || item.product_name} {item.isSpecial && <Tag size={12} className="text-purple-600"/>}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.isSpecial ? 'Kayıt Dışı Ürün' : `Konum: ${item.product?.location || '-'}`}</div>
                                                    </div>
                                                    <div className="font-black text-xl text-red-600">-{item.missing}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                         ) : (
                             <div className="flex flex-col gap-2 pb-10">
                                 {consolidatedShortages.map((s: any, i: number) => (
                                     <div key={i} className={`p-3 bg-white dark:bg-slate-800 rounded-lg border flex items-center justify-between shadow-sm transition-all hover:border-blue-300 ${s.isSpecial ? 'border-purple-100 dark:border-purple-900/40' : 'border-slate-100 dark:border-slate-700'}`}>
                                         <div className="flex-1 min-w-0 pr-4">
                                             <div className="flex items-center gap-2 mb-1">
                                                <span className="font-black font-mono text-slate-800 dark:text-slate-200 text-sm">{s.partCode || s.name}</span>
                                                {s.isSpecial && <Tag size={10} className="text-purple-500" />}
                                             </div>
                                             {/* STREAMLINED SOURCES */}
                                             <div className="flex flex-wrap gap-1">
                                                 {s.orders.map((ord: any, idx: number) => (
                                                     <div key={idx} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 text-[9px] font-bold text-slate-500 dark:text-slate-400 border dark:border-slate-800">
                                                         <span className="truncate max-w-[80px]">{ord.name}</span>
                                                         <span className="text-red-500">({ord.qty})</span>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                         <div className="text-right">
                                             <div className="text-lg font-black text-red-600">-{s.netShortage}</div>
                                             <div className="text-[8px] font-bold text-slate-400 uppercase">Toplam Eksik</div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>
                )}

                {activeTab === 'IMPORT' && (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <div className="bg-blue-50 p-6 rounded-3xl mb-4"><Upload size={48} className="text-blue-500 animate-bounce"/></div>
                        <h3 className="text-xl font-bold mb-4">Yeni Sipariş Yükle</h3>
                        <input type="text" placeholder="Sipariş / Müşteri Adı" value={newOrderName} onChange={(e) => setNewOrderName(e.target.value)} className="p-3 border rounded-lg mb-4 w-full max-w-sm dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold"/>
                        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 p-8 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors w-full max-w-sm mb-6">
                            <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e)} className="hidden" accept=".xlsx" />
                            <FileSpreadsheet className="text-slate-400 mb-2 mx-auto" size={32}/>
                            <span className="text-sm font-bold text-slate-600">{importedItems.length > 0 ? `${importedItems.length} Kalem Okundu` : 'Excel Dosyası Seç'}</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => handleDownloadTemplate('ORDER')} className="text-xs font-bold text-blue-600 bg-blue-50 px-6 py-3 rounded-xl border border-blue-100 transition-colors shadow-sm">Şablon İndir</button>
                            <button onClick={handleCreateOrder} disabled={!newOrderName || importedItems.length === 0} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50">Kaydet</button>
                        </div>
                    </div>
                )}

                {activeTab === 'SIMULATION' && (
                    <div className="p-4 h-full overflow-y-auto">
                        {simResults.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <Search size={48} className="text-purple-400 mb-4"/>
                                <h3 className="text-xl font-bold mb-8">Üretim Öncesi Stok Simülasyonu</h3>
                                <div onClick={() => simFileInputRef.current?.click()} className="border-2 border-dashed border-purple-200 p-10 rounded-2xl cursor-pointer hover:bg-purple-50 transition-all w-full max-w-sm">
                                    <input type="file" ref={simFileInputRef} onChange={(e) => handleFileUpload(e, true)} className="hidden" accept=".xlsx" />
                                    <Upload className="text-purple-400 mb-2 mx-auto" size={32}/>
                                    <span className="text-sm font-black text-purple-600">Excel Listesi Yükle</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border sticky top-0 z-10 shadow-sm">
                                    <h3 className="font-black text-slate-800 dark:text-white">Simülasyon Analizi</h3>
                                    <button onClick={() => setSimResults([])} className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg">Yeni Liste</button>
                                </div>
                                <div className="flex flex-col gap-2 pb-20">
                                    {simResults.map((r, i) => (
                                        <div key={i} className={`p-4 bg-white dark:bg-slate-800 rounded-lg border-2 flex justify-between items-center shadow-sm ${r.status === 'OK' ? 'border-green-100' : r.status === 'UNKNOWN' ? 'border-purple-100' : 'border-red-100'}`}>
                                            <div className="min-w-0 pr-4">
                                                <div className="font-black font-mono text-slate-800 dark:text-white truncate">{r.part_code || r.product_name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Gerekli: {r.required_qty} | Mevcut: {r.currentStock}</div>
                                            </div>
                                            <div className={`text-2xl font-black ${r.status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>{r.missing > 0 ? `-${r.missing}` : <CheckCircle size={24}/>}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        </div>
    )}
    </>
  );
};

export default OrderManagerModal;
