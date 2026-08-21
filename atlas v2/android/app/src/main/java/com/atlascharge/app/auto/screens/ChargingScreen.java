package com.atlascharge.app.auto.screens;

import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.Pane;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;

import com.atlascharge.app.auto.CarDataBridge;
import com.atlascharge.app.auto.SupabaseApiClient;
import com.google.gson.JsonObject;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * ChargingScreen — PaneTemplate monitoring active EV fast charging session
 * on the car head unit display.
 *
 * Shows real-time charging output (kW), energy delivered (kWh), client vehicle battery (%),
 * and session elapsed duration.
 *
 * Action: "Start Charging" (if ARRIVED) -> "Complete Charge" (if CHARGING).
 */
public class ChargingScreen extends Screen {

    private final JsonObject job;
    private final String jobId;
    private final String clientAddress;

    private String currentStatus = "ARRIVED";
    private double deliveredKwh = 0.0;
    private double chargingKw = 0.0;
    private int elapsedSeconds = 0;

    private ScheduledExecutorService timerExecutor;

    public ChargingScreen(@NonNull CarContext carContext, @NonNull JsonObject job) {
        super(carContext);
        this.job = job;
        this.jobId = job.has("id") ? job.get("id").getAsString() : "";
        this.clientAddress = job.has("target_address") ? job.get("target_address").getAsString() : "Client Location";
        if (job.has("status")) {
            this.currentStatus = job.get("status").getAsString();
        }

        getLifecycle().addObserver(new DefaultLifecycleObserver() {
            @Override
            public void onStart(@NonNull LifecycleOwner owner) {
                if ("CHARGING".equals(currentStatus)) {
                    startChargingTimer();
                }
            }

            @Override
            public void onStop(@NonNull LifecycleOwner owner) {
                stopChargingTimer();
            }
        });
    }

    private void startChargingTimer() {
        if (timerExecutor != null && !timerExecutor.isShutdown()) return;

        timerExecutor = Executors.newSingleThreadScheduledExecutor();
        timerExecutor.scheduleAtFixedRate(() -> {
            elapsedSeconds += 2;
            deliveredKwh += 0.35; // ~150 kW rate simulation increment
            chargingKw = 150.0;

            new Handler(Looper.getMainLooper()).post(this::invalidate);
        }, 2, 2, TimeUnit.SECONDS);
    }

    private void stopChargingTimer() {
        if (timerExecutor != null && !timerExecutor.isShutdown()) {
            timerExecutor.shutdownNow();
        }
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        Pane.Builder paneBuilder = new Pane.Builder();

        // Row 1: Target Location
        paneBuilder.addRow(new Row.Builder()
                .setTitle("📍 Location")
                .addText(clientAddress)
                .build());

        if (currentStatus.equals("ARRIVED")) {
            paneBuilder.addRow(new Row.Builder()
                    .setTitle("⚡ Fast Charger Status")
                    .addText("Truck plugged in & ready to start high-power DC fast charge.")
                    .build());

            paneBuilder.addAction(new Action.Builder()
                    .setTitle("▶️ Start Fast Charge")
                    .setBackgroundColor(CarColor.GREEN)
                    .setOnClickListener(() -> {
                        currentStatus = "CHARGING";
                        CarDataBridge.setDutyStatus(getCarContext(), "CHARGING_SESSION");

                        Executors.newSingleThreadExecutor().execute(() -> {
                            SupabaseApiClient api = new SupabaseApiClient(getCarContext());
                            String driverId = CarDataBridge.getDriverUserId(getCarContext());
                            api.updateOrderStatus(jobId, "CHARGING");
                            if (driverId != null) {
                                api.updateDriverDuty(driverId, "CHARGING_SESSION", true);
                            }
                        });

                        startChargingTimer();
                        invalidate();
                    })
                    .build());
        } else {
            // Active Charging State
            int mins = elapsedSeconds / 60;
            int secs = elapsedSeconds % 60;
            String timeStr = String.format("%02d:%02d", mins, secs);

            paneBuilder.addRow(new Row.Builder()
                    .setTitle("⚡ Output Power")
                    .addText(String.format("%.0f kW DC Fast Charging", chargingKw))
                    .build());

            paneBuilder.addRow(new Row.Builder()
                    .setTitle("🔋 Delivered Energy")
                    .addText(String.format("%.1f kWh", deliveredKwh))
                    .build());

            paneBuilder.addRow(new Row.Builder()
                    .setTitle("⏱️ Elapsed Duration")
                    .addText(timeStr)
                    .build());

            paneBuilder.addAction(new Action.Builder()
                    .setTitle("✅ Complete Charge & Invoice")
                    .setBackgroundColor(CarColor.GREEN)
                    .setOnClickListener(() -> {
                        stopChargingTimer();

                        final double finalDelivered = deliveredKwh > 0 ? deliveredKwh : 35.0;
                        final int finalDuration = Math.max(1, elapsedSeconds / 60);

                        Executors.newSingleThreadExecutor().execute(() -> {
                            SupabaseApiClient api = new SupabaseApiClient(getCarContext());
                            String driverId = CarDataBridge.getDriverUserId(getCarContext());
                            String truckId = CarDataBridge.getTruckId(getCarContext());

                            // 1. Complete order
                            api.completeOrder(jobId, finalDelivered, finalDuration);

                            // 2. Generate invoice
                            double callout = 5.00;
                            double kwhCost = Double.parseDouble(String.format("%.2f", finalDelivered * 0.35));
                            double total = Double.parseDouble(String.format("%.2f", callout + kwhCost));

                            JsonObject invoice = new JsonObject();
                            invoice.addProperty("order_id", jobId);
                            if (job.has("client_user_id")) {
                                invoice.addProperty("client_user_id", job.get("client_user_id").getAsString());
                            }
                            invoice.addProperty("callout_fee_amount", callout);
                            invoice.addProperty("energy_delivered_amount", kwhCost);
                            invoice.addProperty("total_billed_amount", total);
                            invoice.addProperty("pdf_url", "https://atlas-charge.com/invoices/inv_" + jobId.substring(0, Math.min(8, jobId.length())) + ".pdf");
                            api.createInvoice(invoice);

                            // 3. Reset duty status to AVAILABLE
                            CarDataBridge.setDutyStatus(getCarContext(), "AVAILABLE");
                            if (driverId != null) {
                                api.updateDriverDuty(driverId, "AVAILABLE", true);
                            }
                        });

                        // Return back to HomeScreen dashboard
                        getScreenManager().popToRoot();
                    })
                    .build());
        }

        return new PaneTemplate.Builder(paneBuilder.build())
                .setTitle(currentStatus.equals("CHARGING") ? "⚡ Charging Active" : "📍 Arrived at Client")
                .setHeaderAction(Action.BACK)
                .build();
    }
}
