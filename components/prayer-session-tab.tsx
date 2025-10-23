"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Play, Pause, SkipForward, Volume2, VolumeX, X, Loader2, Monitor, ChevronLeft, ChevronRight, Settings } from "lucide-react"
import type {  PrayerPoint, Topic } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { usePrayerData } from "@/hooks/use-prayer-data"
import { PrayerSettingsModal } from "@/components/prayer-settings-modal"
import { supabase } from "@/lib/supabase"
import { confessionFlows } from "@/lib/confession-flow"
import { lordsPrayerFlows } from "@/lib/lords-prayer-flow"
import { getEverydayFlow, getYourPrayersFlow } from "@/lib/everyday-flow"

type PrayerFlow = 'everyday' | 'your-prayers' | 'confession' | 'lords-prayer'

interface PrayerSessionTabProps {
  // Remove prayerData prop since we'll use the hook
}

// Helper functions to get preview topics for UI descriptions
const getPreviewTopicsForFlow = (flow: PrayerFlow, selectedCount: number, prayerData: any): string[] => {
  if (flow === 'everyday') {
    const topics = getEverydayFlow(selectedCount, prayerData)
    return topics.map(t => t.name)
  } else if (flow === 'your-prayers') {
    const topics = getYourPrayersFlow(selectedCount, prayerData)
    return topics.map(t => t.name)
  } else if (flow === 'confession') {
    return confessionFlows.map(t => t.name)
  } else if (flow === 'lords-prayer') {
    return lordsPrayerFlows.map(t => t.name)
  }
  return []
}

