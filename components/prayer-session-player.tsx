"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Play, Pause, Volume2, VolumeX, X, Monitor, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import type { PrayerTopic, PrayerPoint } from "@/lib/types"

type PrayerFlow = 'everyday' | 'your-prayers' | 'confession' | 'lords-prayer' | 'psalms'

interface PrayerSessionPlayerProps {
  topics: PrayerTopic[]
  selectedFlow: PrayerFlow
  silenceOption: string
  calculatedPauseDuration: string
  voiceType: "rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "amy" | "screenReader" | "none"
  totalSelectedSeconds: number
  onStop: () => void
}

export function PrayerSessionPlayer({
  topics,
  selectedFlow,
  silenceOption,
  calculatedPauseDuration,
  voiceType,
  totalSelectedSeconds,
  onStop
}: PrayerSessionPlayerProps) {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const { user } = useAuth();
  const isDanna = user?.email === "dannash918@gmail.com";
  const totalSessionSeconds = totalSelectedSeconds;
  const cancellationRef = useRef({ cancelled: false })
  const pauseRef = useRef({ paused: false })
  const readingSessionRef = useRef(0)
  const activeAudioRef = useRef<HTMLAudioElement[]>([])
  const activeTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const activeIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([])
  const ttsCacheRef = useRef<Map<string, Blob>>(new Map())
  const ttsFetchPromisesRef = useRef<Map<string, Promise<Blob>>>(new Map())
  const prefetchingRef = useRef(false)
  const [isReady, setIsReady] = useState(false)

  const addTimeout = (id: ReturnType<typeof setTimeout>) => {
    activeTimeoutsRef.current.push(id)
  }
  const removeTimeout = (id: ReturnType<typeof setTimeout> | null) => {
    if (!id) return
    const idx = activeTimeoutsRef.current.indexOf(id)
    if (idx !== -1) activeTimeoutsRef.current.splice(idx, 1)
  }
  const addInterval = (id: ReturnType<typeof setInterval>) => {
    activeIntervalsRef.current.push(id)
  }
  const removeInterval = (id: ReturnType<typeof setInterval> | null) => {
    if (!id) return
    const idx = activeIntervalsRef.current.indexOf(id)
    if (idx !== -1) activeIntervalsRef.current.splice(idx, 1)
  }

  const resetAllTimers = () => {
    // stop the visual progress timer
    stopTimer()
    setTimerProgress(0)

    // clear any registered timeouts
    activeTimeoutsRef.current.forEach(t => {
      try { clearTimeout(t as any) } catch (e) { /* ignore */ }
    })
    activeTimeoutsRef.current = []

    // clear any registered intervals
    activeIntervalsRef.current.forEach(i => {
      try { clearInterval(i as any) } catch (e) { /* ignore */ }
    })
    activeIntervalsRef.current = []
  }

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  const playBlobAudio = (blob: Blob, targetDurationMs?: number): Promise<void> => {
    return new Promise<void>((resolve) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.preload = 'auto'
      // track active audio so we can pause/stop it even if it's not in DOM
      activeAudioRef.current.push(audio)

      let durationMs = 0
      let ended = false

      const cleanup = () => {
        if (ended) return
        ended = true
        // remove from active list
        const idx = activeAudioRef.current.indexOf(audio)
        if (idx !== -1) activeAudioRef.current.splice(idx, 1)
        try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
        // clear visual indicator
        try { setCurrentlyReadingIndex(null) } catch (e) { /* ignore */ }
      }

      audio.onloadedmetadata = () => {
        durationMs = Math.max(0, audio.duration * 1000)
        console.log(`[Audio Duration] ${Math.max(0, audio.duration).toFixed(2)} seconds (${Math.floor(audio.duration/60)}:${Math.floor(audio.duration%60).toString().padStart(2, '0')})`)
        audio.play().catch(() => {
          cleanup()
          resolve()
        })
      }

      audio.onended = async () => {
        cleanup()
        if (typeof targetDurationMs === 'number' && targetDurationMs > durationMs) {
          await sleep(targetDurationMs - durationMs)
        }
        resolve()
      }
      audio.onerror = () => { cleanup(); resolve() }
      audio.onpause = () => { cleanup(); resolve() }

      audio.load()
    })
  }

  // Speak text and return a promise that resolves when speaking completes (or is cancelled)
  const getTtsCacheKey = (provider: string, type: string | undefined, text: string) => `${provider}|${type || 'default'}|${text}`

  const fetchTtsBlob = async (text: string, provider: string, type?: string): Promise<Blob> => {
    const providerParam = provider ? `&provider=${provider}` : ''
    const typeParam = type ? `&type=${type}` : ''
    const response = await fetch(`/api/tts?text=${encodeURIComponent(text)}${providerParam}${typeParam}`)
    if (!response.ok) {
      throw new Error('API failed')
    }
    return await response.blob()
  }

  const getSpeechTextForPoint = (point: PrayerPoint) => {
    if (selectedFlow !== 'psalms' && point.verseReference && !point.verseReference.includes("Lord's Prayer")) {
      return `${point.verseReference} says: ${point.text}`
    }
    return `${point.text}`
  }

  const getTopicSpeechTexts = (topic: PrayerTopic) => {
    const texts = new Set<string>()
    const headerText = topic.customSpeechHeader ?? topic.name
    if (headerText && headerText !== '') {
      texts.add(headerText)
    }
    topic.prayerPoints.forEach((point) => {
      texts.add(getSpeechTextForPoint(point))
    })
    return Array.from(texts)
  }

  const getTtsProviderAndType = () => {
    const provider = voiceType === 'stephen' ? 'stephen' : voiceType
    const type = voiceType === 'stephen' ? 'generative' : undefined
    return { provider, type }
  }

  const getCachedTtsBlob = async (text: string, provider: string, type?: string): Promise<Blob> => {
    const cacheKey = getTtsCacheKey(provider, type, text)
    const cached = ttsCacheRef.current.get(cacheKey)
    if (cached) return cached

    const pending = ttsFetchPromisesRef.current.get(cacheKey)
    if (pending) {
      return pending
    }

    const fetchPromise = fetchTtsBlob(text, provider, type)
      .then((blob) => {
        ttsCacheRef.current.set(cacheKey, blob)
        ttsFetchPromisesRef.current.delete(cacheKey)
        return blob
      })
      .catch((error) => {
        ttsFetchPromisesRef.current.delete(cacheKey)
        throw error
      })

    ttsFetchPromisesRef.current.set(cacheKey, fetchPromise)
    return fetchPromise
  }

  const prefetchTopicAudio = async (topic: PrayerTopic) => {
    if (voiceType === 'none' || voiceType === 'screenReader') return
    if (!topic) return

    const { provider, type } = getTtsProviderAndType()
    const texts = getTopicSpeechTexts(topic).filter((text) => {
      const cacheKey = getTtsCacheKey(provider, type, text)
      return !ttsCacheRef.current.has(cacheKey)
    })

    if (texts.length === 0) return

    const queue = [...texts]
    const maxConcurrent = 3

    const worker = async () => {
      while (queue.length > 0) {
        const text = queue.shift()
        if (!text) break
        try {
          await getCachedTtsBlob(text, provider, type)
        } catch (error) {
          console.warn('Prefetch TTS failed for text:', text, error)
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(maxConcurrent, queue.length) }, () => worker()))
  }

  const getAudioDurationFromBlob = async (blob: Blob): Promise<number> => {
    return new Promise<number>((resolve) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.preload = 'metadata'

      const cleanup = () => {
        try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
      }

      audio.onloadedmetadata = () => {
        const durationMs = Math.max(0, audio.duration * 1000)
        cleanup()
        resolve(durationMs)
      }

      audio.onerror = () => {
        cleanup()
        resolve(0)
      }

      audio.src = url
      audio.load()
    })
  }

  const getPrayerPointClipDuration = async (text: string): Promise<number> => {
    if (voiceType === 'none' || voiceType === 'screenReader') return 0
    const provider = voiceType === 'stephen' ? 'stephen' : voiceType
    const type = voiceType === 'stephen' ? 'generative' : undefined
    try {
      const blob = await getCachedTtsBlob(text, provider, type)
      return await getAudioDurationFromBlob(blob)
    } catch (error) {
      return 0
    }
  }

  const speakText = async (text: string, targetDurationMs?: number): Promise<void> => {
    // If user selected "No Voice", skip speaking entirely
    if (voiceType === 'none') return
    // If muted or paused/cancelled, resolve immediately
    if (cancellationRef.current.cancelled || pauseRef.current.paused || isMuted) return

    // Helper to attempt API-based TTS then fallback to browser speech
    const tryApiThenFallback = async (provider?: string, opts?: { generative?: boolean }) => {
      try {
        const resolvedProvider = provider || voiceType
        const resolvedType = opts?.generative ? 'generative' : undefined
        const blob = await getCachedTtsBlob(text, resolvedProvider, resolvedType)
        await playBlobAudio(blob, targetDurationMs)
        return
      } catch (err) {
        // fallback to browser speech synthesis
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const startTime = performance.now()
          await new Promise<void>((resolve) => {
            try {
              const utterance = new SpeechSynthesisUtterance(text)
              utterance.rate = 0.65
              utterance.pitch = 0.9
              utterance.volume = 0.8
              utterance.onend = () => resolve()
              utterance.onerror = () => resolve()
              window.speechSynthesis.speak(utterance)
            } catch (e) {
              resolve()
            }
          })
          if (typeof targetDurationMs === 'number') {
            const elapsed = performance.now() - startTime
            if (elapsed < targetDurationMs) {
              await sleep(targetDurationMs - elapsed)
            }
          }
        }
      }
    }

    // Select provider flow based on voiceType
    if (voiceType === 'rachel' || voiceType === 'maysie') {
      await tryApiThenFallback(voiceType)
    } else if (voiceType === 'polly' || voiceType === 'danielle' || voiceType === 'patrick' || voiceType === 'amy') {
      await tryApiThenFallback(voiceType)
    } else if (voiceType === 'stephen') {
      await tryApiThenFallback('stephen', { generative: true })
    } else {
      // screenReader or unknown -> browser speech synthesis
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const startTime = performance.now()
        await new Promise<void>((resolve) => {
          try {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.rate = 0.65
            utterance.pitch = 0.9
            utterance.volume = 0.8
            utterance.onend = () => resolve()
            utterance.onerror = () => resolve()
            window.speechSynthesis.speak(utterance)
          } catch (e) {
            resolve()
          }
        })
        if (typeof targetDurationMs === 'number') {
          const elapsed = performance.now() - startTime
          if (elapsed < targetDurationMs) {
            await sleep(targetDurationMs - elapsed)
          }
        }
      }
    }
  }

  const [currentTopics, setCurrentTopics] = useState<PrayerTopic[]>(topics)
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0)
  const [topicNames, setTopicNames] = useState<string[]>(topics.map(t => t.name))
  const [currentlyReadingIndex, setCurrentlyReadingIndex] = useState<number | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen] = useState(true)
  const [timerProgress, setTimerProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const totalTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const announcedTopicsRef = useRef<Set<number>>(new Set())


  // Timer for total session elapsed time
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Start elapsed timer on mount, stop on unmount or stopPraying
  useEffect(() => {
    if (!pauseRef.current.paused) {
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current)
        elapsedIntervalRef.current = null
      }
    }
  }, [])

  // Pause/resume elapsed timer
  useEffect(() => {
    if (isPaused) {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current)
        elapsedIntervalRef.current = null
      }
    } else {
      if (!elapsedIntervalRef.current) {
        elapsedIntervalRef.current = setInterval(() => {
          setElapsedSeconds((prev) => prev + 1)
        }, 1000)
      }
    }
    return () => {}
  }, [isPaused])

  // Reset timer on stop
  const resetElapsedTimer = () => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current)
      elapsedIntervalRef.current = null
    }
    setElapsedSeconds(0)
  }

  const makeSpeakableText = (text: string): string => {
    // Clean up text for TTS: replace newlines with spaces, clean up quotes, etc.
    return text
      .replace(/\n\n/g, ' ')  // Double newlines to space
      .replace(/\n/g, ' ')    // Single newlines to space
      .replace(/"/g, '')      // Remove quotes
      .replace(/—/g, ",")     // Replace emdash with comma
      .trim()
  }

  const requestWakeLock = async () => {
    try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        const wakeLockSentinel = await navigator.wakeLock.request('screen')
        setWakeLock(wakeLockSentinel)

        wakeLockSentinel.addEventListener('release', () => {
          console.log('Wake lock was released')
          setWakeLock(null)

          // Try to re-request wake lock if prayer session is still active and we were recently released
          if (document.visibilityState === 'visible') {
            setTimeout(async () => {
              try {
                const newWakeLock = await navigator.wakeLock.request('screen')
                setWakeLock(newWakeLock)
                console.log('Wake lock re-acquired after release')
                newWakeLock.addEventListener('release', () => {
                  setWakeLock(null)
                })
              } catch (err) {
                console.warn('Failed to re-request wake lock after release:', err)
              }
            }, 1000)
          }
        })

        // Listen for visibility change to re-acquire wake lock when tab becomes visible again
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && !wakeLock) {
            setTimeout(async () => {
              try {
                const newWakeLock = await navigator.wakeLock.request('screen')
                setWakeLock(newWakeLock)
                console.log('Wake lock re-acquired after tab became visible')
                newWakeLock.addEventListener('release', () => {
                  setWakeLock(null)
                })
              } catch (err) {
                console.warn('Failed to re-request wake lock after visibility change:', err)
              }
            }, 500)
          }
        })

        console.log('Wake lock acquired for prayer session')
      }
    } catch (err) {
      console.warn('Failed to acquire wake lock:', err)
      setWakeLock(null)
    }
  }

  const releaseWakeLock = () => {
  if (wakeLock) {
      wakeLock.release()
      setWakeLock(null)
    }
  }

  const stopPraying = () => {
    cancellationRef.current.cancelled = true
    resetElapsedTimer()

    setIsPaused(false)
    setTopicNames([])
    setCurrentlyReadingIndex(null)
    announcedTopicsRef.current.clear() // Clear announced topics for next session

    // Cancel any ongoing speech synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    // Cancel any ongoing audio playback
    activeAudioRef.current.forEach(audio => {
      try {
        audio.pause()
        audio.currentTime = 0
      } catch (e) {
        // ignore
      }
    })
    activeAudioRef.current = []

    // Reset any timers used for pauses/progress
    resetAllTimers()

    // Release wake lock
    releaseWakeLock()

    onStop()
  }

  const nextTopic = () => {
    setCurrentlyReadingIndex(null)

    // Stop any ongoing TTS
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    activeAudioRef.current.forEach(audio => {
      try {
        audio.pause()
        audio.currentTime = 0
      } catch (e) {
        // ignore
      }
    })
    activeAudioRef.current = []

  // Reset timers when navigating
  resetAllTimers()

    if (currentTopicIndex < topicNames.length - 1) {
      setCurrentTopicIndex(currentTopicIndex + 1)
    } else {
      stopPraying()
    }
  }

  const previousTopic = () => {
    setCurrentlyReadingIndex(null)

    // Stop any ongoing TTS
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    activeAudioRef.current.forEach(audio => {
      try {
        audio.pause()
        audio.currentTime = 0
      } catch (e) {
        // ignore
      }
    })
    activeAudioRef.current = []

  // Reset timers when navigating
  resetAllTimers()

    // Remove the current topic and the upcoming previous topic from announced topics
    if (currentTopicIndex > 0) {
      announcedTopicsRef.current.delete(currentTopicIndex)
      announcedTopicsRef.current.delete(currentTopicIndex - 1)
      setCurrentTopicIndex(currentTopicIndex - 1)
    }
  }

  const togglePause = () => {
    pauseRef.current.paused = !pauseRef.current.paused
    setIsPaused(pauseRef.current.paused)

    // Cancel any ongoing speech synthesis when pausing
    if (pauseRef.current.paused && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    // Pause all current audio elements immediately when pausing
    if (pauseRef.current.paused) {
      // reset timers and pause audio
      resetAllTimers()
      activeAudioRef.current.forEach(audio => {
        try {
          audio.pause()
        } catch (e) {
          // ignore
        }
      })
    } else {
      // Resuming: restart the current topic/session from the top of the screen.
      // Cancel any partial playback and speech so we start fresh.
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }

      // Stop and cleanup any tracked audio so we don't resume mid-clip
      activeAudioRef.current.forEach(audio => {
        try {
          audio.pause()
          audio.currentTime = 0
        } catch (e) {
          // ignore
        }
      })
      activeAudioRef.current = []

      // Clear reading indicator
      setCurrentlyReadingIndex(null)

      // Remove announcement flag so the effect will re-announce the topic
      announcedTopicsRef.current.delete(currentTopicIndex)

      // Bump the reading session id to cancel any dangling async reads
      readingSessionRef.current++

      // Reset timers so the pause/resume shows from the beginning
      resetAllTimers()
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  // Timer functions to control the circular progress ring
  const startTimer = (durationMs?: number) => {
    if (timerRef.current) {
      try { clearTimeout(timerRef.current as any) } catch (e) { /* ignore */ }
    }
    // Determine the duration based on the current topic or explicit override
    let effectiveDuration = durationMs
    if (typeof effectiveDuration === 'undefined') {
      const currentTopic = topicNames[currentTopicIndex]
      const isSilencing = currentTopic === 'Silence'
      effectiveDuration = isSilencing
        ? Number.parseInt(silenceOption) * 1000
        : Number.parseInt(calculatedPauseDuration) * 1000
    }

    const startTime = Date.now()

    setTimerProgress(0) // Reset to empty

    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / (effectiveDuration as number)) * 100, 100)
      setTimerProgress(progress)

      if (elapsed < (effectiveDuration as number)) {
        timerRef.current = setTimeout(updateProgress, 50)
        if (timerRef.current) addTimeout(timerRef.current)
      }
    }

    // Start the timer
    timerRef.current = setTimeout(updateProgress, 50)
    if (timerRef.current) addTimeout(timerRef.current)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      try { clearTimeout(timerRef.current as any) } catch (e) { /* ignore */ }
      removeTimeout(timerRef.current)
      timerRef.current = null
      setTimerProgress(0)
    }
  }

  const completeTimer = () => {
    if (timerRef.current) {
      try { clearTimeout(timerRef.current as any) } catch (e) { /* ignore */ }
      removeTimeout(timerRef.current)
      timerRef.current = null
      setTimerProgress(100)
    }
  }

  // Cleanup timers and wake lock on unmount
  useEffect(() => {
  return () => {
      stopTimer()
      if (totalTimeIntervalRef.current) {
        clearInterval(totalTimeIntervalRef.current)
      }
      ttsCacheRef.current.clear()
      ttsFetchPromisesRef.current.clear()
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [wakeLock])

  useEffect(() => {
    if (!isReady) return
    if (!isPaused && !isMuted && topicNames.length > 0 && !announcedTopicsRef.current.has(currentTopicIndex)) {

      // Increment session to cancel any previous reading
      readingSessionRef.current++

      const currentTopic = topicNames[currentTopicIndex]
      const currentPrayerPoints = currentTopics[currentTopicIndex]?.prayerPoints || []

      if (currentPrayerPoints.length > 0) {
        // Capture the topic index at the start to detect if it gets skipped
        const originalTopicIndex = currentTopicIndex

        // Read all prayer points for the current topic
        const readPrayerPoints = async () => {
          const currentSession = readingSessionRef.current

          // Add a 2-second gap at the beginning before announcing the first topic
          if (currentTopicIndex === 0) {
            await sleep(2000)
          }

          // Ensure the current topic audio is ready before announcing or speaking
          const topic = currentTopics[currentTopicIndex]
          await prefetchTopicAudio(topic)
          if (currentTopicIndex + 1 < currentTopics.length) {
            void prefetchTopicAudio(currentTopics[currentTopicIndex + 1])
          }

          // First, announce the topic based on header settings
          let topicAnnouncement: string | null = null
          if (topic?.customSpeechHeader === '') {
            // Don't announce if explicitly silenced or custom header is empty string
          } else if (topic?.customSpeechHeader) {
            topicAnnouncement = topic.customSpeechHeader
          } else {
            topicAnnouncement = topic?.name || null
          }
          if (topicAnnouncement) {
            announcedTopicsRef.current.add(currentTopicIndex)

            // Create a 5-second timer that starts now (when the API call will be initiated)
            let fiveSecResolve: () => void
            const fiveSecPromise = new Promise<void>((resolve) => {
              fiveSecResolve = resolve
            })
            // Start the 5s timer with cancellation checks
            const fiveCheckInterval = setInterval(() => {
              if (cancellationRef.current.cancelled || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) {
                try { clearInterval(fiveCheckInterval as any) } catch (e) { /* ignore */ }
                removeInterval(fiveCheckInterval)
                try { fiveSecResolve && fiveSecResolve() } catch (e) { /* ignore */ }
                return
              }
            }, 100)
            addInterval(fiveCheckInterval)
            const fiveTimeout = setTimeout(() => {
              try { clearInterval(fiveCheckInterval as any) } catch (e) { /* ignore */ }
              removeInterval(fiveCheckInterval)
              try { fiveSecResolve && fiveSecResolve() } catch (e) { /* ignore */ }
              removeTimeout(fiveTimeout)
            }, 5000)
            addTimeout(fiveTimeout)

            // announcementPromise resolves when the announcement audio completes (or fallback completes)
            let announcementPromise: Promise<void> = Promise.resolve()

            if (voiceType !== 'none') {
              announcementPromise = speakText(topicAnnouncement, 5000)
            }

            // Wait for BOTH the 5s timer (which started when the API call was initiated)
            // and the announcement playback to complete. This ensures the first prayer
            // point starts no earlier than 5s after the API call and also doesn't
            // start while the announcement is still playing.
            try {
              await Promise.all([fiveSecPromise, announcementPromise])
            } catch (e) {
              // ignore - cancellation or errors are handled elsewhere
            }
          }

          let readingCompleted = false
          for (let i = 0; i < currentPrayerPoints.length; i++) {
            if (cancellationRef.current.cancelled || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) break

            const point = currentPrayerPoints[i]
            const textToSpeak = selectedFlow !== 'psalms' && point.verseReference && !point.verseReference.includes('Lord\'s Prayer')
              ? `${point.verseReference} says: ${point.text}`
              : `${point.text}`

            // Double check cancellation right before TTS starts
            if (cancellationRef.current.cancelled || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) break

            // Set the currently reading index for visual feedback
            setCurrentlyReadingIndex(i)

            let durationMs
            if (point.autoContinue) {
              if (currentTopic === 'Silence') {
                const silencePoints = currentPrayerPoints.length
                const silenceTotal = Number.parseInt(silenceOption)
                const silencePerPoint = silencePoints > 0 ? silenceTotal / silencePoints : 0
                durationMs = silencePerPoint * 1000 + 2000
              } else {
                const clipDurationMs = await getPrayerPointClipDuration(textToSpeak)
                durationMs = Math.max(2000, clipDurationMs + 2000)
              }
            } else if (currentTopic === 'Silence') {
              const silencePoints = currentPrayerPoints.length
              const silenceTotal = Number.parseInt(silenceOption)
              const silencePerPoint = silencePoints > 0 ? silenceTotal / silencePoints : 0
              durationMs = silencePerPoint * 1000
            } else {
              durationMs = Number.parseInt(calculatedPauseDuration) * 1000
            }

            // Start the timer as soon as we begin the TTS call (or invoke speech)
            startTimer(durationMs);

            // Create a promise that resolves when the timer duration completes (or is cancelled/paused)
            const timerPromise: Promise<void> = new Promise((resolve) => {
              const checkInterval = setInterval(() => {
                if (
                  cancellationRef.current.cancelled ||
                  pauseRef.current.paused ||
                  isMuted ||
                  currentTopicIndex !== originalTopicIndex ||
                  currentSession !== readingSessionRef.current
                ) {
                  try { clearInterval(checkInterval as any) } catch (e) { /* ignore */ }
                  removeInterval(checkInterval)
                  resolve()
                  return
                }
              }, 100)
              addInterval(checkInterval)

              const t = setTimeout(() => {
                try { clearInterval(checkInterval as any) } catch (e) { /* ignore */ }
                removeInterval(checkInterval)
                removeTimeout(t)
                completeTimer(); // mark visual timer complete
                resolve()
              }, durationMs)
              addTimeout(t)
            })

            // Create TTS promise which resolves when speech/audio completes (or is cancelled)
            const ttsPromise = (async () => {
              try {
                await speakText(textToSpeak, durationMs)
              } catch (e) {
                // swallow errors - we still want to wait for timer
              }
            })()

            // Wait until BOTH the timer and the TTS have finished (so we don't skip if TTS overruns)
            await Promise.all([timerPromise, ttsPromise])

            // Pause after each prayer point (using the selected duration for non-silence, and divided silence duration for silence)
            // Skip pause for Lord's Prayer to finish immediately
            // Getting rid of as it breaks some stuff
            // if (currentTopic !== "Lord's Prayer") {
            //   await new Promise<void>((resolve) => {
            //     const checkInterval = setInterval(() => {
            //       if (
            //         cancellationRef.current.cancelled ||
            //         pauseRef.current.paused ||
            //         isMuted ||
            //         currentTopicIndex !== originalTopicIndex ||
            //         currentSession !== readingSessionRef.current
            //       ) {
            //         try { clearInterval(checkInterval as any) } catch (e) { /* ignore */ }
            //         removeInterval(checkInterval);
            //         stopTimer(); // Stop timer if pause is interrupted
            //         resolve();
            //         return;
            //       }
            //     }, 100);
            //     addInterval(checkInterval);

            //     const t = setTimeout(() => {
            //       try { clearInterval(checkInterval as any) } catch (e) { /* ignore */ }
            //       removeInterval(checkInterval);
            //       removeTimeout(t);
            //       completeTimer(); // Complete timer when pause completes naturally (keeps at 100%)
            //       resolve();
            //     }, durationMs);
            //     addTimeout(t);
            //   });
            // }

            // If we got to the end of the loop without breaking, mark as completed
            if (i === currentPrayerPoints.length - 1) {
              readingCompleted = true
            }
          }
          setCurrentlyReadingIndex(null)

          // Only advance to next topic if reading completed naturally
          if (readingCompleted) {
            const tNext = setTimeout(() => {
              removeTimeout(tNext)
              if (!pauseRef.current.paused && !isMuted) {
                nextTopic()
              }
            }, 1000) // 1 second pause before next topic
            addTimeout(tNext)
          }
        }

        readPrayerPoints()
      }

      return () => {
        // Cleanup if needed
      }
    }
  }, [isReady, isPaused, isMuted, currentTopicIndex, topicNames, currentTopics, calculatedPauseDuration, voiceType, selectedFlow])

  // Cleanup wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [wakeLock])

  // Start the prayer session when component mounts
  useEffect(() => {
    setCurrentTopics(topics)
    setTopicNames(topics.map(t => t.name))
    setCurrentTopicIndex(0)
    cancellationRef.current.cancelled = false
    pauseRef.current.paused = false

    // Debug logs - detailed breakdown
    console.log('🍃 Prayer Session Started')
    topics.forEach((topic, index) => {
      const topicNumber = index + 1
      console.log(`${topicNumber}. ${topic.name}`)

      topic.prayerPoints.forEach((point, pointIndex) => {
        console.log(`   └─ ${pointIndex + 1}. "${point.text}"`)
      })

      console.log('')
    })

    // Request wake lock to prevent screen from turning off
    requestWakeLock()

    const prepareInitialAudio = async () => {
      if (voiceType === 'none' || voiceType === 'screenReader') {
        setIsReady(true)
        return
      }
      if (topics.length > 0) {
        await prefetchTopicAudio(topics[0])
      }
      setIsReady(true)
    }

    void prepareInitialAudio()
  }, [])

  if (!isReady) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center p-8 z-50">
        <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-semibold mb-2">Preparing your prayer session</h2>
          <p className="text-sm text-muted-foreground">Get ready to pray.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${isFullscreen ? "fixed inset-0 bg-white flex flex-col p-8 z-50" : "space-y-4"}`}>
      <div className={`${isFullscreen ? "absolute top-0 left-0 right-0" : "mb-4"}`}>
        <div className="w-full bg-secondary/30 h-1">
          <div
            className="bg-primary h-1 transition-all duration-300"
            style={{ width: `${((currentTopicIndex + 1) / topicNames.length) * 100}%` }}
          />
        </div>
      </div>

      {isFullscreen && (
        <button
          onClick={stopPraying}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted/20 transition-colors"
          aria-label="Exit prayer session"
        >
          <X className="w-6 h-6 text-muted-foreground" />
        </button>
      )}

      <div className={`${isFullscreen ? "flex-1 flex items-center justify-center pb-28" : ""}`}>
        <div className={`${isFullscreen ? "max-w-4xl w-full" : ""}`}>
        {topicNames[currentTopicIndex] && (
          <div className="text-center mb-8">
            <h2 className={`${isFullscreen ? "text-3xl md:text-4xl" : "text-2xl"} text-primary font-bold mb-6`}>
              {currentTopics[currentTopicIndex]?.name}
            </h2>
            <div className="space-y-4 text-left max-w-3xl mx-auto">
              {currentTopics[currentTopicIndex]?.prayerPoints.map((point, index) => (
                <div
                  key={point.id}
                  className={`${isFullscreen ? "text-lg md:text-xl" : "text-base"} p-4 rounded-lg border transition-all duration-300 ${
                    currentlyReadingIndex === index
                      ? "bg-primary/20 border-primary/50 shadow-lg scale-[1.02]"
                      : "bg-muted/30 border-primary/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <p className={`leading-relaxed flex-1 ${point.id === 'lords-prayer-1' ? 'whitespace-pre-line' : ''}`}>
                      {point.text}
                      {point.verseReference && (
                        <span className={`${isFullscreen ? "text-sm" : "text-xs"} text-muted-foreground block mt-2`}>
                          — {point.verseReference}
                        </span>
                      )}
                    </p>
                    {currentlyReadingIndex === index && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Floating controls box (stays on top, bottom-centered) */}
      <div className="fixed left-1/2 bottom-6 transform -translate-x-1/2 w-[min(680px,calc(100%-32px))] bg-background/90 dark:bg-surface/95 rounded-xl shadow-xl p-4 z-50">
        <div className="flex flex-col items-center">
          <div className="w-full mb-2">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">Prayer {currentTopicIndex + 1} of {topicNames.length}</div>
              {isDanna && (
                <div className="text-sm font-mono text-primary" aria-label="Elapsed time">
                  {`${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`}
                  {" / "}
                  {`${Math.floor(totalSessionSeconds / 60)}:${(totalSessionSeconds % 60).toString().padStart(2, "0")}`}
                </div>
              )}
            </div>
            <div className="mt-2">
              <Progress value={timerProgress} className="w-full h-2 rounded-full" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousTopic}
              disabled={currentTopicIndex === 0}
              className="h-12 w-12 rounded-full bg-background/50 border border-primary/10 hover:bg-background/80"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={togglePause}
              disabled={isMuted}
              aria-label="Play/Pause"
              className="h-12 w-12 rounded-full bg-background/50 border border-primary/10 hover:bg-background/80"
            >
              {isPaused ? (
                <Play className="w-6 h-6" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={nextTopic}
              className="h-12 w-12 rounded-full bg-background/50 border border-primary/10 hover:bg-background/80"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
