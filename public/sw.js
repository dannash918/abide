const CACHE_NAME = 'abide-v2'; // Bumped version
const urlsToCache = [
  '/',
  '/manifest.json',
  '/placeholder-logo.png',
  '/placeholder-logo.svg'
];

self.addEventListener('install', (event) => {
  // Force the new service worker to become active immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open tabs immediately
  );
});

self.addEventListener('fetch', (event) => {
  // NETWORK-FIRST STRATEGY
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network works, update the cache and return
        if (event.request.method === 'GET' && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails (offline), look in cache
        return caches.match(event.request);
      })
  );
});