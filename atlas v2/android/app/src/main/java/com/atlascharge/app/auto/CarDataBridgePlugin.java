package com.atlascharge.app.auto;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Custom Capacitor plugin that exposes CarDataBridge to the React/JS layer.
 * Called by AuthContext.jsx on login to persist driver credentials into
 * SharedPreferences so the Android Auto CarAppService can access them
 * independently of the WebView.
 */
@CapacitorPlugin(name = "CarDataBridge")
public class CarDataBridgePlugin extends Plugin {

    @PluginMethod
    public void syncSession(PluginCall call) {
        String authToken = call.getString("authToken", "");
        String driverId = call.getString("driverId", "");
        String driverName = call.getString("driverName", "Field Technician");
        String truckId = call.getString("truckId", "");
        String truckName = call.getString("truckName", "Atlas Mobile Unit");

        CarDataBridge.syncSession(getContext(), authToken, driverId, driverName, truckId, truckName);

        call.resolve();
    }

    @PluginMethod
    public void clearSession(PluginCall call) {
        CarDataBridge.clearSession(getContext());
        call.resolve();
    }

    @PluginMethod
    public void setDutyStatus(PluginCall call) {
        String status = call.getString("status", "AVAILABLE");
        CarDataBridge.setDutyStatus(getContext(), status);
        call.resolve();
    }

    @PluginMethod
    public void getSession(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("authToken", CarDataBridge.getAuthToken(getContext()));
        ret.put("driverId", CarDataBridge.getDriverUserId(getContext()));
        ret.put("driverName", CarDataBridge.getDriverName(getContext()));
        ret.put("truckId", CarDataBridge.getTruckId(getContext()));
        ret.put("truckName", CarDataBridge.getTruckName(getContext()));
        ret.put("dutyStatus", CarDataBridge.getDutyStatus(getContext()));
        ret.put("hasSession", CarDataBridge.hasSession(getContext()));
        call.resolve(ret);
    }
}
