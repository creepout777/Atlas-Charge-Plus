package com.atlascharge.app.auto.screens;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.Pane;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;

import com.atlascharge.app.auto.CarDataBridge;
import com.atlascharge.app.auto.SupabaseApiClient;
import com.google.gson.JsonObject;

import java.util.concurrent.Executors;

/**
 * JobDetailScreen — PaneTemplate showing full details of a single dispatch job.
 * Provides Accept and Decline action buttons.
 *
 * On Accept → claims the order via Supabase API and pushes NavigationScreen.
 * On Decline → pops back to JobQueueScreen.
 */
public class JobDetailScreen extends Screen {

    private final JsonObject job;

    public JobDetailScreen(@NonNull CarContext carContext, @NonNull JsonObject job) {
        super(carContext);
        this.job = job;
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        String address = job.has("target_address") ? job.get("target_address").getAsString() : "Unknown Location";
        String status = job.has("status") ? job.get("status").getAsString() : "PENDING";
        String ordRef = job.has("order_reference") ? job.get("order_reference").getAsString() : "N/A";
        String jobId = job.has("id") ? job.get("id").getAsString() : "";

        double callout = job.has("estimated_callout_fee") ? job.get("estimated_callout_fee").getAsDouble() : 5.00;
        double kwhCost = job.has("estimated_kwh_cost") ? job.get("estimated_kwh_cost").getAsDouble() : 12.25;
        double total = job.has("estimated_total_amount") ? job.get("estimated_total_amount").getAsDouble() : 17.25;

        double targetLat = job.has("target_lat") ? job.get("target_lat").getAsDouble() : 0;
        double targetLng = job.has("target_lng") ? job.get("target_lng").getAsDouble() : 0;

        boolean isMyActiveJob = status.equals("EN_ROUTE") || status.equals("ARRIVED") || status.equals("CHARGING");
        boolean isAvailable = status.equals("WAITING_APPROVAL") || status.equals("PENDING_DISPATCH") || status.equals("PENDING");

        Pane.Builder paneBuilder = new Pane.Builder();

        // Row 1: Address
        paneBuilder.addRow(new Row.Builder()
                .setTitle("📍 Destination")
                .addText(address)
                .build());

        // Row 2: Order reference
        paneBuilder.addRow(new Row.Builder()
                .setTitle("🔖 Reference")
                .addText(ordRef)
                .build());

        // Row 3: Cost breakdown
        paneBuilder.addRow(new Row.Builder()
                .setTitle("💷 Estimated Cost")
                .addText("Callout: £" + String.format("%.2f", callout) +
                         " + Energy: £" + String.format("%.2f", kwhCost) +
                         " = Total: £" + String.format("%.2f", total))
                .build());

        // Row 4: Status
        paneBuilder.addRow(new Row.Builder()
                .setTitle("📡 Current Status")
                .addText(status.replace("_", " "))
                .build());

        if (isMyActiveJob) {
            // Already accepted — show Navigate button
            paneBuilder.addAction(new Action.Builder()
                    .setTitle("Navigate to Client")
                    .setBackgroundColor(CarColor.GREEN)
                    .setOnClickListener(() -> {
                        getScreenManager().push(new NavigationScreen(getCarContext(), job));
                    })
                    .build());
        } else if (isAvailable) {
            // Accept Job
            paneBuilder.addAction(new Action.Builder()
                    .setTitle("✅ Accept Job")
                    .setBackgroundColor(CarColor.GREEN)
                    .setOnClickListener(() -> {
                        Executors.newSingleThreadExecutor().execute(() -> {
                            SupabaseApiClient api = new SupabaseApiClient(getCarContext());
                            String driverId = CarDataBridge.getDriverUserId(getCarContext());
                            String truckId = CarDataBridge.getTruckId(getCarContext());

                            if (driverId != null && !jobId.isEmpty()) {
                                boolean success = api.claimOrder(jobId, driverId, truckId);
                                if (success) {
                                    CarDataBridge.setDutyStatus(getCarContext(), "EN_ROUTE");
                                    api.updateDriverDuty(driverId, "EN_ROUTE", true);

                                    // Update job object locally
                                    job.addProperty("status", "EN_ROUTE");
                                    job.addProperty("assigned_driver_id", driverId);
                                    job.addProperty("assigned_truck_id", truckId);
                                }
                            }

                            new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                                getScreenManager().push(new NavigationScreen(getCarContext(), job));
                            });
                        });
                    })
                    .build());

            // Decline
            paneBuilder.addAction(new Action.Builder()
                    .setTitle("❌ Decline")
                    .setOnClickListener(() -> {
                        getScreenManager().pop();
                    })
                    .build());
        }

        return new PaneTemplate.Builder(paneBuilder.build())
                .setTitle("Job Details")
                .setHeaderAction(Action.BACK)
                .build();
    }
}
