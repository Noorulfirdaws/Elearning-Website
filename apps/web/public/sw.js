// LearnHub Djibouti — Service Worker PWA
// Offline-first pour les élèves djiboutiens avec connexion limitée
const CACHE_VERSION = 'v3';
const STATIC_CACHE    = `learnhub-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE   = `learnhub-dynamic-${CACHE_VERSION}`;
const VIDEO_CACHE     = `learnhub-video-${CACHE_VERSION}`;
const API_CACHE       = `learnhub-api-${CACHE_VERSION}`;
const CHAPITRES_CACHE = `learnhub-chapitres-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/apprendre',
  '/catalog',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

const CACHE_STRATEGIES = {
  static: 'cache-first',
  api: 'network-first',
  video: 'cache-first',
  images: 'stale-while-revalidate',
};

// Active la nouvelle version immédiatement quand la page le demande
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, VIDEO_CACHE, API_CACHE, CHAPITRES_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !validCaches.includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer non-GET et extensions Chrome
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // 1. Pages /apprendre — Network First (frais en ligne, cache en secours hors-ligne)
  if (url.pathname.startsWith('/apprendre')) {
    event.respondWith(networkFirst(request, CHAPITRES_CACHE, 5000));
    return;
  }

  // 2. API chapitres/niveaux/matieres — Network First avec fallback cache
  if (url.pathname.includes('/chapitres') || url.pathname.includes('/niveaux') || url.pathname.includes('/matieres')) {
    event.respondWith(networkFirst(request, CHAPITRES_CACHE, 5000));
    return;
  }

  // 3. Autres appels API — Network First
  if (url.pathname.startsWith('/api/') || url.host.includes('api.')) {
    event.respondWith(networkFirst(request, API_CACHE, 60 * 1000));
    return;
  }

  // 4. Vidéos HLS
  if (url.pathname.includes('.m3u8') || url.pathname.includes('.ts') || url.pathname.includes('.mp4')) {
    event.respondWith(cacheFirst(request, VIDEO_CACHE, 365 * 24 * 60 * 60 * 1000));
    return;
  }

  // 5. Images — stale while revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // 6. Assets statiques (_next/static, JS, CSS, fonts)
  if (url.pathname.startsWith('/_next/static') || url.pathname.match(/\.(js|css|woff2?|ico|png|svg)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 7 * 24 * 60 * 60 * 1000));
    return;
  }

  // 7. Pages HTML — Network First avec fallback /offline
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then(cached => cached || caches.match('/offline'))
    )
  );
});

async function cacheFirst(request, cacheName, maxAge) {
  const cached = await caches.match(request);
  if (cached) {
    const dateHeader = cached.headers.get('date');
    if (dateHeader && maxAge) {
      const age = Date.now() - new Date(dateHeader).getTime();
      if (age < maxAge) return cached;
    } else {
      return cached;
    }
  }
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, timeout) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
    ]);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(cacheName).then(cache => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response('', { status: 404 });
}

// Background sync — queue lesson progress when offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-lesson-progress') {
    event.waitUntil(syncLessonProgress());
  }
});

async function syncLessonProgress() {
  const db = await openIDB('lms-offline');
  const pendingRequests = await getAllFromStore(db, 'pending-requests');

  for (const req of pendingRequests) {
    try {
      await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });
      await deleteFromStore(db, 'pending-requests', req.id);
    } catch {}
  }
}

// IndexedDB helpers
function openIDB(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-requests'))
        db.createObjectStore('pending-requests', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('offline-lessons'))
        db.createObjectStore('offline-lessons', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('progress'))
        db.createObjectStore('progress', { keyPath: 'lessonId' });
    };
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteFromStore(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title || 'LMS Platform', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.url },
      actions: data.actions || [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(clients.openWindow(url));
});
