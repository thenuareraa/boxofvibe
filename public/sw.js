const CACHE           = 'bov-audio-v4';
const CHUNK_PREFIX    = 'chunk::';
const FULL_PREFIX     = 'full::';
const FIRST_CHUNK     = 307200; // 300 KB

// URLs we know are audio (populated via REGISTER_URLS message)
const knownAudioUrls  = new Set();
const AUDIO_EXT_RE    = /\.(mp3|m4a|aac|ogg|wav|flac)(\?|$)/i;

const isAudio = url => AUDIO_EXT_RE.test(url) || knownAudioUrls.has(url);

// Slice a blob and return a 206 response
function partial(blob, start, end, total) {
  const sliced = blob.slice(start, end + 1);
  return new Response(sliced, {
    status: 206,
    headers: {
      'Content-Type':   'audio/mpeg',
      'Content-Length': String(sliced.size),
      'Content-Range':  `bytes ${start}-${end}/${total}`,
      'Accept-Ranges':  'bytes',
    },
  });
}

function parseRange(header) {
  if (!header) return null;
  const m = header.match(/bytes=(\d*)-(\d*)/);
  if (!m) return null;
  return { start: m[1] ? +m[1] : 0, end: m[2] ? +m[2] : null };
}

// Read cached total size stored alongside chunk
async function getStoredTotal(cache, url) {
  const meta = await cache.match('meta::' + url);
  if (!meta) return null;
  const text = await meta.text();
  return parseInt(text) || null;
}

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

  const url   = event.request.url;
  const range = parseRange(event.request.headers.get('Range'));
  const start = range?.start ?? 0;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // ── 1. Full file cached ─────────────────────────────────────────────────
    const full = await cache.match(FULL_PREFIX + url);
    if (full) {
      if (!range) return full;
      const blob  = await full.blob();
      const end   = range.end ?? blob.size - 1;
      return partial(blob, start, end, blob.size);
    }

    // ── 2. First-chunk cached and request falls within it ───────────────────
    const chunk = await cache.match(CHUNK_PREFIX + url);
    if (chunk && start < FIRST_CHUNK) {
      const blob  = await chunk.blob();
      const total = await getStoredTotal(cache, url) ?? blob.size;
      const end   = range?.end != null ? Math.min(range.end, blob.size - 1) : blob.size - 1;
      return partial(blob, start, end, total);
    }

    // ── 3. Pass straight through — DO NOT block to download full file ────────
    try {
      const res = await fetch(event.request);
      // If we got the whole file (no Range in original request), cache it
      if (res.ok && res.status === 200 && !range) {
        cache.put(FULL_PREFIX + url, res.clone());
      }
      return res;
    } catch {
      return fetch(event.request);
    }
  })());
});

self.addEventListener('message', async event => {
  const { type, urls = [] } = event.data || {};
  if (!type || !urls.length) return;

  // Tell SW which URLs are audio so it can intercept them even without extension
  if (type === 'REGISTER_URLS') {
    urls.forEach(u => knownAudioUrls.add(u));
    return;
  }

  const cache = await caches.open(CACHE);

  if (type === 'PRECACHE_CHUNK') {
    for (const url of urls) {
      if (await cache.match(CHUNK_PREFIX + url)) continue;
      if (await cache.match(FULL_PREFIX  + url)) continue;
      try {
        const res = await fetch(url, {
          headers: { Range: `bytes=0-${FIRST_CHUNK - 1}` },
          mode: 'cors', credentials: 'omit',
        });
        if (res.ok || res.status === 206) {
          // Store total file size from Content-Range header
          const cr = res.headers.get('Content-Range'); // e.g. "bytes 0-307199/4521234"
          if (cr) {
            const total = cr.split('/')[1];
            if (total && total !== '*') {
              await cache.put('meta::' + url, new Response(total));
            }
          }
          await cache.put(CHUNK_PREFIX + url, res);
        }
      } catch {}
      await new Promise(r => setTimeout(r, 150));
    }
  }

  if (type === 'PRECACHE_FULL') {
    for (const url of urls) {
      if (await cache.match(FULL_PREFIX + url)) continue;
      try {
        const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (res.ok) await cache.put(FULL_PREFIX + url, res);
      } catch {}
    }
  }
});
