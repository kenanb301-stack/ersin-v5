import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { Product, Transaction, Order } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const getCollectionData = async (collectionName: string) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const list: any[] = [];
    querySnapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id });
    });
    return list;
};

// Helper to remove local-only fields like 'is_synced' and undefined fields before upload
const sanitizeForDb = (items: any[]) => {
    return items.map(item => {
        const { is_synced, ...rest } = item;
        const clean: any = {};
        Object.keys(rest).forEach(key => {
            if (rest[key] !== undefined) {
                clean[key] = rest[key];
            }
        });
        return clean;
    });
};

const saveInBatches = async (collectionName: string, items: any[]) => {
    let batch = writeBatch(db);
    let count = 0;
    const cleanItems = sanitizeForDb(items);
    
    for (const item of cleanItems) {
        if (!item.id) continue;
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item, { merge: true });
        count++;
        if (count === 500) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
};

const deleteCollection = async (collectionName: string) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    let batch = writeBatch(db);
    let count = 0;
    querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        count++;
        if (count === 500) {
            batch.commit();
            batch = writeBatch(db);
            count = 0;
        }
    });
    if (count > 0) {
        await batch.commit();
    }
};

export const testConnection = async () => {
    try {
        // Query of Products to verify read access works
        await getDocs(collection(db, 'products'));
        return { success: true, message: "Bağlantı Başarılı!" };
    } catch (e: any) {
        return { success: false, message: e.message || "Bağlantı hatası" };
    }
};

export const loadFromFirebase = async () => {
  try {
    const products = await getCollectionData('products');
    const transactions = await getCollectionData('transactions');
    const orders = await getCollectionData('orders');
    return { success: true, data: { products, transactions, orders }, message: 'OK' };
  } catch (e: any) { 
    return { success: false, message: e.message }; 
  }
};

export const saveToFirebase = async (products: Product[], transactions: Transaction[], orders?: Order[]) => {
  try {
    if (products.length > 0) await saveInBatches('products', products);
    if (transactions.length > 0) await saveInBatches('transactions', transactions);
    if (orders && orders.length > 0) {
        await saveInBatches('orders', orders);
    }
    return { success: true, message: 'Saved' };
  } catch (e: any) { 
      console.error("Firebase Save Error:", e);
      return { success: false, message: e.message }; 
  }
};

export const deleteRecord = async (table: string, id: string) => {
    try {
        await deleteDoc(doc(db, table, id));
        return { success: true };
    } catch (e: any) { 
        return { success: false, message: e.message }; 
    }
};

export const clearDatabase = async () => {
    try {
        await deleteCollection('transactions');
        await deleteCollection('products');
        await deleteCollection('orders');
        return { success: true, message: 'Cleared' };
    } catch (e: any) { 
        return { success: false, message: e.message }; 
    }
};

export const loadAppSettings = async () => {
    try {
        const data = await getCollectionData('app_settings');
        const settings: Record<string, string> = {};
        data.forEach((item: any) => {
            settings[item.id] = item.value;
        });
        return { success: true, data: settings };
    } catch (e: any) { 
        return { success: false, message: e.message }; 
    }
};

export const saveAppSetting = async (settingKey: string, settingValue: string) => {
    try {
        await setDoc(doc(db, 'app_settings', settingKey), { key: settingKey, value: settingValue }, { merge: true });
        return { success: true };
    } catch (e: any) { 
        return { success: false, message: e.message }; 
    }
};

export const checkDeviceAuthorization = async (deviceId: string, hardwareFingerprint?: string) => {
    try {
        // 1. First, check if there is an authorized device with the exact deviceId
        const docSnap = await getDoc(doc(db, 'authorized_devices', deviceId));
        if (docSnap.exists() && docSnap.data().is_authorized) {
            return { success: true, authorized: true };
        }

        // 2. If not found or not authorized via deviceId, check if any device with the same hardwareFingerprint is authorized!
        if (hardwareFingerprint) {
            const q = query(
                collection(db, 'authorized_devices'), 
                where('hardware_fingerprint', '==', hardwareFingerprint),
                where('is_authorized', '==', true)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                // Yes! We found a registered device with the same physical hardware fingerprint that is authorized!
                // Let's adopt that authorized device's ID so that this browser is treated as that device!
                const matchedDoc = querySnapshot.docs[0];
                const matchedDeviceId = matchedDoc.data().device_id;
                
                // Save this matched authorized deviceId to local storage so future calls use it directly
                localStorage.setItem('depopro_device_id', matchedDeviceId);
                
                return { success: true, authorized: true, adoptedDeviceId: matchedDeviceId };
            }
        }

        if (!docSnap.exists()) {
            return { success: true, authorized: false, notFound: true };
        }
        return { success: true, authorized: docSnap.data().is_authorized || false };
    } catch (e: any) { 
        console.error("checkDeviceAuthorization error:", e);
        return { success: false, authorized: false }; 
    }
};

export const registerDevice = async (deviceId: string, deviceName: string, hardwareFingerprint?: string) => {
    try {
        const docRef = doc(db, 'authorized_devices', deviceId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            await setDoc(docRef, { 
                device_name: deviceName,
                hardware_fingerprint: hardwareFingerprint || "",
                updated_at: new Date().toISOString()
            }, { merge: true });
        } else {
            await setDoc(docRef, { 
                device_id: deviceId, 
                device_name: deviceName,
                hardware_fingerprint: hardwareFingerprint || "",
                is_authorized: false,
                updated_at: new Date().toISOString()
            });
        }
        return { success: true };
    } catch (e: any) { 
        console.error("Cihaz Kayıt Hatası:", e);
        return { success: false }; 
    }
};

export const getAuthorizedDevices = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, 'authorized_devices'));
        const data: any[] = [];
        querySnapshot.forEach((doc) => {
            data.push({ ...doc.data() });
        });
        
        // sort by updated_at descending
        data.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
        return { success: true, data };
    } catch (e: any) { 
        return { success: false, data: [] }; 
    }
};

export const updateDeviceAuthorization = async (deviceId: string, isAuthorized: boolean) => {
    try {
        await setDoc(doc(db, 'authorized_devices', deviceId), { 
            is_authorized: isAuthorized,
            updated_at: new Date().toISOString()
        }, { merge: true });
        return { success: true };
    } catch (e: any) { 
        return { success: false }; 
    }
};

export const deleteDevice = async (deviceId: string) => {
    try {
        await deleteDoc(doc(db, 'authorized_devices', deviceId));
        return { success: true };
    } catch (e: any) {
        console.error("Cihaz Silme Hatası:", e);
        return { success: false };
    }
};

