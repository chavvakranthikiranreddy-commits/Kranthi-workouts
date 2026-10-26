const CACHE = 'mm-v8';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'quotes.js', 'yoga.js', 'money.js', 'health.js', 'program.js', 'exdb.js', 'moves.js', 'coach.js', 'life.js', 'capacitor.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'fonts/bebas.woff2', 'fonts/inter-400.woff2', 'fonts/inter-500.woff2', 'fonts/inter-600.woff2', 'fonts/inter-700.woff2'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
