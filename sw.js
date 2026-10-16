const CACHE_NAME = 'atlas-premium-web-v10-purple-premium';
const CORE = ['./', './index.html', './style.css', './script.js', './manifest.webmanifest'];
const OPTIONAL = ['./assets/atlas-globo-aviao.png', './assets/atlas-globo-aviao.ico', './assets/icon-192.png', './assets/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
    await Promise.all(OPTIONAL.map(async path => { try { await cache.add(path); } catch (_) { /* Recurso opcional: não deve bloquear a instalação. */ } }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match('./index.html'))));
});
