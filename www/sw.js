const CACHE = 'vyora-v6';
const PHOTOS = 'vyora-photos-v1'; // Quote-card photos from Unsplash, kept for offline use
const FILES = ['./', 'index.html', 'styles.css', 'prism.css', 'app.js', 'quotes.js', 'yoga.js', 'money.js', 'health.js', 'program.js', 'exdb.js', 'moves.js', 'coach.js', 'life.js', 'capacitor.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'brand/vyora-logo.png', 'brand/vyora-logo-dark.png', 'brand/vyora-mark.png', 'fonts/bebas.woff2', 'fonts/inter-400.woff2', 'fonts/inter-500.woff2', 'fonts/inter-600.woff2', 'fonts/inter-700.woff2'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== PHOTOS).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.hostname === 'images.unsplash.com') {
    // Cache first, then network; keep at most 60 photos.
    e.respondWith(caches.open(PHOTOS).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      const r = await fetch(e.request);
      if (r && (r.ok || r.type === 'opaque')) { c.put(e.request, r.clone()); c.keys().then(ks => { if (ks.length > 60) c.delete(ks[0]); }); }
      return r;
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
