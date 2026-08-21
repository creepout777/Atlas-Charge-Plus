package com.atlascharge.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.atlascharge.app.auto.CarDataBridgePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CarDataBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
