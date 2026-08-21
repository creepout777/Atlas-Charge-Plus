import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Helper to check if the app is currently running as a native Android/iOS app
 */
export const isNative = () => Capacitor.isNativePlatform();

/**
 * Checks location permission status
 * Returns: { location: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' }
 */
export async function checkLocationPermissions() {
  if (isNative()) {
    try {
      const status = await Geolocation.checkPermissions();
      return status;
    } catch (err) {
      console.warn('[NativePermissions] Failed checking native location permissions:', err);
      return { location: 'prompt' };
    }
  }

  // Web Browser Fallback
  if ('permissions' in navigator && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return { location: result.state }; // 'granted', 'denied', 'prompt'
    } catch (e) {
      return { location: 'prompt' };
    }
  }

  return { location: 'prompt' };
}

/**
 * Explicitly requests location permissions from the user
 */
export async function requestLocationPermissions() {
  if (isNative()) {
    try {
      const status = await Geolocation.requestPermissions();
      return status;
    } catch (err) {
      console.error('[NativePermissions] Error requesting native location permissions:', err);
      return { location: 'denied' };
    }
  }

  // On web, location permissions are prompted automatically upon calling getCurrentPosition
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ location: 'denied' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve({ location: 'granted' }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ location: 'denied' });
        } else {
          resolve({ location: 'prompt' });
        }
      },
      { timeout: 5000 }
    );
  });
}

/**
 * Retrieves the current GPS position using Capacitor Geolocation (Native) or Web Geolocation
 */
export async function getCurrentLocation() {
  if (isNative()) {
    try {
      const perm = await checkLocationPermissions();
      if (perm.location !== 'granted') {
        const req = await requestLocationPermissions();
        if (req.location !== 'granted') {
          throw new Error('Location permission denied by user.');
        }
      }
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      return {
        lat: coordinates.coords.latitude,
        lng: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy,
      };
    } catch (err) {
      console.error('[NativePermissions] Failed getting native position:', err);
      throw err;
    }
  }

  // Web Fallback
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/**
 * Checks Notification permissions (required on Android 13+)
 */
export async function checkNotificationPermissions() {
  if (isNative()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status; // { display: 'granted' | 'denied' | 'prompt' }
    } catch (err) {
      console.warn('[NativePermissions] Error checking local notification permissions:', err);
      return { display: 'prompt' };
    }
  }

  if (typeof Notification !== 'undefined') {
    return { display: Notification.permission }; // 'granted', 'denied', 'default'
  }

  return { display: 'denied' };
}

/**
 * Requests Notification permissions
 */
export async function requestNotificationPermissions() {
  if (isNative()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status;
    } catch (err) {
      console.error('[NativePermissions] Error requesting local notification permissions:', err);
      return { display: 'denied' };
    }
  }

  if (typeof Notification !== 'undefined' && Notification.requestPermission) {
    const res = await Notification.requestPermission();
    return { display: res };
  }

  return { display: 'denied' };
}

/**
 * Sends a local notification (e.g. for dispatch updates or charging status)
 */
export async function sendLocalNotification({ id = Math.floor(Math.random() * 100000), title, body, extra = {} }) {
  if (isNative()) {
    try {
      const perm = await checkNotificationPermissions();
      if (perm.display !== 'granted') {
        const req = await requestNotificationPermissions();
        if (req.display !== 'granted') return false;
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            schedule: { at: new Date(Date.now() + 100) },
            extra,
          },
        ],
      });
      return true;
    } catch (err) {
      console.error('[NativePermissions] Error scheduling native notification:', err);
      return false;
    }
  }

  // Web Notification fallback
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, data: extra });
    return true;
  }

  return false;
}
