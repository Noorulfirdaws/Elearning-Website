// LMS Platform Service Worker — Offline Learning Support
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `lms-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `lms-dynamic-${CACHE_VERSION}`;
const VIDEO_CACHE = `lms-video-${CACHE_VERSION}`;
const API_CACHE = `lms-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/catalog',
  '/offline',
  '/manifest.json',
];

const CACHE_STRATEGIES = {
  static: 'cache-first',
  api: 'network-first',
  video: 'cache-first',
  images: 'stale-while-revalidate',
};

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
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== VIDEO_CACHE && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: routing strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // Video segments — cache first (offline video)
  if (url.pathname.includes('.m3u8') || url.pathname.includes('.ts') || url.pathname.includes('.mp4')) {
    event.respondWith(cacheFirst(request, VIDEO_CACHE, 365 * 24 * 60 * 60 * 1000));
    return;
  }

  // API calls — network first
  if (url.pathname.startsWith('/api/') || url.host.includes('api.')) {
    event.respondWith(networkFirst(request, API_CACHE, 60 * 1000));
    return;
  }

  // Images — stale while revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // Static assets — cache first
  if (url.pathname.match(/\.(js|css|woff2?|ico)$/)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 7 * 24 * 60 * 60 * 1000));
    return;
  }

  // HTML pages — network first with offline fallback
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
