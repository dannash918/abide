'use client'

import { useEffect } from 'react'

export function ClearServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((boolean) => {
            if (boolean) console.log('Old Service Worker cleared.')
            // Force a hard reload once the worker is gone
            window.location.reload()
          })
        }
      })
    }
  }, [])

  return null
}