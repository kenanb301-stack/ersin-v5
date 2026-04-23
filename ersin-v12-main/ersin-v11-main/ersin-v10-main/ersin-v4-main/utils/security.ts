
import { getDeviceId } from './device';
import { loadAppSettings, checkDeviceAuthorization } from '../services/supabase';

/**
 * SECURITY UTILITIES
 * OWASP Standards Compliant
 */

// 1. INPUT SANITIZATION (XSS Prevention)
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
};

// 2. CSV/EXCEL FORMULA INJECTION PREVENTION
export const sanitizeForSpreadsheet = (input: string | number): string | number => {
  if (typeof input !== 'string') return input;
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousPrefixes.some(prefix => input.startsWith(prefix))) {
    return `'${input}`; // Escape formula trigger
  }
  return sanitizeInput(input);
};

// 3. SECURE HASHING (Client-Side)
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 4. PASSWORD STRENGTH CHECKER
export const validatePasswordStrength = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 6) return { valid: false, message: "Şifre en az 6 karakter olmalıdır." };
    if (!/[0-9]/.test(password)) return { valid: false, message: "Şifre en az bir rakam içermelidir." };
    // İsteğe bağlı: Harf kontrolü
    // if (!/[A-Za-z]/.test(password)) return { valid: false, message: "Şifre en az bir harf içermelidir." };
    return { valid: true };
};

// 5. CREDENTIAL VERIFICATION
const DEFAULT_ADMIN_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"; // hash of 'admin'
const USER_HASH = "04f8996da763b7a969b1028ee3007569eaf3a635486ddab211d512c85b9df8fb"; // hash of 'user'

export const verifyCredentials = async (username: string, password: string, cloudConfig?: any): Promise<{ success: boolean; message?: string }> => {
    const inputHash = await hashPassword(password);
    
    if (username === 'user') {
        return { success: inputHash === USER_HASH };
    }

    if (username === 'admin') {
        // 1. Check Device Authorization first if cloud is connected
        if (cloudConfig) {
            const deviceId = getDeviceId();
            const authCheck = await checkDeviceAuthorization(cloudConfig.supabaseUrl, cloudConfig.supabaseKey, deviceId);
            
            if (authCheck.success && !authCheck.authorized) {
                return { success: false, message: "Bu cihaz yetkilendirilmemiş. Lütfen yönetici ile iletişime geçin." };
            }

            // 2. Check Password Hash from Supabase
            const settingsRes = await loadAppSettings(cloudConfig.supabaseUrl, cloudConfig.supabaseKey);
            if (settingsRes.success && settingsRes.data && settingsRes.data.admin_password_hash) {
                return { success: inputHash === settingsRes.data.admin_password_hash };
            }
        }

        // Fallback to local storage or default
        const customHash = localStorage.getItem('depopro_admin_hash');
        if (customHash) {
            return { success: inputHash === customHash };
        }
        return { success: inputHash === DEFAULT_ADMIN_HASH };
    }

    return { success: false };
};

export const setAdminPassword = async (newPassword: string) => {
    const hash = await hashPassword(newPassword);
    localStorage.setItem('depopro_admin_hash', hash);
    return hash;
};

// 6. FILE VALIDATION
export const validateFile = (file: File, maxSizeMB: number = 5): { valid: boolean; error?: string } => {
  const MAX_BYTES = maxSizeMB * 1024 * 1024;
  
  if (file.size > MAX_BYTES) {
    return { valid: false, error: `Dosya boyutu çok büyük! (Max: ${maxSizeMB}MB)` };
  }

  const allowedExtensions = ['.xlsx', '.xls', '.csv', '.json'];
  const hasValidExt = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  if (!hasValidExt) {
    return { valid: false, error: 'Geçersiz dosya formatı.' };
  }

  return { valid: true };
};
