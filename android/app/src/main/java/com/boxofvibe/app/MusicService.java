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
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MusicService extends Service {

    public static final String CHANNEL_ID    = "bov_music";
    public static final int    NOTIF_ID      = 42;

    public static final String ACTION_PLAY   = "com.boxofvibe.PLAY";
    public static final String ACTION_PAUSE  = "com.boxofvibe.PAUSE";
    public static final String ACTION_NEXT   = "com.boxofvibe.NEXT";
    public static final String ACTION_PREV   = "com.boxofvibe.PREV";
    public static final String ACTION_REPEAT = "com.boxofvibe.REPEAT";
    public static final String ACTION_LIKE   = "com.boxofvibe.LIKE";
    public static final String ACTION_SLEEP  = "com.boxofvibe.SLEEP";
    public static final String ACTION_UPDATE = "com.boxofvibe.UPDATE";
    public static final String ACTION_STOP   = "com.boxofvibe.STOP";

    private String  title     = "BoxOfVibe";
    private String  artist    = "";
    private String  coverUrl  = null;
    private boolean isPlaying = false;
    private boolean isLiked   = false;
    private boolean isRepeat  = false;
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
                isPlaying = true;
                notifyPlugin(action);
                updateNotification();
                return START_STICKY;

            case ACTION_PAUSE:
                isPlaying = false;
                notifyPlugin(action);
                updateNotification();
                return START_STICKY;

            case ACTION_NEXT:
            case ACTION_PREV:
                notifyPlugin(action);
                updateNotification();
                return START_STICKY;

            case ACTION_REPEAT:
                isRepeat = !isRepeat;
                notifyPlugin(action);
                updateNotification();
                return START_STICKY;

            case ACTION_LIKE:
                isLiked = !isLiked;
                notifyPlugin(action);
                updateNotification();
                return START_STICKY;

            case ACTION_SLEEP:
                notifyPlugin(action);
                return START_STICKY;

            case ACTION_UPDATE:
            default:
                title     = intent.getStringExtra("title")    != null ? intent.getStringExtra("title")    : title;
                artist    = intent.getStringExtra("artist")   != null ? intent.getStringExtra("artist")   : artist;
                isPlaying = intent.getBooleanExtra("isPlaying", isPlaying);
                isLiked   = intent.getBooleanExtra("isLiked",   isLiked);
                isRepeat  = intent.getBooleanExtra("isRepeat",  isRepeat);
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

    private void notifyPlugin(String action) {
        if (MusicPlugin.instance != null) {
            MusicPlugin.instance.onNotificationAction(action);
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
        RemoteViews views = new RemoteViews(getPackageName(), R.layout.notification_player);

        views.setTextViewText(R.id.notif_title, title);
        views.setTextViewText(R.id.notif_artist, artist.isEmpty() ? "BoxOfVibe" : artist);

        // Album art
        if (artwork != null) {
            views.setImageViewBitmap(R.id.notif_artwork, artwork);
        } else {
            views.setImageViewResource(R.id.notif_artwork, R.mipmap.ic_launcher);
        }

        // Play/Pause icon swap
        views.setImageViewResource(R.id.notif_play,
            isPlaying ? R.drawable.ic_pause : R.drawable.ic_play);

        // Like icon — pink when liked, white when not
        views.setImageViewResource(R.id.notif_like, R.drawable.ic_heart);
        views.setInt(R.id.notif_like, "setColorFilter",
            isLiked ? 0xFFEC4899 : 0xFFC4B5FD);

        // Repeat icon — bright when active
        views.setInt(R.id.notif_repeat, "setColorFilter",
            isRepeat ? 0xFFA855F7 : 0xFFC4B5FD);

        // Button intents
        views.setOnClickPendingIntent(R.id.notif_sleep,  buildAction(ACTION_SLEEP,  0));
        views.setOnClickPendingIntent(R.id.notif_prev,   buildAction(ACTION_PREV,   1));
        views.setOnClickPendingIntent(R.id.notif_play,   buildAction(isPlaying ? ACTION_PAUSE : ACTION_PLAY, 2));
        views.setOnClickPendingIntent(R.id.notif_next,   buildAction(ACTION_NEXT,   3));
        views.setOnClickPendingIntent(R.id.notif_repeat, buildAction(ACTION_REPEAT, 4));
        views.setOnClickPendingIntent(R.id.notif_like,   buildAction(ACTION_LIKE,   5));

        // Tap notification body to open app
        Intent openApp = new Intent(this, MainActivity.class);
        openApp.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(this, 10, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.notif_root, openPending);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setCustomContentView(views)
            .setCustomBigContentView(views)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setOngoing(true)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setColor(0xFF7C3AED)
            .build();
    }

    private PendingIntent buildAction(String action, int code) {
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
    public void onTaskRemoved(Intent rootIntent) {
        stopForeground(true);
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
