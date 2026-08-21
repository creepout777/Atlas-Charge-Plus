package com.atlascharge.app.auto.screens;

import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;

import com.atlascharge.app.auto.CarDataBridge;
import com.atlascharge.app.auto.SupabaseApiClient;
import com.google.gson.JsonObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

/**
 * JobQueueScreen — ListTemplate showing available dispatch jobs and the
 * driver's currently assigned jobs. Auto-refreshes every 5 seconds.
 *
 * Each row shows address, distance estimate, and charge package info.
 * Tapping a row pushes JobDetailScreen for that specific job.
 */
public class JobQueueScreen extends Screen {

    private List<JsonObject> allJobs = new ArrayList<>();
    private boolean isLoading = true;
    private Handler refreshHandler;
    private Runnable refreshRunnable;

    public JobQueueScreen(@NonNull CarContext carContext) {
        super(carContext);
        loadJobs();
        startAutoRefresh();
    }

    private void loadJobs() {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                SupabaseApiClient api = new SupabaseApiClient(getCarContext());
                String driverId = CarDataBridge.getDriverUserId(getCarContext());

                List<JsonObject> combined = new ArrayList<>();

                // 1. Driver's own active jobs first
                if (driverId != null && !driverId.isEmpty()) {
                    List<JsonObject> myJobs = api.getDriverOrders(driverId);
                    combined.addAll(myJobs);
                }

                // 2. Available unassigned jobs
                List<JsonObject> available = api.getAvailableJobs();
                for (JsonObject job : available) {
                    // Avoid duplicates
                    String jobId = job.has("id") ? job.get("id").getAsString() : "";
                    boolean alreadyAdded = false;
                    for (JsonObject existing : combined) {
                        if (existing.has("id") && existing.get("id").getAsString().equals(jobId)) {
                            alreadyAdded = true;
                            break;
                        }
                    }
                    if (!alreadyAdded) {
                        combined.add(job);
                    }
                }

                allJobs = combined;
                isLoading = false;
            } catch (Exception e) {
                isLoading = false;
            }

            new Handler(Looper.getMainLooper()).post(this::invalidate);
        });
    }

    private void startAutoRefresh() {
        refreshHandler = new Handler(Looper.getMainLooper());
        refreshRunnable = () -> {
            loadJobs();
            refreshHandler.postDelayed(refreshRunnable, 5000);
        };
        refreshHandler.postDelayed(refreshRunnable, 5000);
    }

    @Override
    public void onStop() {
        super.onStop();
        if (refreshHandler != null && refreshRunnable != null) {
            refreshHandler.removeCallbacks(refreshRunnable);
        }
    }

    @NonNull
    @Override
    public Template onGetTemplate() {
        ItemList.Builder listBuilder = new ItemList.Builder();

        if (isLoading) {
            listBuilder.setNoItemsMessage("Loading jobs...");
        } else if (allJobs.isEmpty()) {
            listBuilder.setNoItemsMessage("No dispatch jobs available right now.");
        } else {
            for (JsonObject job : allJobs) {
                String address = job.has("target_address") ? job.get("target_address").getAsString() : "Unknown Location";
                String status = job.has("status") ? job.get("status").getAsString() : "PENDING";
                String ordRef = job.has("order_reference") ? job.get("order_reference").getAsString() : "";

                // Truncate address for car safety
                if (address.length() > 40) {
                    address = address.substring(0, 37) + "...";
                }

                String statusEmoji;
                switch (status) {
                    case "EN_ROUTE": statusEmoji = "🚛 En Route"; break;
                    case "ARRIVED": statusEmoji = "📍 Arrived"; break;
                    case "CHARGING": statusEmoji = "⚡ Charging"; break;
                    case "WAITING_APPROVAL": statusEmoji = "🔔 New Job"; break;
                    default: statusEmoji = "📋 Available"; break;
                }

                // Build estimated cost text
                String costText = "";
                if (job.has("estimated_total_amount")) {
                    costText = " · £" + String.format("%.2f", job.get("estimated_total_amount").getAsDouble());
                }

                final JsonObject jobRef = job;

                listBuilder.addItem(new Row.Builder()
                        .setTitle(address)
                        .addText(statusEmoji + costText + (ordRef.isEmpty() ? "" : " · " + ordRef))
                        .setOnClickListener(() -> {
                            getScreenManager().push(new JobDetailScreen(getCarContext(), jobRef));
                        })
                        .build());
            }
        }

        return new ListTemplate.Builder()
                .setTitle("📋 Job Queue (" + allJobs.size() + ")")
                .setHeaderAction(Action.BACK)
                .setSingleList(listBuilder.build())
                .build();
    }
}
