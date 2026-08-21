package com.atlascharge.app.auto.screens;

import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.CarIcon;
import androidx.car.app.model.Pane;
import androidx.car.app.model.PaneTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;

import androidx.core.graphics.drawable.IconCompat;

import com.atlascharge.app.R;
import com.atlascharge.app.auto.CarDataBridge;
import com.atlascharge.app.auto.SupabaseApiClient;
import com.google.gson.JsonObject;

import java.util.List;
import java.util.concurrent.Executors;

/**
 * HomeScreen — The main dashboard shown when the driver opens Atlas Charge Plus
 * on their vehicle's Android Auto head unit.
 *
 * Displays: Driver name, truck identification, buffer battery level, duty status.
 * Actions: "View Job Queue" and "Change Duty Status".
 */
public class HomeScreen extends Screen {

    private String batteryText = "Loading...";
    private String truckPlate = "";
    private int activeJobCount = 0;

    public HomeScreen(@NonNull CarContext carContext) {
        super(carContext);
        loadTruckData();
    }

    private void loadTruckData() {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                SupabaseApiClient api = new SupabaseApiClient(getCarContext());
                String truckId = CarDataBridge.getTruckId(getCarContext());
                String driverId = CarDataBridge.getDriverUserId(getCarContext());

                if (truckId != null && !truckId.isEmpty()) {
                    JsonObject truck = api.getTruck(truckId);
                    if (truck != null) {
                        double storedKwh = truck.has("current_stored_kwh") ? truck.get("current_stored_kwh").getAsDouble() : 160;
                        double maxKwh = truck.has("max_battery_kwh") ? truck.get("max_battery_kwh").getAsDouble() : 200;
                        int pct = (int) Math.round((storedKwh / maxKwh) * 100);
                        batteryText = pct + "% (" + String.format("%.0f", storedKwh) + "/" + String.format("%.0f", maxKwh) + " kWh)";
                        truckPlate = truck.has("license_plate") ? truck.get("license_plate").getAsString() : "";
                    }
                }

                if (driverId != null && !driverId.isEmpty()) {
                    List<JsonObject> jobs = api.getAvailableJobs();
                    List<JsonObject> myJobs = api.getDriverOrders(driverId);
                    activeJobCount = jobs.size() + myJobs.size();
                }
            } catch (Exception e) {
                batteryText = "Offline";
            }

            new Handler(Looper.getMainLooper()).post(this::invalidate);
        });
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        String driverName = CarDataBridge.getDriverName(getCarContext());
        String truckName = CarDataBridge.getTruckName(getCarContext());
        String dutyStatus = CarDataBridge.getDutyStatus(getCarContext());
        boolean hasSession = CarDataBridge.hasSession(getCarContext());

        String statusEmoji;
        switch (dutyStatus) {
            case "ON_BREAK": statusEmoji = "☕ On Break"; break;
            case "OFF_DUTY": statusEmoji = "🔴 Off Duty"; break;
            case "DEPOT_RESTOCK": statusEmoji = "📦 Depot Restock"; break;
            case "EN_ROUTE": statusEmoji = "🚛 En Route"; break;
            case "CHARGING_SESSION": statusEmoji = "⚡ Charging"; break;
            default: statusEmoji = "🟢 Available"; break;
        }

        Pane.Builder paneBuilder = new Pane.Builder();

        if (!hasSession) {
            paneBuilder.addRow(new Row.Builder()
                    .setTitle("Not Signed In")
                    .addText("Open Atlas Charge Plus on your phone and sign in as a Driver to connect.")
                    .build());
        } else {
            // Row 1: Driver info
            paneBuilder.addRow(new Row.Builder()
                    .setTitle("🧑‍✈️ " + driverName)
                    .addText(truckName + (truckPlate.isEmpty() ? "" : " · " + truckPlate))
                    .build());

            // Row 2: Battery
            paneBuilder.addRow(new Row.Builder()
                    .setTitle("🔋 Buffer Battery")
                    .addText(batteryText)
                    .build());

            // Row 3: Duty Status
            paneBuilder.addRow(new Row.Builder()
                    .setTitle("📡 Status")
                    .addText(statusEmoji)
                    .build());

            // Row 4: Available jobs
            paneBuilder.addRow(new Row.Builder()
                    .setTitle("📋 Active & Available Jobs")
                    .addText(activeJobCount + " job(s)")
                    .build());

            // Action: View Job Queue
            paneBuilder.addAction(new Action.Builder()
                    .setTitle("View Job Queue")
                    .setBackgroundColor(CarColor.GREEN)
                    .setOnClickListener(() -> {
                        getScreenManager().push(new JobQueueScreen(getCarContext()));
                    })
                    .build());

            // Action: Toggle Duty Status
            paneBuilder.addAction(new Action.Builder()
                    .setTitle(dutyStatus.equals("AVAILABLE") ? "Go Off Duty" : "Go Available")
                    .setOnClickListener(() -> {
                        String newStatus = dutyStatus.equals("AVAILABLE") ? "OFF_DUTY" : "AVAILABLE";
                        CarDataBridge.setDutyStatus(getCarContext(), newStatus);

                        // Update server in background
                        Executors.newSingleThreadExecutor().execute(() -> {
                            SupabaseApiClient api = new SupabaseApiClient(getCarContext());
                            String driverId = CarDataBridge.getDriverUserId(getCarContext());
                            if (driverId != null) {
                                api.updateDriverDuty(driverId, newStatus, !newStatus.equals("OFF_DUTY"));
                            }
                        });

                        invalidate();
                    })
                    .build());
        }

        return new PaneTemplate.Builder(paneBuilder.build())
                .setTitle("⚡ Atlas Charge Plus")
                .setHeaderAction(Action.APP_ICON)
                .build();
    }
}
