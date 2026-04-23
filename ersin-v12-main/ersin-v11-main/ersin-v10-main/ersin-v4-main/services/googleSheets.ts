
import { Product, Transaction } from '../types';

interface SyncData {
  products: Product[];
  transactions: Transaction[];
  lastUpdated: string;
}

export const saveToCloud = async (scriptUrl: string, data: SyncData): Promise<{ success: boolean; message: string }> => {
  try {
    // Google Apps Script requires text/plain for CORS to work simply without preflight issues in some envs
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'save',
        data: data
      })
    });

    const result = await response.json();
    if (result.status === 'success') {
      return { success: true, message: 'Veriler buluta kaydedildi.' };
    } else {
      return { success: false, message: 'Kaydetme hatası: ' + result.message };
    }
  } catch (error) {
    console.error("Cloud Save Error:", error);
    return { success: false, message: 'Bulut bağlantı hatası.' };
  }
};

export const loadFromCloud = async (scriptUrl: string): Promise<{ success: boolean; data?: SyncData; message: string }> => {
  try {
    const response = await fetch(`${scriptUrl}?action=load`);
    const result = await response.json();

    if (result.status === 'success' && result.data) {
      return { success: true, data: result.data, message: 'Veriler indirildi.' };
    } else {
      return { success: false, message: 'Veri çekme hatası: ' + result.message };
    }
  } catch (error) {
    console.error("Cloud Load Error:", error);
    return { success: false, message: 'Bulut bağlantı hatası.' };
  }
};
