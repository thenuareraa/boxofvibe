export default {
  async fetch(request) {
    const url = new URL(request.url);
    const filename = url.pathname.substring(1);

    if (!filename) {
      return new Response('No file', { status: 400 });
    }

    // CORS preflight — cache for 24 hours so browser never repeats it
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const r2PublicUrl = `https://pub-4aa78d03f9f7449881845258641f97a7.r2.dev/${filename}`;

    // Pass Range header through so the browser gets a 206 response
    // and starts playing after downloading just the first few KB
    const upstreamHeaders = new Headers();
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      upstreamHeaders.set('Range', rangeHeader);
    }

    const response = await fetch(r2PublicUrl, {
      headers: upstreamHeaders,
      cf: {
        cacheTtl: 31536000,
        cacheEverything: true,
      },
    });

    if (!response.ok && response.status !== 206) {
      return new Response('Not found', { status: response.status });
    }

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Cache-Control', 'public, max-age=31536000');
    responseHeaders.set('Accept-Ranges', 'bytes');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
