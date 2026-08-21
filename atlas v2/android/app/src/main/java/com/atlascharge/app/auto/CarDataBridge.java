package com.atlascharge.app.auto;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * SharedPreferences-based data bridge between the Capacitor WebView app
 * and the native Android Auto CarAppService.
 *
 * Both components run in the same Android process and share the same
 * SharedPreferences file, allowing the car service to read auth credentials
 * and driver/truck info written by the React app on login.
 */
public class CarDataBridge {

    private static final String PREFS_NAME = "atlas_car_bridge";

    // Keys
    public static final String KEY_AUTH_TOKEN = "auth_token";
    public static final String KEY_DRIVER_USER_ID = "driver_user_id";
    public static final String KEY_DRIVER_NAME = "driver_name";
    public static final String KEY_TRUCK_ID = "truck_id";
    public static final String KEY_TRUCK_NAME = "truck_name";
    public static final String KEY_DUTY_STATUS = "duty_status";

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    // --- Write methods (called by Capacitor plugin on login) ---

    public static void syncSession(Context context, String authToken, String driverId,
                                    String driverName, String truckId, String truckName) {
        getPrefs(context).edit()
                .putString(KEY_AUTH_TOKEN, authToken)
                .putString(KEY_DRIVER_USER_ID, driverId)
                .putString(KEY_DRIVER_NAME, driverName)
                .putString(KEY_TRUCK_ID, truckId)
                .putString(KEY_TRUCK_NAME, truckName)
                .putString(KEY_DUTY_STATUS, "AVAILABLE")
                .apply();
    }

    public static void clearSession(Context context) {
        getPrefs(context).edit().clear().apply();
    }

    public static void setDutyStatus(Context context, String status) {
        getPrefs(context).edit().putString(KEY_DUTY_STATUS, status).apply();
    }

    // --- Read methods (called by CarAppService and car screens) ---

    public static String getAuthToken(Context context) {
        return getPrefs(context).getString(KEY_AUTH_TOKEN, null);
    }

    public static String getDriverUserId(Context context) {
        return getPrefs(context).getString(KEY_DRIVER_USER_ID, null);
    }

    public static String getDriverName(Context context) {
        return getPrefs(context).getString(KEY_DRIVER_NAME, "Field Technician");
    }

    public static String getTruckId(Context context) {
        return getPrefs(context).getString(KEY_TRUCK_ID, null);
    }

    public static String getTruckName(Context context) {
        return getPrefs(context).getString(KEY_TRUCK_NAME, "Atlas Mobile Unit");
    }

    public static String getDutyStatus(Context context) {
        return getPrefs(context).getString(KEY_DUTY_STATUS, "AVAILABLE");
    }

    public static boolean hasSession(Context context) {
        return getAuthToken(context) != null && getDriverUserId(context) != null;
    }
}
