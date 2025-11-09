"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Play, Pause, Volume2, VolumeX, X, Monitor, ChevronLeft, ChevronRight } from "lucide-react"
import type { Topic, PrayerPoint } from "@/lib/types"

type PrayerFlow = 'everyday' | 'your-prayers' | 'confession' | 'lords-prayer' | 'psalm-13'

interface PrayerSessionPlayerProps {
  topics: Topic[]
  selectedFlow: PrayerFlow
  silenceOption: string
  calculatedPauseDuration: string
  voiceType: "rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "screenReader"
  onStop: () => void
}

export function PrayerSessionPlayer({
  topics,
  selectedFlow,
  silenceOption,
  calculatedPauseDuration,
  voiceType,
  onStop
}: PrayerSessionPlayerProps) {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const { user } = useAuth();
  const isDanna = user?.email === "dannash918@gmail.com";
  // Calculate total session time in seconds
  const getTotalSessionSeconds = () => {
    let total = 0;
    topics.forEach(topic => {
      if (topic.name === 'Silence') {
        // Divide total silence time by number of points in Silence topic
        const silencePoints = topic.prayerPoints.length;
        const silenceTotal = Number.parseInt(silenceOption);
        const silencePerPoint = silencePoints > 0 ? silenceTotal / silencePoints : 0;
        total += silencePoints * silencePerPoint;
      } else if (topic.name === "Lord's Prayer") {
        // Lord's Prayer: no pause, just 1s per prayer point (or could be 0)
        total += topic.prayerPoints.length * 1;
      } else {
        // All other topics: use calculatedPauseDuration per prayer point
        total += topic.prayerPoints.length * Number.parseInt(calculatedPauseDuration);
      }
    });
    // Add 2s for each topic announcement
    total += topics.length * 2;
    // Add 1s between topics
    total += (topics.length - 1) * 1;
    return total;
  };
  const totalSessionSeconds = getTotalSessionSeconds();
  const cancellationRef = useRef({ cancelled: false })
  const pauseRef = useRef({ paused: false })
  const readingSessionRef = useRef(0)
  const activeAudioRef = useRef<HTMLAudioElement[]>([])
  const activeTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const activeIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([])

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

  const playBlobAudio = (blob: Blob): Promise<void> => {
    return new Promise<void>((resolve) => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      // track active audio so we can pause/stop it even if it's not in DOM
      activeAudioRef.current.push(audio)

      const cleanup = () => {
        // remove from active list
        const idx = activeAudioRef.current.indexOf(audio)
        if (idx !== -1) activeAudioRef.current.splice(idx, 1)
        try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
        // clear visual indicator
        try { setCurrentlyReadingIndex(null) } catch (e) { /* ignore */ }
      }

      audio.onended = () => { cleanup(); resolve() }
      audio.onerror = () => { cleanup(); resolve() }
      audio.onpause = () => { cleanup(); resolve() }

      audio.play().catch(() => {
        cleanup()
        resolve()
      })
    })
  }

  const [currentTopics, setCurrentTopics] = useState<Topic[]>(topics)
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
  const startTimer = () => {
    if (timerRef.current) {
      try { clearTimeout(timerRef.current as any) } catch (e) { /* ignore */ }
    }

    // Determine the duration based on the current topic
    const currentTopic = topicNames[currentTopicIndex]
    const isSilencing = currentTopic === 'Silence'
    const effectiveDuration = isSilencing
      ? Number.parseInt(silenceOption) * 1000
      : Number.parseInt(calculatedPauseDuration) * 1000

    const startTime = Date.now()

    setTimerProgress(0) // Reset to empty

    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / effectiveDuration) * 100, 100)
      setTimerProgress(progress)

      if (elapsed < effectiveDuration) {
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
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [wakeLock])

  useEffect(() => {
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

          // First, announce the topic based on header settings
          const topic = currentTopics[currentTopicIndex]
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

            if (voiceType === "rachel" || voiceType === "maysie") {
              try {
                const response = await fetch(`/api/tts?text=${encodeURIComponent(topicAnnouncement)}&provider=${voiceType}`)
                if (response.ok) {
                  const blob = await response.blob()
                  await playBlobAudio(blob)
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn('Failed to generate topic announcement with ElevenLabs:', error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const topicUtterance = new SpeechSynthesisUtterance(topicAnnouncement)
                    // Calmer, softer, slower fallback
                    topicUtterance.rate = 0.65
                    topicUtterance.pitch = 0.9
                    topicUtterance.volume = 0.8
                    window.speechSynthesis.speak(topicUtterance)
                    await new Promise<void>((resolve) => {
                      topicUtterance.onend = () => resolve()
                      topicUtterance.onerror = () => resolve()
                    })
                }
              }
            } else if (voiceType === "polly" || voiceType === "danielle" || voiceType === "patrick") {
              try {
                const response = await fetch(`/api/tts?text=${encodeURIComponent(topicAnnouncement)}&provider=${voiceType}`)
                if (response.ok) {
                  const blob = await response.blob()
                  await playBlobAudio(blob)
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn(`Failed to generate topic announcement with ${voiceType}:`, error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const topicUtterance = new SpeechSynthesisUtterance(topicAnnouncement)
                  topicUtterance.rate = 0.65
                  topicUtterance.pitch = 0.9
                  topicUtterance.volume = 0.8
                  window.speechSynthesis.speak(topicUtterance)
                  await new Promise<void>((resolve) => {
                    topicUtterance.onend = () => resolve()
                    topicUtterance.onerror = () => resolve()
                  })
                }
              }
            } else if (voiceType === "stephen") {
              try {
                const response = await fetch(`/api/tts?text=${encodeURIComponent(topicAnnouncement)}&provider=stephen&type=generative`)
                if (response.ok) {
                    const blob = await response.blob()
                    await playBlobAudio(blob)
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn('Failed to generate topic announcement with Stephen generative:', error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const topicUtterance = new SpeechSynthesisUtterance(topicAnnouncement)
                  topicUtterance.rate = 0.65
                  topicUtterance.pitch = 0.9
                  topicUtterance.volume = 0.8
                  window.speechSynthesis.speak(topicUtterance)
                  await new Promise<void>((resolve) => {
                    topicUtterance.onend = () => resolve()
                    topicUtterance.onerror = () => resolve()
                  })
                }
              }
            } else {
              // Screen reader
              if (typeof window !== "undefined" && window.speechSynthesis) {
                const topicUtterance = new SpeechSynthesisUtterance(topicAnnouncement)
                topicUtterance.rate = 0.65
                topicUtterance.pitch = 0.9
                topicUtterance.volume = 0.8
                window.speechSynthesis.speak(topicUtterance)
                await new Promise<void>((resolve) => {
                  topicUtterance.onend = () => resolve()
                  topicUtterance.onerror = () => resolve()
                })
              }
            }
          }

          // Start 2-second pause AFTER topic announcement finishes
          await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
              if (cancellationRef.current.cancelled || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) {
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
              resolve()
            }, 2000) // 2-second pause starting when topic announcement finishes
            addTimeout(t)
          })

          let readingCompleted = false
          for (let i = 0; i < currentPrayerPoints.length; i++) {
            if (cancellationRef.current.cancelled || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) break

            const point = currentPrayerPoints[i]
            const textToSpeak = point.verseReference && !point.verseReference.includes('Lord\'s Prayer')
              ? `${point.verseReference} says: ${point.text}`
              : `${point.text}`

            // Double check cancellation right before TTS starts
            if (cancellationRef.current.cancelled || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) break

            // Set the currently reading index for visual feedback
            setCurrentlyReadingIndex(i)

            if (voiceType === "rachel" || voiceType === "maysie") {
              try {
                const response = await fetch(`/api/tts?text=${encodeURIComponent(textToSpeak)}&provider=${voiceType}`)
                if (response.ok) {
                  const blob = await response.blob()
                  await playBlobAudio(blob)
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn('Failed to fetch TTS for prayer point with ElevenLabs:', error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(textToSpeak)
                  // Calmer, softer, slower fallback
                  utterance.rate = 0.65
                  utterance.pitch = 0.9
                  utterance.volume = 0.8
                  window.speechSynthesis.speak(utterance)
                  await new Promise<void>((resolve) => {
                    utterance.onend = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                    utterance.onerror = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                  })
                } else {
                  setCurrentlyReadingIndex(null)
                }
              }
            } else if (voiceType === "polly" || voiceType === "danielle" || voiceType === "patrick") {
              try {
                const response = await fetch(`/api/tts?text=${encodeURIComponent(textToSpeak)}&provider=${voiceType}`)
                if (response.ok) {
                  const blob = await response.blob()
                  await playBlobAudio(blob)
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn(`Failed to fetch TTS for prayer point with ${voiceType}:`, error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(textToSpeak)
                  utterance.rate = 0.65
                  utterance.pitch = 0.9
                  utterance.volume = 0.8
                  window.speechSynthesis.speak(utterance)
                  await new Promise<void>((resolve) => {
                    utterance.onend = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                    utterance.onerror = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                  })
                } else {
                  setCurrentlyReadingIndex(null)
                }
              }
            } else if (voiceType === "stephen") {
              try {
                const response = await fetch(`/api/tts?text=${encodeURIComponent(textToSpeak)}&provider=stephen&type=generative`)
                if (response.ok) {
                    const blob = await response.blob()
                    await playBlobAudio(blob)
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn('Failed to fetch TTS for prayer point with Stephen generative:', error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(textToSpeak)
                  utterance.rate = 0.65
                  utterance.pitch = 0.9
                  utterance.volume = 0.8
                  window.speechSynthesis.speak(utterance)
                  await new Promise<void>((resolve) => {
                    utterance.onend = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                    utterance.onerror = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                  })
                } else {
                  setCurrentlyReadingIndex(null)
                }
              }
            } else {
              // Screen reader
              if (typeof window !== "undefined" && window.speechSynthesis) {
                const utterance = new SpeechSynthesisUtterance(textToSpeak)
                utterance.rate = 0.65
                utterance.pitch = 0.9
                utterance.volume = 0.8
                window.speechSynthesis.speak(utterance)
                await new Promise<void>((resolve) => {
                  utterance.onend = () => {
                    setCurrentlyReadingIndex(null)
                    resolve()
                  }
                  utterance.onerror = () => {
                    setCurrentlyReadingIndex(null)
                    resolve()
                  }
                })
              } else {
                setCurrentlyReadingIndex(null)
              }
            }

            // Pause after each prayer point (using the selected duration for non-silence, and divided silence duration for silence)
            // Skip pause for Lord's Prayer to finish immediately
            if (currentTopic !== "Lord's Prayer") {
              await new Promise<void>((resolve) => {
                // Start the timer when pause begins
                startTimer();

                const checkInterval = setInterval(() => {
                  if (
                    cancellationRef.current.cancelled ||
                    pauseRef.current.paused ||
                    isMuted ||
                    currentTopicIndex !== originalTopicIndex ||
                    currentSession !== readingSessionRef.current
                  ) {
                    try { clearInterval(checkInterval as any) } catch (e) { /* ignore */ }
                    removeInterval(checkInterval);
                    stopTimer(); // Stop timer if pause is interrupted
                    resolve();
                    return;
                  }
                }, 100);
                addInterval(checkInterval);

                // For Silence topic, divide silenceOption by number of points
                let durationMs;
                if (currentTopic === 'Silence') {
                  const silencePoints = currentPrayerPoints.length;
                  const silenceTotal = Number.parseInt(silenceOption);
                  const silencePerPoint = silencePoints > 0 ? silenceTotal / silencePoints : 0;
                  durationMs = silencePerPoint * 1000;
                } else {
                  durationMs = Number.parseInt(calculatedPauseDuration) * 1000;
                }

                const t = setTimeout(() => {
                  try { clearInterval(checkInterval as any) } catch (e) { /* ignore */ }
                  removeInterval(checkInterval);
                  removeTimeout(t);
                  completeTimer(); // Complete timer when pause completes naturally (keeps at 100%)
                  resolve();
                }, durationMs);
                addTimeout(t);
              });
            }

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
  }, [isPaused, isMuted, currentTopicIndex, topicNames, currentTopics, calculatedPauseDuration, voiceType, selectedFlow])

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
  }, [])

  return (
    <div className={`${isFullscreen ? "fixed inset-0 bg-white flex flex-col items-center justify-center p-8 z-50" : "space-y-4"}`}>
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
                    <span className={`font-semibold text-sm mt-1 min-w-[2rem] ${
                      currentlyReadingIndex === index ? "text-primary" : "text-primary"
                    }`}>
                      {index + 1}.
                    </span>
                    <p className={`leading-relaxed ${point.id === 'lords-prayer-1' ? 'whitespace-pre-line' : ''}`}>
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
