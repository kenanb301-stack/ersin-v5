
/**
 * DEVICE MANAGEMENT UTILITIES
 * For Device Fingerprinting and Authorization
 */

/**
 * DEVICE MANAGEMENT UTILITIES
 * For Device Fingerprinting and Authorization
 */

const hashString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
};

export const getHardwareFingerprint = (): string => {
    const screenWidth = window.screen.width || 0;
    const screenHeight = window.screen.height || 0;
    const colorDepth = window.screen.colorDepth || 0;
    const cores = navigator.hardwareConcurrency || 4;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    
    // Extract OS name stably (without browser-specific details)
    const ua = navigator.userAgent;
    let os = 'UnknownOS';
    if (/android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Macintosh/i.test(ua)) os = 'macOS';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Linux/i.test(ua)) os = 'Linux';

    // Combine features to form a browser-independent hardware fingerprint
    const rawString = [os, screenWidth, screenHeight, colorDepth, cores, timezone].join('|');
    return 'hw-' + hashString(rawString);
};

export const getDeviceId = (): string => {
    let deviceId = localStorage.getItem('depopro_device_id');
    if (!deviceId) {
        deviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('depopro_device_id', deviceId);
    }
    return deviceId;
};

export const getDeviceName = (): string => {
    const userAgent = navigator.userAgent;
    let os = 'Bilinmeyen Cihaz';
    let browser = 'Bilinmeyen Tarayıcı';
    let model = '';

    // Detect OS and Model
    if (/android/i.test(userAgent)) {
        os = 'Android';
        // Extract Android model
        // Typical: Mozilla/5.0 (Linux; Android 10; SM-G973F) ...
        const match = userAgent.match(/Android\s+[^;]+;\s*([^;)]+)/i);
        if (match && match[1]) {
            model = match[1].trim();
            // Clean up some common prefixes/suffixes
            model = model.replace(/Build\/[^\s)]+/i, '').trim();
        } else {
            model = 'Android Telefon';
        }
    } else if (/iPhone/i.test(userAgent)) {
        os = 'iOS';
        model = 'iPhone';
    } else if (/iPad/i.test(userAgent)) {
        os = 'iOS';
        model = 'iPad';
    } else if (/iPod/i.test(userAgent)) {
        os = 'iOS';
        model = 'iPod';
    } else if (/Macintosh/i.test(userAgent)) {
        os = 'macOS';
        model = 'Mac';
    } else if (/Windows/i.test(userAgent)) {
        os = 'Windows';
        // Check Windows Version
        if (/Windows NT 10.0/i.test(userAgent)) {
            model = 'Windows 10/11 PC';
        } else if (/Windows NT 6.3/i.test(userAgent)) {
            model = 'Windows 8.1 PC';
        } else if (/Windows NT 6.2/i.test(userAgent)) {
            model = 'Windows 8 PC';
        } else if (/Windows NT 6.1/i.test(userAgent)) {
            model = 'Windows 7 PC';
        } else {
            model = 'Windows PC';
        }
    } else if (/Linux/i.test(userAgent)) {
        os = 'Linux';
        model = 'Linux PC';
    }

    // Detect Browser
    if (/edg/i.test(userAgent)) {
        browser = 'Edge';
    } else if (/opr/i.test(userAgent) || /opera/i.test(userAgent)) {
        browser = 'Opera';
    } else if (/chrome|crios/i.test(userAgent)) {
        browser = 'Chrome';
    } else if (/firefox|fxios/i.test(userAgent)) {
        browser = 'Firefox';
    } else if (/safari/i.test(userAgent) && !/chrome|crios|edg|opr|opera/i.test(userAgent)) {
        browser = 'Safari';
    }

    // Form a beautiful name
    let finalName = '';
    if (model) {
        finalName = `${model} (${browser})`;
    } else {
        finalName = `${os} (${browser})`;
    }

    return finalName.replace(/\s+/g, ' ').trim();
};

let cachedIp: string | null = null;

export const getClientIp = async (): Promise<string> => {
    if (cachedIp) return cachedIp;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        if (data.ip) {
            cachedIp = data.ip;
            return data.ip;
        }
    } catch (e) {
        console.warn("Primary IP fetch failed, trying fallback:", e);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        if (data.ip) {
            cachedIp = data.ip;
            return data.ip;
        }
    } catch (e) {
        console.warn("Fallback IP fetch failed:", e);
    }

    return "Bilinmeyen IP";
};

