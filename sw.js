const CACHE = 'agrupadora-v60';

// Propios: si alguno falla, el install falla (son imprescindibles).
const ASSETS_LOCALES = [
  '/nexo/',
  '/nexo/index.html',
  '/nexo/manifest.json',
  '/nexo/icon-192.png',
  '/nexo/icon-512.png',
  '/nexo/icon-glifo-512.png',
  '/nexo/apple-touch-icon.png',
  '/nexo/favicon.png'
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

/* Las navegaciones van a la RED primero, con la caché de respaldo.

   Antes era caché primero para todo, y eso dejaba versiones pegadas: si el
   worker nuevo se quedaba esperando (skipWaiting no siempre prospera), el
   worker viejo seguía sirviendo el index.html viejo por más que recargaras.
   La única salida era cerrar la app entera.

   El corte de 2.5s mantiene la app rápida con señal mala y offline: si la red
   no contesta a tiempo, se sirve lo cacheado igual. */
const TIMEOUT_RED = 2500;
const INDEX = '/nexo/index.html';

self.addEventListener('fetch', e => {
  const req = e.request;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const corte = new Promise((_, rechazar) =>
          setTimeout(() => rechazar(new Error('red lenta')), TIMEOUT_RED));
        const res = await Promise.race([fetch(req.url, { cache: 'no-store' }), corte]);

        /* Un 404 o un 500 NO hacen fallar a `fetch`: resuelven normalmente.
           Sin este chequeo la app le mostraba al usuario la página de error del
           servidor en vez de lo que ya tenía cacheado, que es peor en todos los
           casos: la app instalada no tiene barra de direcciones, así que desde
           ahí no hay forma de salir.

           Tirando el error acá se cae al catch, que sirve la caché. */
        if (!res || !res.ok) throw new Error('el servidor contestó ' + (res && res.status));

        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(INDEX, copia)).catch(() => {});
        return res;
      } catch (err) {
        return (await caches.match(req))
            || (await caches.match(INDEX))
            || (await caches.match('/nexo/'))
            || Response.error();
      }
    })());
    return;
  }

  /* El resto (scripts, íconos, CDN) sigue caché primero: son inmutables por
     versión y así el arranque es instantáneo. */
  e.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});

self.addEventListener('message', e => {
  if (e.data === 'APLICAR_ACTUALIZACION') self.skipWaiting();
});
