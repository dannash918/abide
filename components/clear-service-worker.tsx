'use client'

import { useEffect } from 'react'

export function ClearServiceWorker() {
  useEffect(() => {
    // 1. Clear any old Service Workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }

    // 2. Detect 404/Chunk errors and force a hard reload
    const handleError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const message = 'message' in e ? e.message : e.reason?.message;
      
      // Look for the specific errors shown in your screenshot
      if (
        message?.includes('Loading chunk') || 
        message?.includes('Failed to load resource') ||
        message?.includes('status of 404')
      ) {
        console.log('Detected stale version, forcing reload...');
        window.location.reload(); 
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return null
}