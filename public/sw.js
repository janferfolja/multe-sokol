// Network-first for the app's own files so updates show up right away;
// falls back to the cache when offline. Supabase (data) requests are never cached.
const CACHE = 'multe-sokol-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./'))),
  )
})
