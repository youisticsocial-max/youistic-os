// Dummy service worker to satisfy browser extension requests without Next.js 404 overhead
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('fetch', (event) => {
  if (event.request.url.endsWith('.mp4') || event.request.headers.get('range')) {
    return;
  }
});
