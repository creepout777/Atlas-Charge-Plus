package com.atlascharge.app.auto;

import android.content.Intent;

import androidx.annotation.NonNull;
import androidx.car.app.CarAppService;
import androidx.car.app.Screen;
import androidx.car.app.Session;
import androidx.car.app.validation.HostValidator;

import com.atlascharge.app.auto.screens.HomeScreen;

/**
 * Entry point for the Android Auto car app.
 * This service is declared in AndroidManifest.xml and is started by the
 * Android Auto host when the user selects Atlas Charge Plus on the car display.
 */
public class AtlasCarAppService extends CarAppService {

    @NonNull
    @Override
    public HostValidator createHostValidator() {
        // Allow all hosts for development/testing.
        // For production Google Play release, use a specific HostValidator.
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;
    }

    @NonNull
    @Override
    public Session onCreateSession() {
        return new Session() {
            @NonNull
            @Override
            public Screen onCreateScreen(@NonNull Intent intent) {
                return new HomeScreen(getCarContext());
            }
        };
    }
}
