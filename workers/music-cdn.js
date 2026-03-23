/**
 * Use public R2 URL with Cloudflare auto-caching
 * Testing if this is faster than direct bucket access
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const filename = url.pathname.substring(1);

    if (!filename) {
      return new Response('No file', { status: 400 });
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
        },
      });
    }

    const r2PublicUrl = `https://pub-4aa78d03f9f7449881845258641f97a7.r2.dev/${filename}`;

    // Fetch with Cloudflare's cache
    const response = await fetch(r2PublicUrl, {
      cf: {
        cacheTtl: 31536000,
        cacheEverything: true,
      },
    });

    if (!response.ok) {
      return new Response('Not found', { status: 404 });
    }

    // Add CORS
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
};
