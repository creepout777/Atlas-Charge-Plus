import { Capacitor, registerPlugin } from '@capacitor/core';

const CarDataBridgeNative = registerPlugin('CarDataBridge');

/**
 * JavaScript bridge to the native CarDataBridge Capacitor plugin.
 * Syncs authentication and driver data into SharedPreferences so the
 * Android Auto CarAppService can access it independently of the WebView.
 */
export const CarDataBridge = {
  /**
   * Called after login to persist driver session data for Android Auto.
   */
  async syncDriverSession(authToken, driverId, driverName, truckId, truckName) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await CarDataBridgeNative.syncSession({
        authToken: authToken || '',
        driverId: driverId || '',
        driverName: driverName || 'Field Technician',
        truckId: truckId || '',
        truckName: truckName || 'Atlas Mobile Unit',
      });
    } catch (e) {
      console.warn('CarDataBridge.syncDriverSession failed:', e);
    }
  },

  /**
   * Called on logout to clear the car session.
   */
  async clearSession() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await CarDataBridgeNative.clearSession();
    } catch (e) {
      console.warn('CarDataBridge.clearSession failed:', e);
    }
  },

  /**
   * Update the duty status in SharedPreferences for car display.
   */
  async setDutyStatus(status) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await CarDataBridgeNative.setDutyStatus({ status });
    } catch (e) {
      console.warn('CarDataBridge.setDutyStatus failed:', e);
    }
  },
};
