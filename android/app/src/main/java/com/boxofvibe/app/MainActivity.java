package com.boxofvibe.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MusicPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
