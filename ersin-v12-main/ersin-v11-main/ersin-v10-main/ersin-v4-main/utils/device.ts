
/**
 * DEVICE MANAGEMENT UTILITIES
 * For Device Fingerprinting and Authorization
 */

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
    let deviceName = 'Bilinmeyen Cihaz';

    if (/android/i.test(userAgent)) deviceName = 'Android Cihaz';
    else if (/iPad|iPhone|iPod/.test(userAgent)) deviceName = 'iOS Cihaz';
    else if (/Windows/i.test(userAgent)) deviceName = 'Windows PC';
    else if (/Mac/i.test(userAgent)) deviceName = 'Mac';
    else if (/Linux/i.test(userAgent)) deviceName = 'Linux PC';

    return deviceName;
};
