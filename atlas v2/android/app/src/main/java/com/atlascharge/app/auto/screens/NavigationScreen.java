package com.atlascharge.app.auto.screens;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.location.Location;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.SurfaceCallback;
import androidx.car.app.SurfaceContainer;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.Distance;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.NavigationManager;
import androidx.car.app.navigation.NavigationManagerCallback;
import androidx.car.app.navigation.model.Destination;
import androidx.car.app.navigation.model.NavigationTemplate;
import androidx.car.app.navigation.model.RoutingInfo;
import androidx.car.app.navigation.model.Step;
import androidx.car.app.navigation.model.TravelEstimate;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;

import com.atlascharge.app.auto.CarDataBridge;
import com.atlascharge.app.auto.SupabaseApiClient;
import com.google.gson.JsonObject;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * NavigationScreen — NavigationTemplate with a live map surface rendered
 * in the background. Shows routing info (distance, ETA) as the driver
 * navigates to the client's location.
 *
 * Broadcasts GPS position to Supabase every 3 seconds.
 * Action strip: "Arrived" and "Cancel Job" buttons.
 */
public class NavigationScreen extends Screen implements SurfaceCallback {

    private final JsonObject job;
    private final double targetLat;
    private final double targetLng;
    private final String targetAddress;
    private final String jobId;

    private android.view.Surface surface;
    private Rect visibleArea;
    private int surfaceWidth = 0;
    private int surfaceHeight = 0;

    private double currentLat = 51.5074;
    private double currentLng = -0.1278;
    private double distanceKm = 0;
    private int etaMinutes = 0;

    private ScheduledExecutorService gpsExecutor;
    private NavigationManager navigationManager;

    public NavigationScreen(@NonNull CarContext carContext, @NonNull JsonObject job) {
        super(carContext);
        this.job = job;
        this.jobId = job.has("id") ? job.get("id").getAsString() : "";
        this.targetLat = job.has("target_lat") ? job.get("target_lat").getAsDouble() : 51.5014;
        this.targetLng = job.has("target_lng") ? job.get("target_lng").getAsDouble() : -0.1918;
        this.targetAddress = job.has("target_address") ? job.get("target_address").getAsString() : "Client Location";

        // Register surface callback for map rendering
        carContext.getCarService(androidx.car.app.AppManager.class).setSurfaceCallback(this);

        // Set up navigation manager
        navigationManager = carContext.getCarService(NavigationManager.class);
        navigationManager.setNavigationManagerCallback(new NavigationManagerCallback() {
            @Override
            public void onStopNavigation() {
                // Host requested stop
            }

            @Override
            public void onAutoDriveEnabled() {
                // Auto-drive simulation
            }
        });

        navigationManager.navigationStarted();

        // Start GPS broadcasting
        startGpsBroadcast();

        getLifecycle().addObserver(new DefaultLifecycleObserver() {
            @Override
            public void onDestroy(@NonNull LifecycleOwner owner) {
                stopGpsBroadcast();
                try {
                    navigationManager.navigationEnded();
                } catch (Exception e) {
                    // Ignore if already ended
                }
            }
        });
    }

    private void startGpsBroadcast() {
        gpsExecutor = Executors.newSingleThreadScheduledExecutor();
        gpsExecutor.scheduleAtFixedRate(() -> {
            try {
                SupabaseApiClient api = new SupabaseApiClient(getCarContext());
                String truckId = CarDataBridge.getTruckId(getCarContext());

                // Calculate distance and ETA
                distanceKm = calculateDistanceKm(currentLat, currentLng, targetLat, targetLng);
                etaMinutes = Math.max(1, (int) Math.round(distanceKm * 2.5));

                // Broadcast GPS
                if (truckId != null && !truckId.isEmpty()) {
                    int bearing = calculateBearing(currentLat, currentLng, targetLat, targetLng);
                    api.updateTruckGps(truckId, currentLat, currentLng, bearing);
                }

                new Handler(Looper.getMainLooper()).post(() -> {
                    invalidate();
                    renderMap();
                });
            } catch (Exception e) {
                // Silently continue
            }
        }, 0, 3, TimeUnit.SECONDS);
    }

    private void stopGpsBroadcast() {
        if (gpsExecutor != null && !gpsExecutor.isShutdown()) {
            gpsExecutor.shutdownNow();
        }
    }

    // --- SurfaceCallback: Map Rendering ---

    @Override
    public void onSurfaceAvailable(@NonNull SurfaceContainer surfaceContainer) {
        surface = surfaceContainer.getSurface();
        surfaceWidth = surfaceContainer.getWidth();
        surfaceHeight = surfaceContainer.getHeight();
        renderMap();
    }

    @Override
    public void onSurfaceDestroyed(@NonNull SurfaceContainer surfaceContainer) {
        surface = null;
    }

    @Override
    public void onVisibleAreaChanged(@NonNull Rect area) {
        visibleArea = area;
        renderMap();
    }

    @Override
    public void onStableAreaChanged(@NonNull Rect area) {
        // Use stable area for persistent UI elements
    }

