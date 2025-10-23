"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Play, Pause, Volume2, VolumeX, X, Monitor, ChevronLeft, ChevronRight } from "lucide-react"
import type { Topic, PrayerPoint } from "@/lib/types"

type PrayerFlow = 'everyday' | 'your-prayers' | 'confession' | 'lords-prayer'

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
  const cancellationRef = useRef({ cancelled: false })
  const pauseRef = useRef({ paused: false })
  const readingSessionRef = useRef(0)

  const [currentTopics, setCurrentTopics] = useState<Topic[]>(topics)
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0)
  const [topicNames, setTopicNames] = useState<string[]>(topics.map(t => t.name))
  const [currentlyReadingIndex, setCurrentlyReadingIndex] = useState<number | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen] = useState(true)
  const [timerProgress, setTimerProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0)
  const totalTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const announcedTopicsRef = useRef<Set<number>>(new Set())

  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

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

    // Stop total time tracking
    if (totalTimeIntervalRef.current) {
      clearInterval(totalTimeIntervalRef.current)
      totalTimeIntervalRef.current = null
    }

    setIsPaused(false)
    setTopicNames([])
    setCurrentlyReadingIndex(null)
    announcedTopicsRef.current.clear() // Clear announced topics for next session

    // Cancel any ongoing speech synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    // Cancel any ongoing audio playback
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })

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
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })

    // Stop timer when navigating
    stopTimer()

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
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })

    // Stop timer when navigating
    stopTimer()

    if (currentTopicIndex > 0) {
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
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  // Timer functions to control the circular progress ring
  const startTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
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
      }
    }

    // Start the timer
    timerRef.current = setTimeout(updateProgress, 50)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      setTimerProgress(0)
    }
  }

  const completeTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
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
                  const audio = new Audio(URL.createObjectURL(blob))
                  audio.play()
                  await new Promise<void>((resolve) => {
                    audio.onended = () => resolve()
                    audio.onerror = () => resolve()
                  })
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn('Failed to generate topic announcement with ElevenLabs:', error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const topicUtterance = new SpeechSynthesisUtterance(topicAnnouncement)
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
                  const audio = new Audio(URL.createObjectURL(blob))
                  audio.play()
                  await new Promise<void>((resolve) => {
                    audio.onended = () => resolve()
                    audio.onerror = () => resolve()
                  })
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn(`Failed to generate topic announcement with ${voiceType}:`, error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const topicUtterance = new SpeechSynthesisUtterance(topicAnnouncement)
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
                  const audio = new Audio(URL.createObjectURL(blob))
                  audio.play()
                  await new Promise<void>((resolve) => {
                    audio.onended = () => resolve()
                    audio.onerror = () => resolve()
                  })
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn('Failed to generate topic announcement with Stephen generative:', error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const topicUtterance = new SpeechSynthesisUtterance(topicAnnouncement)
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
                clearInterval(checkInterval)
                resolve()
                return
              }
            }, 100)

            setTimeout(() => {
              clearInterval(checkInterval)
              resolve()
            }, 2000) // 2-second pause starting when topic announcement finishes
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
                  const audio = new Audio(URL.createObjectURL(blob))
                  audio.play()
                  await new Promise<void>((resolve) => {
                    audio.onended = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                    audio.onerror = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                  })
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn('Failed to fetch TTS for prayer point with ElevenLabs:', error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(textToSpeak)
                  utterance.rate = 0.75
                  utterance.pitch = 1.0
                  utterance.volume = 0.9
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
                  const audio = new Audio(URL.createObjectURL(blob))
                  audio.play()
                  await new Promise<void>((resolve) => {
                    audio.onended = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                    audio.onerror = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                  })
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn(`Failed to fetch TTS for prayer point with ${voiceType}:`, error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(textToSpeak)
                  utterance.rate = 0.75
                  utterance.pitch = 1.0
                  utterance.volume = 0.9
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
                  const audio = new Audio(URL.createObjectURL(blob))
                  audio.play()
                  await new Promise<void>((resolve) => {
                    audio.onended = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                    audio.onerror = () => {
                      setCurrentlyReadingIndex(null)
                      resolve()
                    }
                  })
                } else {
                  throw new Error('API failed')
                }
              } catch (error) {
                console.warn('Failed to fetch TTS for prayer point with Stephen generative:', error)
                // Fallback to browser speech synthesis
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const utterance = new SpeechSynthesisUtterance(textToSpeak)
                  utterance.rate = 0.75
                  utterance.pitch = 1.0
                  utterance.volume = 0.9
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
                utterance.rate = 0.75
                utterance.pitch = 1.0
                utterance.volume = 0.9
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

            // Pause after each prayer point (using the selected duration for non-silence, selected silence duration for silence)
            // Skip pause for Lord's Prayer to finish immediately
            if (currentTopic !== 'Lord\'s Prayer') {
              await new Promise<void>((resolve) => {
                // Start the timer when pause begins
                startTimer()

                const checkInterval = setInterval(() => {
                  if (cancellationRef.current.cancelled || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) {
                    clearInterval(checkInterval)
                    stopTimer() // Stop timer if pause is interrupted
                    resolve()
                    return
                  }
                }, 100)

                // Use silence duration for silence topic, otherwise use regular pause duration
                const durationMs = currentTopic === 'Silence'
                  ? Number.parseInt(silenceOption) * 1000
                  : Number.parseInt(calculatedPauseDuration) * 1000

                setTimeout(() => {
                  clearInterval(checkInterval)
                  completeTimer() // Complete timer when pause completes naturally (keeps at 100%)
                  resolve()
                }, durationMs)
              })
            }

            // If we got to the end of the loop without breaking, mark as completed
            if (i === currentPrayerPoints.length - 1) {
              readingCompleted = true
            }
          }
          setCurrentlyReadingIndex(null)

          // Only advance to next topic if reading completed naturally
          if (readingCompleted) {
            setTimeout(() => {
              if (!pauseRef.current.paused && !isMuted) {
                nextTopic()
              }
            }, 1000) // 1 second pause before next topic
          }
        }

        readPrayerPoints()
      }

      return () => {
        // Cleanup if needed
      }
    }
  }, [isMuted, currentTopicIndex, topicNames, currentTopics, calculatedPauseDuration, voiceType, selectedFlow])

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
    // Start total time tracking
    setTotalElapsedSeconds(0)
    totalTimeIntervalRef.current = setInterval(() => {
      setTotalElapsedSeconds(prev => prev + 1)
    }, 1000)

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

       <div className={`${isFullscreen ? "mb-8" : "mb-4"} text-center`}>
         <span className="text-sm font-medium text-muted-foreground">
           Topic {currentTopicIndex + 1} of {topicNames.length}
         </span>
         {wakeLock && (
           <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
             <Monitor className="w-3 h-3" />
             <span>Screen will stay on during prayer</span>
           </div>
         )}
       </div>

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

      <div className={`${isFullscreen ? "mt-16" : "mt-8"} flex flex-col items-center gap-4`}>
        <div className={`${isFullscreen ? "flex items-center justify-center gap-4" : "flex items-center justify-center gap-4"}`}>
          {/* Previous Topic Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={previousTopic}
            disabled={currentTopicIndex === 0}
            className={`${isFullscreen ? "h-16 w-16" : "h-12 w-12"} rounded-full bg-background/50 backdrop-blur border-primary/20 hover:bg-background/80`}
          >
            <ChevronLeft className={`${isFullscreen ? "w-7 h-7" : "w-5 h-5"}`} />
          </Button>

          {/* Mute Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className={`${isFullscreen ? "h-16 w-16" : "h-12 w-12"} rounded-full bg-background/50 backdrop-blur border-primary/20 hover:bg-background/80`}
          >
            {isMuted ? (
              <VolumeX className={`${isFullscreen ? "w-7 h-7" : "w-5 h-5"}`} />
            ) : (
              <Volume2 className={`${isFullscreen ? "w-7 h-7" : "w-5 h-5"}`} />
            )}
          </Button>

          {/* Pause/Play Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={togglePause}
            disabled={isMuted}
            className={`${isFullscreen ? "h-16 w-16" : "h-12 w-12"} rounded-full bg-background/50 backdrop-blur border-primary/20 hover:bg-background/80`}
          >
            {isPaused ? (
              <Play className={`${isFullscreen ? "w-7 h-7" : "w-5 h-5"}`} />
            ) : (
              <Pause className={`${isFullscreen ? "w-7 h-7" : "w-5 h-5"}`} />
            )}
          </Button>

          {/* Next Topic Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={nextTopic}
            className={`${isFullscreen ? "h-16 w-16" : "h-12 w-12"} rounded-full bg-background/50 backdrop-blur border-primary/20 hover:bg-background/80`}
          >
            <ChevronRight className={`${isFullscreen ? "w-7 h-7" : "w-5 h-5"}`} />
          </Button>
        </div>

        {/* Horizontal Progress Bar - Always visible during prayer session */}
        <div className="w-full mt-8">
          <Progress value={timerProgress} className="w-full" />
        </div>
      </div>
    </div>
  )
}
