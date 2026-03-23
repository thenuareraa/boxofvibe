// Service Worker for aggressive audio caching
const CACHE_NAME = 'boxofvibe-audio-v1';
const MAX_CACHE_SIZE = 50; // Cache up to 50 songs (~250MB)

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache audio streaming requests
  if (url.pathname.startsWith('/api/stream/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Try to get from cache first
        const cachedResponse = await cache.match(event.request);

        if (cachedResponse) {
          console.log('Serving from cache:', url.pathname);
          return cachedResponse;
        }

        // If not in cache, fetch and cache it
        console.log('Fetching and caching:', url.pathname);
        const response = await fetch(event.request);

        // Only cache successful responses
        if (response.ok) {
          // Clone the response before caching
          const responseToCache = response.clone();

          // Cache the response
          cache.put(event.request, responseToCache);

          // Clean up old cache entries if needed
          const keys = await cache.keys();
          if (keys.length > MAX_CACHE_SIZE) {
            // Remove oldest entries
            const toDelete = keys.slice(0, keys.length - MAX_CACHE_SIZE);
            await Promise.all(toDelete.map(key => cache.delete(key)));
          }
        }

        return response;
      })
    );
  }
});
