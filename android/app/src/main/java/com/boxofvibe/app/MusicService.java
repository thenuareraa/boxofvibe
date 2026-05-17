package com.boxofvibe.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MusicService extends Service {

    public static final String CHANNEL_ID   = "bov_music";
    public static final int    NOTIF_ID     = 42;

    public static final String ACTION_PLAY  = "com.boxofvibe.PLAY";
    public static final String ACTION_PAUSE = "com.boxofvibe.PAUSE";
    public static final String ACTION_NEXT  = "com.boxofvibe.NEXT";
    public static final String ACTION_PREV  = "com.boxofvibe.PREV";
    public static final String ACTION_UPDATE = "com.boxofvibe.UPDATE";
    public static final String ACTION_STOP  = "com.boxofvibe.STOP";

    private String  title     = "BoxOfVibe";
    private String  artist    = "";
    private String  coverUrl  = null;
    private boolean isPlaying = false;
    private Bitmap  artwork   = null;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;

        String action = intent.getAction();
        if (action == null) action = ACTION_UPDATE;

        switch (action) {
            case ACTION_STOP:
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;

            case ACTION_PLAY:
            case ACTION_PAUSE:
            case ACTION_NEXT:
            case ACTION_PREV:
                // Forward to plugin
                if (MusicPlugin.instance != null) {
                    MusicPlugin.instance.onNotificationAction(action);
                }
                // Toggle local play state for notification rebuild
                if (action.equals(ACTION_PLAY))  isPlaying = true;
                if (action.equals(ACTION_PAUSE)) isPlaying = false;
                updateNotification();
                return START_STICKY;

            case ACTION_UPDATE:
            default:
                title     = intent.getStringExtra("title")  != null ? intent.getStringExtra("title")  : title;
                artist    = intent.getStringExtra("artist") != null ? intent.getStringExtra("artist") : artist;
                isPlaying = intent.getBooleanExtra("isPlaying", isPlaying);
                String newCover = intent.getStringExtra("coverUrl");
                if (newCover != null && !newCover.equals(coverUrl)) {
                    coverUrl = newCover;
                    loadArtwork(coverUrl);
                } else {
                    ensureStarted();
                    updateNotification();
                }
                return START_STICKY;
        }
    }

    private void ensureStarted() {
        createChannel();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIF_ID, buildNotification(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIF_ID, buildNotification());
            }
        } catch (Exception e) {
            startForeground(NOTIF_ID, buildNotification());
        }
    }

    private void updateNotification() {
        ensureStarted();
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, buildNotification());
    }

    private Notification buildNotification() {
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(this, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(artist.isEmpty() ? "BoxOfVibe" : artist)
            .setContentIntent(openPending)
            .setOngoing(true)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(R.drawable.ic_skip_prev, "Prev",  buildActionPending(ACTION_PREV,  0))
            .addAction(isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                       isPlaying ? "Pause" : "Play",
                       buildActionPending(isPlaying ? ACTION_PAUSE : ACTION_PLAY, 1))
            .addAction(R.drawable.ic_skip_next, "Next",  buildActionPending(ACTION_NEXT,  2))
            .setStyle(new MediaStyle().setShowActionsInCompactView(0, 1, 2));

        if (artwork != null) builder.setLargeIcon(artwork);

        return builder.build();
    }

    private PendingIntent buildActionPending(String action, int code) {
        Intent i = new Intent(this, MusicService.class);
        i.setAction(action);
        return PendingIntent.getService(this, code, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void loadArtwork(final String url) {
        new Thread(() -> {
            Bitmap bmp = null;
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setDoInput(true);
                conn.connect();
                InputStream in = conn.getInputStream();
                bmp = BitmapFactory.decodeStream(in);
                in.close();
            } catch (Exception ignored) {}
            artwork = bmp;
            ensureStarted();
            updateNotification();
        }).start();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Now Playing", NotificationManager.IMPORTANCE_LOW);
                ch.setShowBadge(false);
                ch.setSound(null, null);
                nm.createNotificationChannel(ch);
            }
        }
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
