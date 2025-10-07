// Wake Lock API type definitions
interface WakeLockSentinel {
  released: boolean
  type: 'screen'
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
  removeEventListener(type: 'release', listener: () => void): void
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>
}

interface Navigator {
  wakeLock?: WakeLock
}

declare global {
  interface Navigator {
    wakeLock?: WakeLock
  }
}
