const CACHE = 'agrupadora-v30';

// Propios: si alguno falla, el install falla (son imprescindibles).
const ASSETS_LOCALES = [
  '/Extraccion-agrupadora/',
  '/Extraccion-agrupadora/index.html',
  '/Extraccion-agrupadora/manifest.json',
  '/Extraccion-agrupadora/logo.svg',
  '/Extraccion-agrupadora/icon-192.png',
  '/Extraccion-agrupadora/icon-512.png'
];

// Externos: se cachean "best effort". En el WiFi de Andreani el proxy puede
// tumbar alguno y no queremos que eso rompa la instalación entera.
const ASSETS_CDN = [
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
  'https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/umd/index.min.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.addAll(ASSETS_LOCALES)
        .then(() => Promise.allSettled(ASSETS_CDN.map(u => c.add(u))))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});

self.addEventListener('message', e => {
  if (e.data === 'APLICAR_ACTUALIZACION') self.skipWaiting();
});
