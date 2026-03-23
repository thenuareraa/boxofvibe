# Music CDN Worker - Deployment Guide

This Cloudflare Worker caches your audio files globally, reducing load time from 1000ms to 50-100ms (Spotify speed!).

## Deploy to Cloudflare Workers

### Step 1: Install Wrangler (if not already installed)

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser for you to authorize.

### Step 3: Deploy the Worker

```bash
cd workers
wrangler deploy
```

### Step 4: Get Your Worker URL

After deployment, you'll see something like:
```
Published boxofvibe-music-cdn (0.45 sec)
  https://boxofvibe-music-cdn.<your-subdomain>.workers.dev
```

Copy that URL!

### Step 5: Update Your .env.local

Replace this line in your `.env.local`:
```
R2_PUBLIC_URL=https://pub-4aa78d03f9f7449881845258641f97a7.r2.dev
```

With your Worker URL (without trailing slash):
```
R2_PUBLIC_URL=https://boxofvibe-music-cdn.<your-subdomain>.workers.dev
```

### Step 6: Re-sync Songs (IMPORTANT!)

Go to admin panel and click "Sync from Cloudflare R2" to update all song URLs to use the Worker.

## How It Works

1. **First request** - Worker fetches from R2 (slow: ~1000ms)
2. **All future requests** - Worker serves from edge cache (fast: ~50-100ms)
3. Files cached globally across 300+ Cloudflare data centers
4. CORS headers automatically added

## Test It

After deployment, test speed:
```bash
curl -w "\nTime to first byte: %{time_starttransfer}s\n" -o nul -s "YOUR_WORKER_URL/100%20Ways.mp3"
```

Should show ~0.05s instead of ~1.0s!

## Custom Domain (Optional)

You can add a custom domain like `cdn.yourdomain.com`:

1. Go to Cloudflare Dashboard → Workers
2. Click your worker → Settings → Triggers
3. Add Custom Domain
4. Update R2_PUBLIC_URL in .env.local
