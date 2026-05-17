package com.boxofvibe.app;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MusicNotification")
public class MusicPlugin extends Plugin {

    public static MusicPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @PluginMethod
    public void update(PluginCall call) {
        String title    = call.getString("title", "BoxOfVibe");
        String artist   = call.getString("artist", "");
        String coverUrl = call.getString("coverUrl", null);
        boolean playing = Boolean.TRUE.equals(call.getBoolean("isPlaying", false));

        Intent intent = new Intent(getContext(), MusicService.class);
        intent.setAction(MusicService.ACTION_UPDATE);
        intent.putExtra("title",     title);
        intent.putExtra("artist",    artist);
        intent.putExtra("coverUrl",  coverUrl);
        intent.putExtra("isPlaying", playing);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), MusicService.class);
        intent.setAction(MusicService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    // Called by MusicService when a notification button is tapped
    public void onNotificationAction(String action) {
        String event;
        switch (action) {
            case MusicService.ACTION_PLAY:  event = "play";  break;
            case MusicService.ACTION_PAUSE: event = "pause"; break;
            case MusicService.ACTION_NEXT:  event = "next";  break;
            case MusicService.ACTION_PREV:  event = "prev";  break;
            default: return;
        }
        JSObject data = new JSObject();
        data.put("action", event);
        notifyListeners("notificationAction", data);
    }
}
