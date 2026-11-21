/* Service worker — mise en cache de l'application pour un usage hors-ligne. */
const CACHE = 'photoidstudio-v2';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/engine.js',
  'js/render.js',
  'js/enhance.js',
  'js/formats.js',
  'js/sheet.js',
  'js/pdf.js',
  'js/filemeta.js',
  'vendor/mediapipe/vision_bundle.mjs',
  'vendor/mediapipe/vision_wasm_internal.js',
  'vendor/mediapipe/vision_wasm_internal.wasm',
  'vendor/mediapipe/vision_wasm_nosimd_internal.js',
  'vendor/mediapipe/vision_wasm_nosimd_internal.wasm',
  'vendor/models/face_landmarker.task',
  'vendor/models/selfie_segmenter.tflite',
  'icons/icon-192.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/icon-512.png',
  'assets/demo.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        // rafraîchissement en arrière-plan
        fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        }).catch(() => {});
        return cached;
      }
      return fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached || Response.error());
    })
  );
});
