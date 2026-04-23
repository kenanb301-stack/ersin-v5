
export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  CORRECTION = 'CORRECTION', // Sayım düzeltmesi
}

export interface Product {
  id: string;
  product_name: string; // "Açıklama" olarak kullanılacak
  part_code?: string;   // Örn: P-00003
  location?: string;    // Örn: B1-06-06 (Reyon)
  material?: string;    // Örn: ST37 SOĞUK ÇEKME (Hammadde)
  min_stock_level: number;
  unit: string;
  current_stock: number;
  barcode?: string; // Barkod içeriği
  short_id?: string; // 6 Haneli Kısa Kod (Sayısal)
  created_at?: string;
  critical_since?: string; // Kritik seviyeye düştüğü tarih (ISO String)
  last_alert_sent_at?: string; // Rapor maili gönderildiği tarih (ISO String)
  last_counted_at?: string; // Son sayım tarihi (ISO String)
  is_synced?: boolean; // SYNC FLAG
}

export interface Transaction {
  id: string;
  product_id: string;
  product_name?: string;
  type: TransactionType;
  quantity: number;
  date: string;
  description: string;
  created_by: string;
  previous_stock?: number;
  new_stock?: number;
  is_synced?: boolean; // SYNC FLAG
}

// NEW: Cycle Count History Type
export interface CycleCount {
  id: string;
  date: string;
  location: string;
  total_items: number;
  correct_items: number;
  accuracy: number;
  created_by: string;
  is_synced?: boolean;
}

// NEW: Order Management Types
export interface OrderItem {
  product_name: string; // Excel'den gelen isim
  required_qty: number;
  unit?: string;
  matched_product_id?: string; // Sistemdeki eşleşen ürün ID'si
  part_code?: string; // Excel'den gelen Parça Kodu
  group?: string;     // Excel'den gelen Grup (Montaj Grubu vb.)
  location?: string;  // Excel'den gelen Reyon
}

export interface Order {
  id: string;
  name: string; // Sipariş Adı / Müşteri
  status: 'PENDING' | 'COMPLETED' | 'SHIPPED';
  items: OrderItem[];
  created_at: string;
  note?: string;
  picked_items?: Record<string, number>; // Persistence: { "product_name": count }
  is_synced?: boolean; // SYNC FLAG
}

export type ViewState = 'DASHBOARD' | 'INVENTORY' | 'HISTORY' | 'NEGATIVE_STOCK' | 'ANALYTICS';

export interface TransactionFormData {
  productId: string;
  type: TransactionType;
  quantity: number;
  description: string;
}

export type UserRole = 'ADMIN' | 'VIEWER';

export interface User {
  username: string;
  name: string;
  role: UserRole;
}

export interface CloudConfig {
  supabaseUrl: string;
  supabaseKey: string;
  lastSync?: string;
}
