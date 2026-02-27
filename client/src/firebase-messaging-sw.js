import { cleanupOutdatedCaches, precacheAndRoute, matchPrecache } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies'; // 👈 الإضافة الجديدة عشان الملفات الخارجية

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

try {
    cleanupOutdatedCaches();
    self.skipWaiting();
    clientsClaim();
} catch (e) {
    console.error('❌ [SW-TRACE] Error in CleanupClaim:', e);
}

// 2. تحميل الملفات الأساسية (Pre-caching)
const manifest = self.__WB_MANIFEST || [];
console.log(`📦 [SW-TRACE] Found Manifest wit ${manifest.length} items.`);

try {

    precacheAndRoute(manifest);
    console.log('✅ [SW-TRACE] precacheAndRoute cmpleted successfully.');
} catch (e) {
    console.error('❌ [SW-TRACE] Error in precacheAndRoute:', e)
}

registerRoute(
    new NavigationRoute(async ({ request }) => {

        try {
            const response = await fetch(request);

            return response;
        } catch (error) {


            const fallback1 = await matchPrecache('/index.html');
            if (fallback1) {

                return fallback1;
            }

            const fallback2 = await matchPrecache('index.html');
            if (fallback2) {

                return fallback2;
            }

            console.error('❌ [SW-TRACE] CRITICAL: No falback found in cache!');
            throw error;
        }
    })
);

registerRoute(
    ({ url }) => url.href.includes('clerk.accounts') || url.origin.includes('clerk'),
    new StaleWhileRevalidate({
        cacheName: 'external-scripts-cache',
    })
);


try {
    const firebaseConfig = {
        apiKey: "AIzaSyALykMDILuzNABYm1w-8pScP8Am1oyG4z4",
        authDomain: "flurry-cbbf8.firebaseapp.com",
        projectId: "flurry-cbbf8",
        storageBucket: "flurry-cbbf8.firebasestorage.app",
        messagingSenderId: "362768480508",
        appId: "1:362768480508:web:173e90724500500de83f79"
    };

    const app = initializeApp(firebaseConfig);

    const messaging = getMessaging(app);

    onBackgroundMessage(messaging, (payload) => {
        console.log('🌙 [SW-TRACE] Background Notification Received:', payload);
    });
} catch (error) {
    console.error('❌ [SW-TRACE] Firebase Error:', error);
}

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    let urlToOpen = '/';
    const data = event.notification.data;

    if (data) {
        if (data.click_action && data.click_action !== '/') urlToOpen = data.click_action;
        else if (data.url) urlToOpen = data.url;
        else if (data.chatId) urlToOpen = `/messages/${data.chatId}`;
        else if (data.groupId) urlToOpen = `/groups/${data.groupId}/chat`;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});