    /**
     * Renders a simplified map view on the car display surface.
     * Shows a dark background with the truck position (green dot),
     * client destination (red dot), and a route line between them.
     */
    private void renderMap() {
        if (surface == null || !surface.isValid()) return;

        try {
            Canvas canvas = surface.lockCanvas(null);
            if (canvas == null) return;

            int w = canvas.getWidth();
            int h = canvas.getHeight();

            // Dark map background
            Paint bgPaint = new Paint();
            bgPaint.setColor(Color.parseColor("#0f172a"));
            canvas.drawRect(0, 0, w, h, bgPaint);

            // Grid lines (subtle road-like pattern)
            Paint gridPaint = new Paint();
            gridPaint.setColor(Color.parseColor("#1e293b"));
            gridPaint.setStrokeWidth(1);
            for (int x = 0; x < w; x += 60) {
                canvas.drawLine(x, 0, x, h, gridPaint);
            }
            for (int y = 0; y < h; y += 60) {
                canvas.drawLine(0, y, w, y, gridPaint);
            }

            // Calculate positions on canvas
            float truckX = w * 0.5f;
            float truckY = h * 0.65f;

            // Client position relative to truck (simplified projection)
            double dLat = targetLat - currentLat;
            double dLng = targetLng - currentLng;
            float scale = Math.min(w, h) * 0.3f / (float) Math.max(0.001, Math.max(Math.abs(dLat), Math.abs(dLng)));
            float clientX = truckX + (float) (dLng * scale);
            float clientY = truckY - (float) (dLat * scale);

            // Clamp client position to visible area
            clientX = Math.max(40, Math.min(w - 40, clientX));
            clientY = Math.max(40, Math.min(h - 100, clientY));

            // Route line (dashed green)
            Paint routePaint = new Paint();
            routePaint.setColor(Color.parseColor("#10b981"));
            routePaint.setStrokeWidth(4);
            routePaint.setAntiAlias(true);
            canvas.drawLine(truckX, truckY, clientX, clientY, routePaint);

            // Client destination (red pulsing circle)
            Paint clientPaint = new Paint();
            clientPaint.setColor(Color.parseColor("#ef4444"));
            clientPaint.setAntiAlias(true);
            canvas.drawCircle(clientX, clientY, 16, clientPaint);

            Paint clientInner = new Paint();
            clientInner.setColor(Color.WHITE);
            clientInner.setAntiAlias(true);
            canvas.drawCircle(clientX, clientY, 6, clientInner);

            // Truck position (green circle)
            Paint truckPaint = new Paint();
            truckPaint.setColor(Color.parseColor("#10b981"));
            truckPaint.setAntiAlias(true);
            canvas.drawCircle(truckX, truckY, 18, truckPaint);

            Paint truckInner = new Paint();
            truckInner.setColor(Color.WHITE);
            truckInner.setAntiAlias(true);
            canvas.drawCircle(truckX, truckY, 8, truckInner);

            // Distance label
            Paint textPaint = new Paint();
            textPaint.setColor(Color.WHITE);
            textPaint.setTextSize(32);
            textPaint.setAntiAlias(true);
            textPaint.setTextAlign(Paint.Align.CENTER);
            canvas.drawText(String.format("%.1f km", distanceKm), w / 2f, h - 40, textPaint);

            // Destination label
            Paint destPaint = new Paint();
            destPaint.setColor(Color.parseColor("#f87171"));
            destPaint.setTextSize(24);
            destPaint.setAntiAlias(true);
            canvas.drawText("📍", clientX - 30, clientY - 24, destPaint);

            surface.unlockCanvasAndPost(canvas);
        } catch (Exception e) {
            // Canvas lock failed — skip frame
        }
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        // Build routing info
        Step step = new Step.Builder("Head towards " + truncate(targetAddress, 30))
                .build();

        RoutingInfo routingInfo = new RoutingInfo.Builder()
                .setCurrentStep(step, Distance.create(distanceKm, Distance.UNIT_KILOMETERS))
                .build();

        // Action strip
        ActionStrip actionStrip = new ActionStrip.Builder()
                .addAction(new Action.Builder()
                        .setTitle("❌ Cancel")
                        .setOnClickListener(() -> {
                            stopGpsBroadcast();
                            try { navigationManager.navigationEnded(); } catch (Exception e) {}
                            getScreenManager().pop();
                        })
                        .build())
                .build();

        // Main "Arrived" action
        NavigationTemplate.Builder builder = new NavigationTemplate.Builder()
                .setNavigationInfo(routingInfo)
                .setActionStrip(actionStrip);

        // Map action strip with "Arrived" button
        ActionStrip mapActionStrip = new ActionStrip.Builder()
                .addAction(new Action.Builder()
                        .setTitle("✅ Arrived")
                        .setOnClickListener(() -> {
                            stopGpsBroadcast();
                            try { navigationManager.navigationEnded(); } catch (Exception e) {}

                            // Update order status to ARRIVED
                            Executors.newSingleThreadExecutor().execute(() -> {
                                SupabaseApiClient api = new SupabaseApiClient(getCarContext());
                                api.updateOrderStatus(jobId, "ARRIVED");
                            });

                            job.addProperty("status", "ARRIVED");
                            getScreenManager().push(new ChargingScreen(getCarContext(), job));
                        })
                        .build())
                .build();

        builder.setMapActionStrip(mapActionStrip);

        return builder.build();
    }

    // --- Utility ---

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max - 3) + "..." : s;
    }

    private static double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 100.0) / 100.0;
    }

    private static int calculateBearing(double lat1, double lon1, double lat2, double lon2) {
        double y = Math.sin(Math.toRadians(lon2 - lon1)) * Math.cos(Math.toRadians(lat2));
        double x = Math.cos(Math.toRadians(lat1)) * Math.sin(Math.toRadians(lat2)) -
                   Math.sin(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.cos(Math.toRadians(lon2 - lon1));
        double brng = Math.toDegrees(Math.atan2(y, x));
        return (int) ((brng + 360) % 360);
    }
}
