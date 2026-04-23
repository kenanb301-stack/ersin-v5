
import * as XLSX from 'xlsx';
import { Product, Transaction, TransactionType } from '../types';

export const generateAndDownloadExcel = (products: Product[], transactions: Transaction[], prefix: string = 'Otomatik_Yedek') => {
    
    // 1. SAYFA: GÜNCEL STOK DURUMU
    // İstenen Sütunlar: parça kodu , ürün adı , reyon, stoktaki miktar, birim, hammadde , barkod kodu
    const stockData = products.map(product => {
        return {
            "Parça Kodu": product.part_code || '-',
            "Ürün Adı": product.product_name,
            "Reyon": product.location || '-',
            "Stoktaki Miktar": product.current_stock,
            "Birim": product.unit,
            "Hammadde": product.material || '-',
            "Barkod Kodu": product.barcode || product.short_id || '-'
        };
    });

    // Helper: İşlem verisini istenen formata çevirir
    const mapTransaction = (t: Transaction) => {
        const product = products.find(p => p.id === t.product_id);
        return {
            "İşlem Tarihi": new Date(t.date).toLocaleString('tr-TR'),
            "Parça Kodu": product?.part_code || '-',
            "Reyon": product?.location || '-',
            "Miktar": t.quantity,
            "Birim": product?.unit || '-',
            "Açıklama": t.description || '-'
        };
    };

    // 2. SAYFA: GİRİŞ İŞLEMLERİ (IN ve Artı Yönlü Düzeltmeler)
    const inputTransactions = transactions
        .filter(t => t.type === TransactionType.IN || (t.type === TransactionType.CORRECTION && (t.new_stock || 0) > (t.previous_stock || 0)))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Yeniden eskiye
        .map(mapTransaction);

    // 3. SAYFA: ÇIKIŞ İŞLEMLERİ (OUT ve Eksi Yönlü Düzeltmeler)
    const outputTransactions = transactions
        .filter(t => t.type === TransactionType.OUT || (t.type === TransactionType.CORRECTION && (t.new_stock || 0) < (t.previous_stock || 0)))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Yeniden eskiye
        .map(mapTransaction);

    // --- EXCEL OLUŞTURMA ---
    const wb = XLSX.utils.book_new();

    // Sayfa 1: Güncel Stok
    const wsStock = XLSX.utils.json_to_sheet(stockData);
    wsStock['!cols'] = [
        { wch: 20 }, // Parça Kodu
        { wch: 40 }, // Ürün Adı
        { wch: 15 }, // Reyon
        { wch: 15 }, // Miktar
        { wch: 10 }, // Birim
        { wch: 25 }, // Hammadde
        { wch: 20 }  // Barkod
    ];
    XLSX.utils.book_append_sheet(wb, wsStock, "Guncel_Stok_Durumu");

    // Sayfa 2: Girişler
    const wsInputs = XLSX.utils.json_to_sheet(inputTransactions);
    wsInputs['!cols'] = [
        { wch: 20 }, // Tarih
        { wch: 20 }, // Parça Kodu
        { wch: 15 }, // Reyon
        { wch: 10 }, // Miktar
        { wch: 10 }, // Birim
        { wch: 40 }  // Açıklama
    ];
    XLSX.utils.book_append_sheet(wb, wsInputs, "Giris_Islemleri");

    // Sayfa 3: Çıkışlar
    const wsOutputs = XLSX.utils.json_to_sheet(outputTransactions);
    wsOutputs['!cols'] = [
        { wch: 20 }, // Tarih
        { wch: 20 }, // Parça Kodu
        { wch: 15 }, // Reyon
        { wch: 10 }, // Miktar
        { wch: 10 }, // Birim
        { wch: 40 }  // Açıklama
    ];
    XLSX.utils.book_append_sheet(wb, wsOutputs, "Cikis_Islemleri");

    // İndirme İşlemi
    const dateStr = new Date().toLocaleString('tr-TR').replace(/[\/\s:]/g, '_');
    XLSX.writeFile(wb, `${prefix}_${dateStr}.xlsx`);
};
