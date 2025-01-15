/// <reference lib="webworker" />

const CACHE_NAME = 'gym-app-v1';
const API_CACHE_NAME = 'gym-app-api-v1';

// Assets to cache immediately on service worker install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/members',
  '/api/plans',
  '/api/transactions',
];

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle API requests with network-first strategy
  if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(
      networkFirstStrategy(event.request)
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'style' ||
      event.request.destination === 'script' ||
      event.request.destination === 'image') {
    event.respondWith(
      cacheFirstStrategy(event.request)
    );
    return;
  }

  // Default to network-only for other requests
  event.respondWith(fetch(event.request));
});

// Cache-first strategy
async function cacheFirstStrategy(request: Request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached response and update cache in background
    updateCache(request, cache);
    return cachedResponse;
  }

  // If not in cache, fetch from network
  const networkResponse = await fetch(request);
  cache.put(request, networkResponse.clone());
  return networkResponse;
}

// Network-first strategy
async function networkFirstStrategy(request: Request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(API_CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Update cache in background
async function updateCache(request: Request, cache: Cache) {
  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse);
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'New Notification';
  const options = {
    body: data.body ?? 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.url ?? '/',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data)
  );
});

