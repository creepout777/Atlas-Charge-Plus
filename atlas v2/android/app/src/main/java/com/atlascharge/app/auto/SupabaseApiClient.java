package com.atlascharge.app.auto;

import android.content.Context;
import android.util.Log;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * Lightweight OkHttp-based REST client that directly calls the Supabase
 * PostgREST API. Used by the Android Auto CarAppService to fetch orders,
 * update statuses, and broadcast GPS — independently of the Capacitor WebView.
 */
public class SupabaseApiClient {

    private static final String TAG = "SupabaseApi";

    // Same credentials as the React app (src/services/supabase.js)
    private static final String SUPABASE_URL = "https://vpiwgdrzxfkilbpicjmq.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwaXdnZHJ6eGZraWxicGljam1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Mzc0NTEsImV4cCI6MjEwMjQxMzQ1MX0.s0jAZZnOwjny9pv69BlUSr5SiRMV7idg2TIdFZZg2G4";

    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final Gson gson = new Gson();

    private final OkHttpClient client;
    private final Context context;

    public SupabaseApiClient(Context context) {
        this.context = context.getApplicationContext();
        this.client = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(10, TimeUnit.SECONDS)
                .build();
    }

    // --- Helper: Build authenticated request ---
    private Request.Builder authRequest(String url) {
        String token = CarDataBridge.getAuthToken(context);
        Request.Builder builder = new Request.Builder()
                .url(url)
                .addHeader("apikey", SUPABASE_ANON_KEY)
                .addHeader("Content-Type", "application/json")
                .addHeader("Prefer", "return=representation");

        if (token != null && !token.isEmpty()) {
            builder.addHeader("Authorization", "Bearer " + token);
        } else {
            builder.addHeader("Authorization", "Bearer " + SUPABASE_ANON_KEY);
        }
        return builder;
    }

    // --- Fetch driver's active and assigned orders ---
    public List<JsonObject> getDriverOrders(String driverId) {
        String url = SUPABASE_URL + "/rest/v1/orders?assigned_driver_id=eq." + driverId
                + "&status=neq.COMPLETED&status=neq.CANCELED&order=created_at.desc";
        return executeGetList(url);
    }

    // --- Fetch unassigned available jobs ---
    public List<JsonObject> getAvailableJobs() {
        String url = SUPABASE_URL + "/rest/v1/orders?assigned_driver_id=is.null"
                + "&or=(status.eq.WAITING_APPROVAL,status.eq.PENDING_DISPATCH,status.eq.PENDING)"
                + "&order=created_at.desc&limit=10";
        return executeGetList(url);
    }

    // --- Claim/accept a job ---
    public boolean claimOrder(String orderId, String driverId, String truckId) {
        String url = SUPABASE_URL + "/rest/v1/orders?id=eq." + orderId;
        JsonObject body = new JsonObject();
        body.addProperty("assigned_driver_id", driverId);
        body.addProperty("assigned_truck_id", truckId);
        body.addProperty("status", "EN_ROUTE");
        return executePatch(url, body);
    }

    // --- Update order status ---
    public boolean updateOrderStatus(String orderId, String status) {
        String url = SUPABASE_URL + "/rest/v1/orders?id=eq." + orderId;
        JsonObject body = new JsonObject();
        body.addProperty("status", status);
        return executePatch(url, body);
    }

    // --- Update order with completion data ---
    public boolean completeOrder(String orderId, double kwhDelivered, int durationMinutes) {
        String url = SUPABASE_URL + "/rest/v1/orders?id=eq." + orderId;
        JsonObject body = new JsonObject();
        body.addProperty("status", "COMPLETED");
        body.addProperty("actual_kwh_delivered", kwhDelivered);
        body.addProperty("actual_duration_minutes", durationMinutes);
        return executePatch(url, body);
    }

    // --- Update truck GPS position ---
    public boolean updateTruckGps(String truckId, double lat, double lng, int bearing) {
        String url = SUPABASE_URL + "/rest/v1/fleet_trucks?id=eq." + truckId;
        JsonObject body = new JsonObject();
        body.addProperty("current_lat", lat);
        body.addProperty("current_lng", lng);
        body.addProperty("current_bearing", bearing);
        return executePatch(url, body);
    }

    // --- Update driver duty status ---
    public boolean updateDriverDuty(String driverUserId, String dutyStatus, boolean isOnDuty) {
        String url = SUPABASE_URL + "/rest/v1/driver_profiles?user_id=eq." + driverUserId;
        JsonObject body = new JsonObject();
        body.addProperty("duty_status", dutyStatus);
        body.addProperty("is_on_duty", isOnDuty);
        return executePatch(url, body);
    }

    // --- Fetch truck info ---
    public JsonObject getTruck(String truckId) {
        String url = SUPABASE_URL + "/rest/v1/fleet_trucks?id=eq." + truckId + "&limit=1";
        List<JsonObject> results = executeGetList(url);
        return results.isEmpty() ? null : results.get(0);
    }

    // --- Insert invoice on job completion ---
    public boolean createInvoice(JsonObject invoiceData) {
        String url = SUPABASE_URL + "/rest/v1/invoices";
        return executePost(url, invoiceData);
    }

    // --- HTTP GET → List<JsonObject> ---
    private List<JsonObject> executeGetList(String url) {
        List<JsonObject> results = new ArrayList<>();
        try {
            Request request = authRequest(url).get().build();
            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    String responseBody = response.body().string();
                    JsonArray array = JsonParser.parseString(responseBody).getAsJsonArray();
                    for (JsonElement el : array) {
                        results.add(el.getAsJsonObject());
                    }
                } else {
                    Log.w(TAG, "GET failed: " + response.code() + " " + url);
                }
            }
        } catch (IOException e) {
            Log.e(TAG, "GET error: " + url, e);
        }
        return results;
    }

    // --- HTTP PATCH ---
    private boolean executePatch(String url, JsonObject body) {
        try {
            RequestBody reqBody = RequestBody.create(gson.toJson(body), JSON);
            Request request = authRequest(url).patch(reqBody).build();
            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    Log.w(TAG, "PATCH failed: " + response.code() + " " + url);
                }
                return response.isSuccessful();
            }
        } catch (IOException e) {
            Log.e(TAG, "PATCH error: " + url, e);
            return false;
        }
    }

    // --- HTTP POST ---
    private boolean executePost(String url, JsonObject body) {
        try {
            RequestBody reqBody = RequestBody.create(gson.toJson(body), JSON);
            Request request = authRequest(url).post(reqBody).build();
            try (Response response = client.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    Log.w(TAG, "POST failed: " + response.code() + " " + url);
                }
                return response.isSuccessful();
            }
        } catch (IOException e) {
            Log.e(TAG, "POST error: " + url, e);
            return false;
        }
    }
}