export function PrayerSessionTab({}: PrayerSessionTabProps) {
  const { prayerData, loading, error } = usePrayerData()
  const cancellationRef = useRef({ cancelled: false })
  const pauseRef = useRef({ paused: false })
  const readingSessionRef = useRef(0)
  const [selectedTotalTime, setSelectedTotalTime] = useState("10")
  const [calculatedPauseDuration, setCalculatedPauseDuration] = useState("30")
  const [voiceType, setVoiceType] = useState<"rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "screenReader">("polly")
  const [silencePreference, setSilencePreference] = useState<string>("automatic")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [topicCountPreference, setTopicCountPreference] = useState<string>("automatic")
  const [isLoading, setIsLoading] = useState(true)


  // Calculate selectedCount based on total time (more time = more topics)
  const getSelectedCountFromTime = (totalTimeMinutes: string): number => {
    const minutes = Number.parseInt(totalTimeMinutes)
    // Scale: 5min=2 topics, 8min=3 topics, 10min=4 topics, 15min=5 topics, 20min=6 topics, 30min=8 topics
    if (minutes <= 5) return 3
    if (minutes <= 8) return 4
    if (minutes <= 10) return 5
    if (minutes <= 15) return 7
    if (minutes <= 20) return 10
    return 10
  }

  const selectedCount = topicCountPreference === "automatic"
    ? getSelectedCountFromTime(selectedTotalTime)
    : Number.parseInt(topicCountPreference)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<PrayerFlow>('everyday')

  // Calculate silenceOption based on total time (longer sessions = longer silence)
  const getSilenceTimeFromTotalTime = (totalTimeMinutes: string): string => {
    const minutes = Number.parseInt(totalTimeMinutes)
    // Scale: 5min=30s, 8min=45s, 10min=60s, 15min=90s, 20min=120s, 30min=180s
    if (minutes <= 5) return "45"
    if (minutes <= 8) return "60"
    if (minutes <= 10) return "90"
    if (minutes <= 15) return "120"
    if (minutes <= 20) return "180"
    return "180"
  }

  const silenceOption = silencePreference === "automatic"
    ? getSilenceTimeFromTotalTime(selectedTotalTime)
    : silencePreference

  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        const wakeLockSentinel = await navigator.wakeLock.request('screen')
        setWakeLock(wakeLockSentinel)

        wakeLockSentinel.addEventListener('release', () => {
          console.log('Wake lock was released')
          setWakeLock(null)

          // Try to re-request wake lock if prayer session is still active and we were recently released
          if (isPlaying && document.visibilityState === 'visible') {
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
          if (document.visibilityState === 'visible' && isPlaying && !wakeLock) {
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

  const [currentTopics, setCurrentTopics] = useState<Topic[]>([])
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0)
  const [topicNames, setTopicNames] = useState<string[]>([])
  const [currentlyReadingIndex, setCurrentlyReadingIndex] = useState<number | null>(null)
  const [timerProgress, setTimerProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0)
  const totalTimeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const getAllPrayerPoints = (): PrayerPoint[] => {
    if (selectedFlow === 'confession') {
      const allPoints: PrayerPoint[] = []
      confessionFlows.forEach((topic) => {
        const pointsWithTopic = topic.prayerPoints.map((point) => ({
          ...point,
          topicName: topic.name,
        }))
        allPoints.push(...pointsWithTopic)
      })
      return allPoints
    }
    if (selectedFlow === 'lords-prayer') {
      const allPoints: PrayerPoint[] = []
      lordsPrayerFlows.forEach((topic) => {
        const pointsWithTopic = topic.prayerPoints.map((point) => ({
          ...point,
          topicName: topic.name,
        }))
        allPoints.push(...pointsWithTopic)
      })
      return allPoints
    }
    const allPoints: PrayerPoint[] = []
    prayerData.topics.forEach((topic) => {
      const pointsWithTopic = topic.prayerPoints.map((point) => ({
        ...point,
        topicName: topic.name,
      }))
      allPoints.push(...pointsWithTopic)
    })
    return allPoints
  }

  const startPraying = async () => {
    let topics: Topic[] = []

    if (selectedFlow === 'everyday') {
      topics = getEverydayFlow(selectedCount, prayerData)
    } else if (selectedFlow === 'your-prayers') {
      topics = getYourPrayersFlow(selectedCount, prayerData)
    } else if (selectedFlow === 'confession') {
      topics = confessionFlows
    } else if (selectedFlow === 'lords-prayer') {
      topics = lordsPrayerFlows
    }

    const selectedTopics = topics.map(t => t.name)

    // Calculate dynamic pause duration
    const totalSelectedSeconds = Number.parseInt(selectedTotalTime) * 60
    const silenceSeconds = selectedFlow === 'everyday' && silenceOption !== 'skip' ? Number.parseInt(silenceOption) : 0

    // Count prayer points that will have pauses (excluding Lord's Prayer and Silence)
    const prayerPointsForPaces = topics
      .filter(topic => topic.name !== 'Lord\'s Prayer' && topic.name !== 'Silence')
      .reduce((total, topic) => total + topic.prayerPoints.length, 0)

    // Available time for pauses (total time minus silence time)
    const availableSecondsForPauses = totalSelectedSeconds - silenceSeconds

    // Calculate pause duration per prayer point (minimum 3 seconds)
    const calculatedPause = prayerPointsForPaces > 0
      ? Math.max(3, Math.floor(availableSecondsForPauses / prayerPointsForPaces))
      : 30 // fallback

    setCalculatedPauseDuration(calculatedPause.toString())

    // Start total time tracking
    setTotalElapsedSeconds(0)
    totalTimeIntervalRef.current = setInterval(() => {
      setTotalElapsedSeconds(prev => prev + 1)
    }, 1000)

    setCurrentTopics(topics) // Store topics array
    setTopicNames(selectedTopics)
    setCurrentTopicIndex(0)
    cancellationRef.current.cancelled = false
    setIsPlaying(true)
    setIsPaused(false)
    setIsFullscreen(true)

    // Debug logs - detailed breakdown
    console.log('🍃 Prayer Session Started')
    console.log('Total time selected:', selectedTotalTime, 'minutes')
    console.log('Total estimated session time:', totalSelectedSeconds, 'seconds')
    console.log('')

    console.log('📋 Prayer Session Breakdown:')
    topics.forEach((topic, index) => {
      const topicNumber = index + 1
      const isPraise = topic.name === 'Praise'
      const isBeginPrayer = topic.name === 'Abide'
      const isSilence = topic.name === 'Silence'
      const isLordsPrayer = topic.name === 'Lord\'s Prayer'

      console.log(`${topicNumber}. ${topic.name}`)

      topic.prayerPoints.forEach((point, pointIndex) => {
        const pointNumber = pointIndex + 1
        console.log(`   ${pointIndex === 0 ? '└─' : '   '} ${pointNumber}. "${point.text}"`)

        // Calculate duration for this point
        let durationInfo = ''
        if (isLordsPrayer) {
          durationInfo = '(~5s reading, no pause)'
        } else if (isSilence) {
          durationInfo = `(${silenceSeconds}s silence)`
        } else if (isBeginPrayer || isPraise) {
          durationInfo = `(${calculatedPause}s pause)`
        } else {
          // Regular prayer topics
          const pointCount = topic.prayerPoints.length
          durationInfo = `(${calculatedPause}s pause)`
        }

        if (pointIndex === topic.prayerPoints.length - 1) {
          console.log(`   └─ Duration: ${durationInfo}`)
        }
      })

      console.log('')
    })

    console.log('📊 Session Statistics:')
    console.log('Silence time:', silenceSeconds, 'seconds')
    const totalPauseTime = prayerPointsForPaces * calculatedPause
    console.log('Time spent on pauses:', totalPauseTime, 'seconds')
    console.log('Available time for pauses:', availableSecondsForPauses, 'seconds')
    console.log('Number of prayer points (excluding Lord\'s Prayer):', prayerPointsForPaces)
    console.log('Calculated pause duration per point:', calculatedPause, 'seconds')
    console.log('Topics selected:', selectedTopics.length, 'total')

    // Request wake lock to prevent screen from turning off
    await requestWakeLock()
  }

  const stopPraying = () => {
    cancellationRef.current.cancelled = true

    // Stop total time tracking
    if (totalTimeIntervalRef.current) {
      clearInterval(totalTimeIntervalRef.current)
      totalTimeIntervalRef.current = null
    }

    setIsPlaying(false)
    setCurrentIndex(0)
    setCurrentTopicIndex(0)
    setCurrentTopics([])
    setTopicNames([])
    setCurrentlyReadingIndex(null)
    setIsPaused(false)
    setIsFullscreen(false)

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
    if (wakeLock) {
      wakeLock.release()
      setWakeLock(null)
    }
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

  const skipToNext = () => {
    nextTopic()
    setIsPaused(false)
    pauseRef.current.paused = false
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

  // Reset total time when switching away from Lord's Prayer if 1 or 2 mins is selected
  useEffect(() => {
    if (selectedFlow !== 'lords-prayer' && (selectedTotalTime === '1' || selectedTotalTime === '2')) {
      setSelectedTotalTime('5')
    }
  }, [selectedFlow, selectedTotalTime])

  // Load user settings on component mount
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (data && !error) {
            setVoiceType(data.voice_type as "rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "screenReader")
            setSilencePreference(data.silence_preference)
            setTopicCountPreference(data.topic_count_preference)
          }
        }
      } catch (error) {
        console.warn('Failed to load user settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserSettings()
  }, [])

  useEffect(() => {
    if (isPlaying && !isPaused && !isMuted && topicNames.length > 0) {
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

          // First, announce the topic (skip for silence, different announcement for Abide, and skip entirely for Lord's Prayer flow)
          if (currentTopic !== 'Silence' && !(selectedFlow === 'lords-prayer')) {
            const topicAnnouncement = currentTopic === 'Abide'
              ? `Let's Abide`
              : currentTopic === 'Praise'
              ? `Praise`
              : currentTopic === 'Confession'
              ? `Confession`
              : currentTopic === 'Lord\'s Prayer'
              ? `Let's finish with the Lord's Prayer`
              : selectedFlow === 'confession'
              ? currentTopic
              : `Pray for ${currentTopic}`
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

          // Pause after topic announcement
          await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
              if (cancellationRef.current.cancelled || !isPlaying || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) {
                clearInterval(checkInterval)
                resolve()
                return
              }
            }, 100)

            setTimeout(() => {
              clearInterval(checkInterval)
              resolve()
            }, 500)
          })

          let readingCompleted = false
          for (let i = 0; i < currentPrayerPoints.length; i++) {
            if (cancellationRef.current.cancelled || !isPlaying || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) break

            const point = currentPrayerPoints[i]
            const textToSpeak = point.verseReference && !point.verseReference.includes('Lord\'s Prayer')
              ? `${point.verseReference} says: ${point.text}`
              : `${point.text}`

            // Double check cancellation right before TTS starts
            if (cancellationRef.current.cancelled || !isPlaying || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) break

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
                  if (cancellationRef.current.cancelled || !isPlaying || pauseRef.current.paused || isMuted || currentTopicIndex !== originalTopicIndex || currentSession !== readingSessionRef.current) {
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
              if (isPlaying && !pauseRef.current.paused && !isMuted) {
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
  }, [isPlaying, isPaused, isMuted, currentTopicIndex, topicNames, currentTopics, calculatedPauseDuration, voiceType])

  // Cleanup wake lock on unmount
  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [wakeLock])

  const allPoints = getAllPrayerPoints()
  const totalPoints = allPoints.length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your prayers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}
      {!isPlaying ? (
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Prayer Session</CardTitle>
              <PrayerSettingsModal
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                voiceType={voiceType}
                setVoiceType={setVoiceType}
                silencePreference={silencePreference}
                setSilencePreference={setSilencePreference}
                topicCountPreference={topicCountPreference}
                setTopicCountPreference={setTopicCountPreference}
              />
            </div>
            <div className="space-y-3 pt-2">
              <Label htmlFor="flow" className="text-base">
                Prayer Flow
              </Label>
              <Select value={selectedFlow} onValueChange={(value: PrayerFlow) => setSelectedFlow(value)}>
                <SelectTrigger id="flow" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyday">Everyday</SelectItem>
                  <SelectItem value="your-prayers">Your Prayers</SelectItem>
                  <SelectItem value="confession">Confession</SelectItem>
                  <SelectItem value="lords-prayer">Lord's Prayer</SelectItem>
                </SelectContent>
              </Select>
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20 shadow-sm">
                <div className="space-y-4">
                  {getPreviewTopicsForFlow(selectedFlow, selectedCount, prayerData).map((topicName, index) => (
                    <div key={`topic-${index}`} className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary">{index + 1}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {topicName}
                          {selectedFlow === 'everyday' && topicName === 'Silence' && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({Math.floor(Number.parseInt(silenceOption) / 60)}:{(Number.parseInt(silenceOption) % 60).toString().padStart(2, '0')})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="time" className="text-base">
                Total Prayer Time
              </Label>
              <Select value={selectedTotalTime} onValueChange={setSelectedTotalTime}>
                <SelectTrigger id="time" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedFlow === 'lords-prayer' && (
                    <>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="2">2 minutes</SelectItem>
                    </>
                  )}
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="8">8 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="12">12 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={startPraying} disabled={selectedFlow !== 'confession' && selectedFlow !== 'lords-prayer' && prayerData.topics.length === 0} size="lg" className="w-full gap-2 text-lg h-14">
              <Play className="w-5 h-5" />
              Start Praying
            </Button>

            {selectedFlow !== 'confession' && prayerData.topics.length === 0 && (
              <p className="text-center text-sm text-muted-foreground text-balance">
                Add some prayer points in the "Manage Prayers" tab to get started
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={`${isFullscreen ? "fixed inset-0 bg-white flex flex-col items-center justify-center p-8 z-50" : "space-y-4"}`}
        >
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
                  {topicNames[currentTopicIndex] === 'Praise' ? 'Praise' : topicNames[currentTopicIndex] === 'Confession' ? 'Confession' : topicNames[currentTopicIndex] === 'Lord\'s Prayer' ? 'Lord\'s Prayer' : topicNames[currentTopicIndex] === 'Silence' ? 'Silence' : topicNames[currentTopicIndex] === 'Abide' ? 'Let\'s Abide' : selectedFlow === 'lords-prayer' ? topicNames[currentTopicIndex] : selectedFlow === 'confession' ? topicNames[currentTopicIndex] : `Pray for ${topicNames[currentTopicIndex]}`}
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
      )}
    </div>
  )
}
