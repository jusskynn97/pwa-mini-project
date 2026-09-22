const CACHE_VERSION = 'vku-inspector-v1.0.0';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './offline.html',
    'https://cdn.jsdelivr.net/npm/localforage@1.10.0/dist/localforage.min.js'
];

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(APP_SHELL_CACHE)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell assets');
                return cache.addAll(APP_SHELL_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.error('[Service Worker] Cache installation failed:', err);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== APP_SHELL_CACHE && cacheName !== RUNTIME_CACHE) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
            .then(() => {
                console.log('[Service Worker] Activation complete');
            })
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (url.origin !== self.location.origin && !url.href.includes('cdn.jsdelivr.net')) {
        return;
    }

    if (request.method !== 'GET') {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request)
                        .then((networkResponse) => {
                            const copy = networkResponse.clone();
                            caches.open(RUNTIME_CACHE).then((cache) => {
                                cache.put(request, copy);
                            });
                            return networkResponse;
                        })
                        .catch(() => caches.match('./index.html'));
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[Service Worker] Serving from cache:', url.pathname);
                    return cachedResponse;
                }

                return fetch(request)
                    .then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            console.log('[Service Worker] Caching new resource:', url.pathname);
                            cache.put(request, responseToCache);
                        });

                        return networkResponse;
                    })
                    .catch((err) => {
                        console.warn('[Service Worker] Fetch failed for:', url.pathname, err);
                        
                        if (request.destination === 'image') {
                            return caches.match('./icons/icon-512x512.png');
                        }
                        
                        return null;
                    });
            })
    );
});

self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background Sync triggered:', event.tag);

    if (event.tag === 'sync-inspections') {
        event.waitUntil(
            syncPendingInspections()
        );
    }
});

async function syncPendingInspections() {
    console.log('[Service Worker] Starting background sync of inspections...');

    try {
        const response = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        const clientsArray = Array.from(response);

        if (clientsArray.length > 0) {
            clientsArray[0].postMessage({
                type: 'BACKGROUND_SYNC_REQUEST'
            });
            console.log('[Service Worker] Sent sync request to client');
        }

        return true;
    } catch (error) {
        console.error('[Service Worker] Background sync failed:', error);
        throw error;
    }
}

self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }
});

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'daily-sync') {
        console.log('[Service Worker] Periodic sync triggered');
        event.waitUntil(syncPendingInspections());
    }
});

self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push notification received');
    
    if (event.data) {
        const data = event.data.json();
        const title = data.title || 'VKU Inspector';
        const options = {
            body: data.body || 'Thông báo mới',
            icon: './icons/icon-192x192.png',
            badge: './icons/icon-192x192.png',
            data: data.data || {},
            vibrate: [200, 100, 200]
        };
        
        event.waitUntil(self.registration.showNotification(title, options));
    }
});

self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url === './index.html' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('./index.html');
                }
            })
    );
});
