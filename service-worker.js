const CACHE_NAME = 'expence-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './src/styles/global.css',
    './src/app.js',
    './src/utils/router.js',
    './src/utils/dom.js',
    './src/animations/gsap-setup.js',
    './src/components/bottom-sheet.js',
    './src/components/toast.js',
    './src/firebase/firebase-config.js',
    './src/auth/auth-service.js',
    './src/auth/auth-ui.js',
    './src/transactions/transaction-service.js',
    './src/transactions/add-expense.js',
    './src/categories/category-service.js',
    './src/dashboard/dashboard.js',
    './src/analytics/analytics.js',
    './src/budget/budget-ui.js',
    './src/profile/profile.js',
    './src/utils/export-service.js'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(err => console.log('Cache addAll error:', err))
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event (Network falling back to cache)
self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;
    
    // Ignore Firebase Auth/Firestore API calls for basic offline cache (handled by Firestore offline persistence separately if enabled)
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If valid response, clone and cache it
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request);
            })
    );
});
