"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Play, Pause, SkipForward, Volume2, VolumeX, X, Loader2, Monitor, ChevronLeft, ChevronRight } from "lucide-react"
import type { PrayerData, PrayerPoint } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePrayerData } from "@/hooks/use-prayer-data"

interface PrayerSessionTabProps {
  // Remove prayerData prop since we'll use the hook
}

export function PrayerSessionTab({}: PrayerSessionTabProps) {
  const { prayerData, loading, error } = usePrayerData()
  const cancellationRef = useRef({ cancelled: false })
  const pauseRef = useRef({ paused: false })
  const [selectedCount, setSelectedCount] = useState("5")
  const [pauseDuration, setPauseDuration] = useState("30")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedPoints, setSelectedPoints] = useState<PrayerPoint[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)
  const [groupedPrayers, setGroupedPrayers] = useState<{ [topicName: string]: PrayerPoint[] }>({})
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0)
  const [topicNames, setTopicNames] = useState<string[]>([])
  const [currentlyReadingIndex, setCurrentlyReadingIndex] = useState<number | null>(null)



  const getAllPrayerPoints = (): PrayerPoint[] => {
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
    const allPoints = getAllPrayerPoints()
    if (allPoints.length === 0) return

    // Group prayers by topic
    const grouped: { [topicName: string]: PrayerPoint[] } = {}
    allPoints.forEach(point => {
      const topicName = point.topicName || 'General'
      if (!grouped[topicName]) {
        grouped[topicName] = []
      }
      grouped[topicName].push(point)
    })

    // Shuffle topics and limit by selected count
    const topicNames = Object.keys(grouped)
    const shuffledTopics = topicNames.sort(() => Math.random() - 0.5)
    const count = Math.min(Number.parseInt(selectedCount), shuffledTopics.length)
    const selectedTopics = shuffledTopics.slice(0, count)

    // Create final grouped prayers
    const finalGrouped: { [topicName: string]: PrayerPoint[] } = {}
    selectedTopics.forEach(topicName => {
      finalGrouped[topicName] = grouped[topicName]
    })

    setGroupedPrayers(finalGrouped)
    setTopicNames(selectedTopics)
    setCurrentTopicIndex(0)
    setSelectedPoints([]) // Clear individual points since we're using grouped view
    cancellationRef.current.cancelled = false
    setIsPlaying(true)
    setIsPaused(false)
    setIsFullscreen(true)

    // Request wake lock to prevent screen from turning off
    try {
      if ('wakeLock' in navigator) {
        const wakeLockSentinel = await navigator.wakeLock.request('screen')
        setWakeLock(wakeLockSentinel)
        
        // Handle wake lock release
        wakeLockSentinel.addEventListener('release', () => {
          console.log('Wake lock was released')
          setWakeLock(null)
          
          // Try to re-request wake lock if prayer is still active
          if (isPlaying) {
            setTimeout(async () => {
              try {
                const newWakeLock = await navigator.wakeLock.request('screen')
                setWakeLock(newWakeLock)
                newWakeLock.addEventListener('release', () => {
                  setWakeLock(null)
                })
              } catch (err) {
                console.warn('Failed to re-request wake lock:', err)
              }
            }, 1000)
          }
        })
      }
    } catch (err) {
      console.warn('Wake lock request failed:', err)
      // Continue with prayer session even if wake lock fails
    }
  }

  const stopPraying = () => {
    cancellationRef.current.cancelled = true
    setIsPlaying(false)
    setCurrentIndex(0)
    setCurrentTopicIndex(0)
    setSelectedPoints([])
    setGroupedPrayers({})
    setTopicNames([])
    setCurrentlyReadingIndex(null)
    setIsPaused(false)
    setIsFullscreen(false)

    // Release wake lock
    if (wakeLock) {
      wakeLock.release()
      setWakeLock(null)
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  const nextTopic = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setCurrentlyReadingIndex(null)
    if (currentTopicIndex < topicNames.length - 1) {
      setCurrentTopicIndex(currentTopicIndex + 1)
    } else {
      stopPraying()
    }
  }

  const previousTopic = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setCurrentlyReadingIndex(null)
    if (currentTopicIndex > 0) {
      setCurrentTopicIndex(currentTopicIndex - 1)
    }
  }

  const togglePause = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (pauseRef.current.paused) {
        window.speechSynthesis.resume()
        pauseRef.current.paused = false
        setIsPaused(false)
      } else {
        window.speechSynthesis.pause()
        pauseRef.current.paused = true
        setIsPaused(true)
      }
    }
  }

  const skipToNext = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    nextTopic()
    setIsPaused(false)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (!isMuted) {
        window.speechSynthesis.cancel()
      }
    }
  }

  // Auto-advance to next topic after pause duration and read prayer points
  useEffect(() => {
    if (!isPlaying && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [isPlaying])

  useEffect(() => {
    if (isPlaying && !isPaused && !isMuted && topicNames.length > 0) {
      const currentTopic = topicNames[currentTopicIndex]
      const currentPrayerPoints = groupedPrayers[currentTopic] || []
      
      if (currentPrayerPoints.length > 0) {
        // Read all prayer points for the current topic
        const readPrayerPoints = async () => {
          // First, announce the topic
          if (typeof window !== "undefined" && window.speechSynthesis) {
            const topicAnnouncement = `Pray for ${currentTopic}`
            const topicUtterance = new SpeechSynthesisUtterance(topicAnnouncement)
            topicUtterance.rate = 0.75
            topicUtterance.pitch = 1.0
            topicUtterance.volume = 0.9
            
            await new Promise<void>((resolve) => {
              topicUtterance.onend = () => resolve()
              topicUtterance.onerror = () => resolve()
              window.speechSynthesis.speak(topicUtterance)
            })
            
            // Pause after topic announcement
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
          
          for (let i = 0; i < currentPrayerPoints.length; i++) {
            if (cancellationRef.current.cancelled || !isPlaying || pauseRef.current.paused || isMuted) break
            
            const point = currentPrayerPoints[i]
            const textToSpeak = `${point.text}`
            
            // Set the currently reading index for visual feedback
            setCurrentlyReadingIndex(i)
            
            if (typeof window !== "undefined" && window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(textToSpeak)
              utterance.rate = 0.75
              utterance.pitch = 1.0
              utterance.volume = 0.9
              
              // Add slight pauses for better rhythm
              utterance.text = textToSpeak.replace(/\./g, '. ').replace(/,/g, ', ')
              
              await new Promise<void>((resolve) => {
                utterance.onend = () => {
                  setCurrentlyReadingIndex(null)
                  resolve()
                }
                utterance.onerror = () => {
                  setCurrentlyReadingIndex(null)
                  resolve()
                }
                window.speechSynthesis.speak(utterance)
              })
              
              // Pause after each prayer point (using the selected duration)
              await new Promise(resolve => setTimeout(resolve, Number.parseInt(pauseDuration) * 1000))
            }
          }
          setCurrentlyReadingIndex(null)
        }
        
        readPrayerPoints().then(() => {
          // After all prayer points are read, advance to next topic
          setTimeout(() => {
            if (isPlaying && !pauseRef.current.paused && !isMuted) {
              nextTopic()
            }
          }, 1000) // 1 second pause before next topic
        })
      }
      
      return () => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel()
        }
      }
    }
  }, [isPlaying, isPaused, isMuted, currentTopicIndex, topicNames, groupedPrayers, pauseDuration])

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
          <CardHeader>
            <CardTitle className="text-2xl">Prayer Session</CardTitle>
            <CardDescription>Select how many topics you'd like to pray through</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="count" className="text-base">
                Number of Topics
              </Label>
              <Select value={selectedCount} onValueChange={setSelectedCount}>
                <SelectTrigger id="count" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 8, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} topics
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                You have {prayerData.topics.length} total topics available
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="pause" className="text-base">
                Pause After Each Prayer
              </Label>
              <Select value={pauseDuration} onValueChange={setPauseDuration}>
                <SelectTrigger id="pause" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="15">15 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="90">1.5 minutes</SelectItem>
                  <SelectItem value="120">2 minutes</SelectItem>
                  <SelectItem value="180">3 minutes</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Time to pause and reflect after each prayer point is read</p>
            </div>

            <Button onClick={startPraying} disabled={prayerData.topics.length === 0} size="lg" className="w-full gap-2 text-lg h-14">
              <Play className="w-5 h-5" />
              Start Praying
            </Button>

            {prayerData.topics.length === 0 && (
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
                  Pray for {topicNames[currentTopicIndex]}
                </h2>
                
                <div className="space-y-4 text-left max-w-3xl mx-auto">
                  {groupedPrayers[topicNames[currentTopicIndex]]?.map((point, index) => (
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
                        <p className="leading-relaxed">{point.text}</p>
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

          <div className={`${isFullscreen ? "mt-16" : "mt-8"} flex items-center justify-center gap-4`}>
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
        </div>
      )}
    </div>
  )
}
