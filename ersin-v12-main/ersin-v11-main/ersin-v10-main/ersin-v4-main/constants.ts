
import { Product, Transaction, TransactionType } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    product_name: 'BASKI LAMASI',
    part_code: 'P-00003',
    location: 'B1-06-06',
    material: 'ST37 Soğuk Çekme',
    min_stock_level: 5,
    unit: 'Adet',
    current_stock: 3, // Kritik seviye altı (Örnekteki miktar)
    barcode: 'P-00003',
    created_at: '2023-10-01',
    last_counted_at: '2023-12-01T10:00:00.000Z'
  },
  {
    id: 'p-2',
    product_name: 'HİDROLİK PİSTON MİLİ',
    part_code: 'H-20402',
    location: 'A2-12-01',
    material: 'Krom Kaplı Mil',
    min_stock_level: 2,
    unit: 'Adet',
    current_stock: 8,
    barcode: 'H-20402',
    created_at: '2023-10-05',
  },
  {
    id: 'p-3',
    product_name: 'CIVATA M12x40',
    part_code: 'C-1240-88',
    location: 'K4-01-05',
    material: 'HAZIR MALZEME',
    min_stock_level: 100,
    unit: 'Adet',
    current_stock: 450,
    barcode: 'C-1240-88',
    created_at: '2023-11-12',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't-1',
    product_id: 'p-1',
    product_name: 'BASKI LAMASI',
    type: TransactionType.IN,
    quantity: 10,
    date: '2023-12-01T09:00:00.000Z',
    description: 'İmalattan giriş',
    created_by: 'Ahmet Usta',
    previous_stock: 0,
    new_stock: 10
  },
  {
    id: 't-2',
    product_id: 'p-1',
    product_name: 'BASKI LAMASI',
    type: TransactionType.OUT,
    quantity: 7,
    date: '2023-12-02T14:30:00.000Z',
    description: 'Montaj hattına sevk',
    created_by: 'Mehmet Şef',
    previous_stock: 10,
    new_stock: 3
  },
];

export const UNITS = ['Adet', 'Metre', 'Kg', 'Litre', 'Takım', 'Paket'];

export const MATERIALS = [
  'Çene Bıçağı',
  '1040',
  '4140',
  'AISI 304',
  'Alüminyum',
  'CİVA ÇELİĞİ',
  'CK-40',
  'CK-45',
  'CK50',
  'DELRİN',
  'FİBER',
  'HAZIR MALZEME',
  'HRP',
  'İNDİKSİYONLU MİL',
  'Kauçuk',
  'KESTAMİD',
  'KIZIL',
  'Krom Kaplı Mil',
  'OTOMAT ÇELİĞİ',
  'OZLON',
  'PLEXI',
  'POLİÜRATAN',
  'POLYAMİD SİYAH',
  'SAPLAMA (DEMİR)',
  'Sarı - Pirinç',
  'ERTLEŞTRİLMİŞ ÇELİ',
  'Sıcak Çekme - CK45',
  'ST37 Soğuk Çekme',
  'YAY ÇELİĞİ'
];
