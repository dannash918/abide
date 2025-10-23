"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Play, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePrayerData } from "@/hooks/use-prayer-data"
import { PrayerSettingsModal } from "@/components/prayer-settings-modal"
import { supabase } from "@/lib/supabase"
import { confessionFlows } from "@/lib/confession-flow"
import { lordsPrayerFlows } from "@/lib/lords-prayer-flow"
import { getEverydayFlow, getYourPrayersFlow } from "@/lib/everyday-flow"
import type { Topic } from "@/lib/types"
import { PrayerSessionPlayer } from "@/components/prayer-session-player"

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
  const [selectedTotalTime, setSelectedTotalTime] = useState("10")
  const [calculatedPauseDuration, setCalculatedPauseDuration] = useState("30")
  const [voiceType, setVoiceType] = useState<"rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "screenReader">("polly")
  const [silencePreference, setSilencePreference] = useState<string>("automatic")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [topicCountPreference, setTopicCountPreference] = useState<string>("automatic")
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<PrayerFlow>('everyday')
  const [currentTopics, setCurrentTopics] = useState<Topic[]>([])

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

    // Calculate dynamic pause duration
    console.log('🕒 Calculating pause duration:')
    console.log(`  Total time selected: ${selectedTotalTime} minutes = ${Number.parseInt(selectedTotalTime) * 60} seconds`)

    const totalSelectedSeconds = Number.parseInt(selectedTotalTime) * 60
    const silenceSeconds = selectedFlow === 'everyday' && silenceOption !== 'skip' ? Number.parseInt(silenceOption) : 0

    console.log(`  Silence time per silence topic: ${silenceSeconds} seconds`)

    // Count prayer points that will have pauses (excluding Lord's Prayer and Silence)
    const prayerPointsForPaces = topics
      .filter(topic => topic.name !== 'Lord\'s Prayer' && topic.name !== 'Silence')
      .reduce((total, topic) => total + topic.prayerPoints.length, 0)

    console.log(`  Prayer points that will have pauses (excluding Lord's Prayer and Silence): ${prayerPointsForPaces}`)
    console.log(`    Breakdown:`)
    topics.forEach((topic, index) => {
      if (topic.name !== 'Lord\'s Prayer' && topic.name !== 'Silence') {
        console.log(`      ${topic.name}: ${topic.prayerPoints.length} prayer points`)
      } else {
        console.log(`      ${topic.name}: ${topic.prayerPoints.length} prayer points (excluded from pause calculation)`)
      }
    })

    // Available time for pauses (total time minus silence time)
    const availableSecondsForPauses = totalSelectedSeconds - silenceSeconds

    console.log(`  Available time for pauses (total time - silence time): ${availableSecondsForPauses} seconds`)

    // Calculate pause duration per prayer point (minimum 3 seconds)
    const calculatedPause = prayerPointsForPaces > 0
      ? Math.max(3, Math.floor(availableSecondsForPauses / prayerPointsForPaces))
      : 30 // fallback

    console.log(`  Calculated pause duration per prayer point: ${calculatedPause} seconds (min 3s, fallback 30s)`)

    setCalculatedPauseDuration(calculatedPause.toString())
    setCurrentTopics(topics)
    setIsPlaying(true)
  }

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
      {isPlaying ? (
        <PrayerSessionPlayer
          topics={currentTopics}
          selectedFlow={selectedFlow}
          silenceOption={silenceOption}
          calculatedPauseDuration={calculatedPauseDuration}
          voiceType={voiceType}
          onStop={() => {
            setIsPlaying(false)
            setCurrentTopics([])
          }}
        />
      ) : (
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
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20 shadow-sm">
                <div className="space-y-2">
                  {getPreviewTopicsForFlow(selectedFlow, selectedCount, prayerData).map((topicName, index) => (
                    <div key={`topic-${index}`} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
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
      )}
    </div>
  )
}
