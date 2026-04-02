'use client'

import { useEffect } from 'react'

export function ClearServiceWorker() {
  useEffect(() => {
    // 1. Service Worker Management
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          // Force an update check to grab the new Network-First sw.js
          registration.update();
          console.log('Checking for Service Worker updates...');
        } else {
          // Register if missing
          navigator.serviceWorker.register('/sw.js');
        }
      });
    }

    // 2. Detect 404/Chunk errors and force a hard reload
    const handleError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const message = 'message' in e ? e.message : e.reason?.message;
      
      const isChunkError = 
        message?.includes('Loading chunk') || 
        message?.includes('Failed to load resource') ||
        message?.includes('status of 404');

      if (isChunkError) {
        // Prevent infinite reload loops using sessionStorage
        const lastReload = sessionStorage.getItem('last-chunk-fix');
        const now = Date.now();

        // Only auto-reload if we haven't done so in the last 10 seconds
        if (!lastReload || now - parseInt(lastReload) > 10000) {
          sessionStorage.setItem('last-chunk-fix', now.toString());
          console.warn('Detected stale version or missing chunk. Forcing hard reload...');
          
          // Use location.replace to refresh and try to bypass browser cache
          window.location.reload();
        } else {
          console.error('Multiple chunk errors detected. Stopping reload loop to prevent flickering.');
        }
      }
    };

    // Listen for both script loading errors and failed promises (async imports)
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return null
}