"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Play, Pause, SkipForward, Volume2, VolumeX, X, Loader2 } from "lucide-react"
import type { PrayerData, PrayerPoint } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePrayerData } from "@/hooks/use-prayer-data"

interface PrayerSessionTabProps {
  // Remove prayerData prop since we'll use the hook
}

export function PrayerSessionTab({}: PrayerSessionTabProps) {
  const { prayerData, loading, error } = usePrayerData()
  const [selectedCount, setSelectedCount] = useState("5")
  const [pauseDuration, setPauseDuration] = useState("30")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedPoints, setSelectedPoints] = useState<PrayerPoint[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        const femaleVoices = voices.filter((voice) => {
          const nameLower = voice.name.toLowerCase()
          const langLower = voice.lang.toLowerCase()
          return (
            (nameLower.includes("female") ||
              nameLower.includes("woman") ||
              nameLower.includes("samantha") ||
              nameLower.includes("victoria") ||
              nameLower.includes("karen") ||
              nameLower.includes("moira") ||
              nameLower.includes("tessa") ||
              nameLower.includes("fiona") ||
              (nameLower.includes("google") && nameLower.includes("us")) ||
              nameLower.includes("zira") ||
              nameLower.includes("susan") ||
              nameLower.includes("allison")) &&
            langLower.startsWith("en")
          )
        })

        const bestVoice =
          femaleVoices.find((v) => v.name.toLowerCase().includes("google")) ||
          femaleVoices.find((v) => v.name.toLowerCase().includes("premium")) ||
          femaleVoices.find((v) => !v.name.toLowerCase().includes("compact")) ||
          femaleVoices[0] ||
          voices.find((v) => v.lang.startsWith("en"))

        if (bestVoice) {
          setSelectedVoice(bestVoice)
          console.log("[v0] Selected voice:", bestVoice.name)
        }
      }

      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

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

  const startPraying = () => {
    const allPoints = getAllPrayerPoints()
    if (allPoints.length === 0) return

    const shuffled = [...allPoints].sort(() => Math.random() - 0.5)
    const count = Math.min(Number.parseInt(selectedCount), shuffled.length)
    const selected = shuffled.slice(0, count)

    setSelectedPoints(selected)
    setCurrentIndex(0)
    setIsPlaying(true)
    setIsPaused(false)
    setIsFullscreen(true)
  }

  const stopPraying = () => {
    setIsPlaying(false)
    setCurrentIndex(0)
    setSelectedPoints([])
    setIsPaused(false)
    setIsFullscreen(false)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  const togglePause = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (isPaused) {
        window.speechSynthesis.resume()
      } else {
        window.speechSynthesis.pause()
      }
      setIsPaused(!isPaused)
    }
  }

  const skipToNext = () => {
    if (currentIndex < selectedPoints.length - 1) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setCurrentIndex(currentIndex + 1)
      setIsPaused(false)
    } else {
      stopPraying()
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (!isMuted) {
        window.speechSynthesis.cancel()
      }
    }
  }

  useEffect(() => {
    if (isPlaying && selectedPoints.length > 0 && !isMuted) {
      const currentPoint = selectedPoints[currentIndex]

      if (typeof window !== "undefined" && window.speechSynthesis) {
        const textToSpeak = currentPoint.topicName
          ? `Pray for ${currentPoint.topicName}. ${currentPoint.text}`
          : currentPoint.text

        const utterance = new SpeechSynthesisUtterance(textToSpeak)
        if (selectedVoice) {
          utterance.voice = selectedVoice
        }
        utterance.rate = 0.85
        utterance.pitch = 1.1
        utterance.volume = 1

        utterance.onend = () => {
          setTimeout(() => {
            if (currentIndex < selectedPoints.length - 1) {
              setCurrentIndex(currentIndex + 1)
              setIsPaused(false)
            } else {
              stopPraying()
            }
          }, Number.parseInt(pauseDuration) * 1000)
        }

        window.speechSynthesis.speak(utterance)
      }
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [currentIndex, isPlaying, selectedPoints, isMuted, selectedVoice, pauseDuration])

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
            <CardDescription>Select how many prayer points you'd like to pray through</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="count" className="text-base">
                Number of Prayer Points
              </Label>
              <Select value={selectedCount} onValueChange={setSelectedCount}>
                <SelectTrigger id="count" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 7, 10, 15, 20].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} prayer points
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                You have {totalPoints} total prayer {totalPoints === 1 ? "point" : "points"} available
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="pause" className="text-base">
                Quiet Time After Each Prayer
              </Label>
              <Select value={pauseDuration} onValueChange={setPauseDuration}>
                <SelectTrigger id="pause" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="90">1.5 minutes</SelectItem>
                  <SelectItem value="120">2 minutes</SelectItem>
                  <SelectItem value="180">3 minutes</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Time to pray silently after each point is read</p>
            </div>

            <Button onClick={startPraying} disabled={totalPoints === 0} size="lg" className="w-full gap-2 text-lg h-14">
              <Play className="w-5 h-5" />
              Start Praying
            </Button>

            {totalPoints === 0 && (
              <p className="text-center text-sm text-muted-foreground text-balance">
                Add some prayer points in the "Manage Prayers" tab to get started
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={`${isFullscreen ? "fixed inset-0 bg-gradient-to-br from-background via-primary/5 to-accent/10 flex flex-col items-center justify-center p-8 z-50" : "space-y-4"}`}
        >
          <div className={`${isFullscreen ? "absolute top-0 left-0 right-0" : "mb-4"}`}>
            <div className="w-full bg-secondary/30 h-1">
              <div
                className="bg-primary h-1 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / selectedPoints.length) * 100}%` }}
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
              Prayer Point {currentIndex + 1} of {selectedPoints.length}
            </span>
          </div>

          <div className={`${isFullscreen ? "max-w-4xl w-full text-center" : ""}`}>
            {selectedPoints[currentIndex]?.topicName && (
              <p className={`${isFullscreen ? "text-2xl md:text-3xl" : "text-lg"} text-primary/80 font-semibold mb-6`}>
                Pray for {selectedPoints[currentIndex].topicName}
              </p>
            )}
            <p
              className={`${isFullscreen ? "text-4xl md:text-5xl lg:text-6xl" : "text-xl"} leading-relaxed text-balance font-medium`}
            >
              {selectedPoints[currentIndex]?.text}
            </p>
          </div>

          <div className={`${isFullscreen ? "mt-16" : "mt-8"} flex items-center justify-center gap-4`}>
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
            <Button
              variant="outline"
              size="icon"
              onClick={skipToNext}
              className={`${isFullscreen ? "h-16 w-16" : "h-12 w-12"} rounded-full bg-background/50 backdrop-blur border-primary/20 hover:bg-background/80`}
            >
              <SkipForward className={`${isFullscreen ? "w-7 h-7" : "w-5 h-5"}`} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
