// Firebase/Bulut servisi devre dışı bırakılmıştır.
// Artık sadece yerel depolama kullanılmaktadır.

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  databaseURL: string;
}

export const initializeFirebase = (config: FirebaseConfig): any => {
  console.warn("Firebase servisi devre dışı.");
  return null;
};

export const getDb = () => null;