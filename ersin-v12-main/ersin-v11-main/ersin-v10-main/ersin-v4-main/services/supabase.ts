
import { createClient } from '@supabase/supabase-js';
import { Product, Transaction, Order } from '../types';

let supabase: any = null;
let currentUrl: string = '';
let currentKey: string = '';

export const initSupabase = (url: string, key: string) => {
  let safeUrl = url.trim();
  // Remove trailing slash
  if (safeUrl.endsWith('/')) safeUrl = safeUrl.slice(0, -1);
  
  // Auto-add protocol if missing, prefer https but allow http if specified
  if (!safeUrl.startsWith('http://') && !safeUrl.startsWith('https://')) {
      safeUrl = `https://${safeUrl}`;
  }
  
  const safeKey = key.trim();

  if (!supabase || currentUrl !== safeUrl || currentKey !== safeKey) {
    try {
      if (!safeUrl || !safeKey) return null;
      supabase = createClient(safeUrl, safeKey, { auth: { persistSession: false, autoRefreshToken: false } });
      currentUrl = safeUrl;
      currentKey = safeKey;
    } catch (e) { return null; }
  }
  return supabase;
};

const fetchAllData = async (client: any, table: string) => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;
    while (hasMore) {
        const { data, error } = await client.from(table).select('*').range(from, from + step - 1);
        if (error) throw error;
        if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += step;
            if (data.length < step) hasMore = false;
        } else { hasMore = false; }
    }
    return allData;
};

// Helper to remove local-only fields like 'is_synced' before upload
const sanitizeForDb = (items: any[]) => {
    return items.map(item => {
        const { is_synced, ...rest } = item;
        return rest;
    });
};

const saveInBatches = async (client: any, table: string, data: any[]) => {
    const BATCH_SIZE = 500;
    const cleanData = sanitizeForDb(data); // Remove is_synced
    
    for (let i = 0; i < cleanData.length; i += BATCH_SIZE) {
        const batch = cleanData.slice(i, i + BATCH_SIZE);
        const { error } = await client.from(table).upsert(batch, { onConflict: 'id' });
        if (error) throw error;
    }
};

export const deleteRecord = async (url: string, key: string, table: string, id: string) => {
    try {
        const client = initSupabase(url, key);
        if (!client) return { success: false, message: 'Client error' };
        const { error } = await client.from(table).delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e: any) { return { success: false, message: e.message }; }
};

export const testConnection = async (url: string, key: string) => {
    try {
        const client = initSupabase(url, key);
        if (!client) return { success: false, message: "URL/Key eksik." };
        const { error } = await client.from('products').select('*', { count: 'exact', head: true });
        if (error) {
            if (error.code === '42P01') return { success: false, message: "Tablo yok. SQL çalıştırın." };
            if (error.code === '42501') return { success: false, message: "Yetki yok. SQL'deki RLS kodunu çalıştırın." };
            // Allow connection errors to bubble up for better debugging (e.g. network error)
            throw error;
        }
        return { success: true, message: "Bağlantı Başarılı!" };
    } catch (e: any) { return { success: false, message: e.message || "Bağlantı hatası" }; }
};

export const loadFromSupabase = async (url: string, key: string) => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Client error' };
    
    // Ürünleri Çek
    const products = await fetchAllData(client, 'products');
    
    // Hareketleri Çek
    const transactions = await fetchAllData(client, 'transactions');
    
    // Siparişleri Çek
    let orders: Order[] = [];
    try {
        orders = await fetchAllData(client, 'orders');
    } catch (e) { 
        console.warn("Orders table might be missing, returning empty array."); 
    }

    return { success: true, data: { products, transactions, orders }, message: 'OK' };
  } catch (e: any) { return { success: false, message: e.message }; }
};

export const saveToSupabase = async (url: string, key: string, products: Product[], transactions: Transaction[], orders?: Order[]) => {
  try {
    const client = initSupabase(url, key);
    if (!client) return { success: false, message: 'Client error' };

    // Sadece is_synced: false olanları veya hepsi gönderilebilir (Upsert olduğu için hepsi güvenli)
    // Güvenlik için sanitize fonksiyonu ile is_synced alanını temizleyip gönderiyoruz.
    if (products.length > 0) await saveInBatches(client, 'products', products);
    if (transactions.length > 0) await saveInBatches(client, 'transactions', transactions);
    
    // Siparişleri Kaydet
    if (orders && orders.length > 0) {
        await saveInBatches(client, 'orders', orders);
    }

    return { success: true, message: 'Saved' };
  } catch (e: any) { 
      console.error("Supabase Save Error:", e);
      return { success: false, message: e.message }; 
  }
};

export const clearDatabase = async (url: string, key: string) => {
    try {
        const client = initSupabase(url, key);
        if (!client) return { success: false, message: 'Client error' };
        await client.from('transactions').delete().neq('id', '0');
        await client.from('products').delete().neq('id', '0');
        await client.from('orders').delete().neq('id', '0');
        return { success: true, message: 'Cleared' };
    } catch (e: any) { return { success: false, message: e.message }; }
};

export const loadAppSettings = async (url: string, key: string) => {
    try {
        const client = initSupabase(url, key);
        if (!client) return { success: false, message: 'Client error' };
        
        const { data, error } = await client.from('app_settings').select('*');
        if (error) throw error;
        
        const settings: Record<string, string> = {};
        if (data) {
            data.forEach((item: any) => {
                settings[item.key] = item.value;
            });
        }
        return { success: true, data: settings };
    } catch (e: any) { return { success: false, message: e.message }; }
};

export const saveAppSetting = async (url: string, key: string, settingKey: string, settingValue: string) => {
    try {
        const client = initSupabase(url, key);
        if (!client) return { success: false, message: 'Client error' };
        
        const { error } = await client.from('app_settings').upsert({ key: settingKey, value: settingValue }, { onConflict: 'key' });
        if (error) throw error;
        
        return { success: true };
    } catch (e: any) { return { success: false, message: e.message }; }
};
