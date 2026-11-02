/* Alwan v35 offline repair. Keeps the app's existing localStorage/IndexedDB untouched. */
const CACHE_NAME = 'alwan-v35-pwa-repair-2';
const APP_PREFIX = 'alwan-v35-pwa';
const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './qr-code.png',
  './invoice-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // The main page is essential; optional images/icons must not prevent installation.
    const mainResponse = await fetch('./index.html', { cache: 'reload' });
    if (!mainResponse.ok) throw new Error('Could not cache the application page');
    await cache.put('./index.html', mainResponse.clone());
    await Promise.allSettled(APP_FILES.filter(p => p !== './index.html').map(async (path) => {
      const response = await fetch(path, { cache: 'reload' });
      if (response.ok) await cache.put(path, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(APP_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Firebase/CDN requests remain network-only.

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });

    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        if (response && response.ok) await cache.put('./index.html', response.clone());
        return response;
      } catch (_) {
        return cached || await cache.match('./index.html');
      }
    }

    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return cached || Response.error();
    }
  })());
});
