const CACHE = 'bov-audio-v5';
const AUDIO_EXT_RE = /\.(mp3|m4a|aac|ogg|wav|flac)(\?|$)/i;
const knownAudioUrls = new Set();

const isAudio = url => AUDIO_EXT_RE.test(url) || knownAudioUrls.has(url);

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (!isAudio(event.request.url)) return;

  const url = event.request.url;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Look up cached full file (stored without Range header)
    const cached = await cache.match(new Request(url));

    if (cached) {
      const rangeHeader = event.request.headers.get('Range');
      if (!rangeHeader) return cached;

      // Serve correct range slice from the cached full file
      const blob  = await cached.blob();
      const m     = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      const start = m[1] ? +m[1] : 0;
      const end   = m[2] ? Math.min(+m[2], blob.size - 1) : blob.size - 1;
      const slice = blob.slice(start, end + 1);

      return new Response(slice, {
        status: 206,
        headers: {
          'Content-Type':   cached.headers.get('Content-Type') || 'audio/mpeg',
          'Content-Length': String(slice.size),
          'Content-Range':  `bytes ${start}-${end}/${blob.size}`,
          'Accept-Ranges':  'bytes',
        },
      });
    }

    // Not cached — pass through to CDN completely unchanged
    return fetch(event.request);
  })());
});

self.addEventListener('message', async event => {
  const { type, urls = [] } = event.data || {};
  if (!type) return;

  if (type === 'REGISTER_URLS') {
    urls.forEach(u => knownAudioUrls.add(u));
    return;
  }

  if (type === 'PRECACHE_FULL') {
    const cache = await caches.open(CACHE);
    for (const url of urls) {
      if (await cache.match(new Request(url))) continue;
      try {
        const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (res.ok) await cache.put(new Request(url), res);
      } catch {}
    }
  }
});
