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
import { psalm13Flows } from "@/lib/psalm-13-flow"
import { psalm103Flows } from "@/lib/psalm-103-flow"
import { getEverydayFlow, getYourPrayersFlow } from "@/lib/everyday-flow"
import type { Topic } from "@/lib/types"
import { PrayerSessionPlayer } from "@/components/prayer-session-player"

type PrayerFlow = 'everyday' | 'your-prayers' | 'confession' | 'lords-prayer' | 'psalms'

type PsalmFlow = 'psalm-13' | 'psalm-103'

interface PrayerSessionTabProps {
  // Remove prayerData prop since we'll use the hook
}

  // Helper functions to get preview topics for UI descriptions
const getPreviewTopicsForFlow = (flow: PrayerFlow, psalmFlow: PsalmFlow, selectedCount: number, prayerData: any): string[] => {
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
  } else if (flow === 'psalms') {
    const topics = psalmFlow === 'psalm-13' ? psalm13Flows : psalm103Flows
    return topics.map(t => t.name)
  }
  return []
}

export function PrayerSessionTab({}: PrayerSessionTabProps) {
  const { prayerData, loading, error } = usePrayerData()
  const [selectedTotalTime, setSelectedTotalTime] = useState("10")
  const [calculatedPauseDuration, setCalculatedPauseDuration] = useState("30")
  const [voiceType, setVoiceType] = useState<"rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "amy" | "screenReader">("polly")
  const [silencePreference, setSilencePreference] = useState<string>("automatic")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [topicCountPreference, setTopicCountPreference] = useState<string>("automatic")
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [premiumUnavailable, setPremiumUnavailable] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<PrayerFlow>('everyday')
  const [selectedPsalmFlow, setSelectedPsalmFlow] = useState<PsalmFlow>('psalm-13')
  const [currentTopics, setCurrentTopics] = useState<Topic[]>([])
  const [previewTopics, setPreviewTopics] = useState<Topic[]>([])
  const [availableThemes, setAvailableThemes] = useState<string[]>([])
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  // Calculate selectedCount based on total time (more time = more topics)
  const getSelectedCountFromTime = (totalTimeMinutes: string): number => {
    const minutes = Number.parseInt(totalTimeMinutes)

    // Default mapping for 'everyday' flow (original behavior)
    if (selectedFlow === 'everyday') {
      // Scale: 5min=1 topics, 8min=2 topics, 10min=3 topics, 12min=4 topics, 15min=5 topics, 20min=7 topics
      if (minutes <= 5) return 1
      if (minutes <= 8) return 2
      if (minutes <= 10) return 3
      if (minutes <= 12) return 4
      if (minutes <= 15) return 5
      if (minutes <= 20) return 7
      return 5
    }

    // Alternate mapping for 'your-prayers' flow: let users cover more of their own prayer points
    if (selectedFlow === 'your-prayers') {
      // Suggested scale: 5min=1, 8min=2, 10min=4, 12min=5, 15min=6, 20min=8, 30min=10
      if (minutes <= 5) return 3
      if (minutes <= 8) return 4
      if (minutes <= 10) return 5
      if (minutes <= 12) return 6
      if (minutes <= 15) return 8
      if (minutes <= 20) return 10
      return 12
    }

    // Fallback: use the everyday mapping
    if (minutes <= 5) return 1
    if (minutes <= 8) return 2
    if (minutes <= 10) return 3
    if (minutes <= 12) return 4
    if (minutes <= 15) return 5
    if (minutes <= 20) return 7
    return 5
  }

  const selectedCount = topicCountPreference === "automatic"
    ? getSelectedCountFromTime(selectedTotalTime)
    : Number.parseInt(topicCountPreference)

  // Maintain a cached preview of the topics so the preview shown in the UI
  // matches the actual topics used when starting the session (prevents
  // getYourPrayers from returning a different random set on start)
  useEffect(() => {
    if (!prayerData) {
      setPreviewTopics([])
      return
    }

    // Build available themes when prayerData changes
    const themes = Array.from(new Set(prayerData.topics.flatMap(t => t.themes || []))).filter(Boolean)
    setAvailableThemes(themes)

    let topics: Topic[] = []
    if (selectedFlow === 'everyday') {
      topics = getEverydayFlow(selectedCount, prayerData)
    } else if (selectedFlow === 'your-prayers') {
      if (selectedTheme) {
        topics = prayerData.topics.filter(tt => (tt.themes || []).includes(selectedTheme))
      } else {
        topics = getYourPrayersFlow(selectedCount, prayerData)
      }
    } else if (selectedFlow === 'confession') {
      topics = confessionFlows
    } else if (selectedFlow === 'lords-prayer') {
      topics = lordsPrayerFlows
    } else if (selectedFlow === 'psalms') {
      topics = selectedPsalmFlow === 'psalm-13' ? psalm13Flows : psalm103Flows
    }

    setPreviewTopics(topics)
  }, [selectedFlow, selectedCount, prayerData, selectedPsalmFlow, selectedTheme])

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
    // Use the cached previewTopics if available so the actual session uses
    // exactly what was shown in the preview.
    let topics: Topic[] = previewTopics && previewTopics.length > 0 ? previewTopics : []

    // Fallback (shouldn't usually be needed)
    if (topics.length === 0) {
      console.log("Got to fallback unfortunately")
      if (selectedFlow === 'everyday') {
        topics = getEverydayFlow(selectedCount, prayerData)
      } else if (selectedFlow === 'your-prayers') {
        topics = getYourPrayersFlow(selectedCount, prayerData)
      } else if (selectedFlow === 'confession') {
        topics = confessionFlows
      } else if (selectedFlow === 'lords-prayer') {
        topics = lordsPrayerFlows
      } else if (selectedFlow === 'psalms') {
        topics = selectedPsalmFlow === 'psalm-13' ? psalm13Flows : psalm103Flows
      }
    }

    // Calculate dynamic pause duration
    console.log('🕒 Calculating pause duration:')
    console.log(`  Total time selected: ${selectedTotalTime} minutes = ${Number.parseInt(selectedTotalTime) * 60} seconds`)

    const totalSelectedSeconds = Number.parseInt(selectedTotalTime) * 60
    const silenceSeconds = selectedFlow === 'everyday' && silenceOption !== 'skip' ? Number.parseInt(silenceOption) : 0

    console.log(`  Silence time per silence topic: ${silenceSeconds} seconds`)

    // Count prayer points that will have pauses (excluding Silence)
    const prayerPointsForPaces = topics
      .filter(topic => topic.name !== 'Silence')
      .reduce((total, topic) => total + topic.prayerPoints.length, 0)

    console.log(`  Prayer points that will have pauses (excluding Silence): ${prayerPointsForPaces}`)
    console.log(`    Breakdown:`)
    topics.forEach((topic, index) => {
      if (topic.name !== 'Silence') {
        console.log(`      ${topic.name}: ${topic.prayerPoints.length} prayer points`)
      } else {
        console.log(`      ${topic.name}: ${topic.prayerPoints.length} prayer points (excluded from pause calculation)`)
      }
    })

  // Calculate time reserved for topic headings (5 seconds per heading)
  // A heading is announced unless customSpeechHeader is explicitly an empty string
  const headingCount = topics.filter(t => t.customSpeechHeader !== '').length
  const headingSeconds = headingCount * 5

  // Available time for pauses (total time minus silence time and topic heading time)
  const availableSecondsForPauses = Math.max(0, totalSelectedSeconds - silenceSeconds - headingSeconds)

  console.log(`  Heading count: ${headingCount}, reserved heading time: ${headingSeconds} seconds`)
  console.log(`  Available time for pauses (total time - silence time - heading time): ${availableSecondsForPauses} seconds`)

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

  // Note: removed toast usage for ElevenLabs check per request; we'll log to console instead

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
            // Set UI state from saved settings
            setVoiceType(data.voice_type as "rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "amy" | "screenReader")
            setSilencePreference(data.silence_preference)
            setTopicCountPreference(data.topic_count_preference)

            // Only perform the ElevenLabs check (and show the warning) if the saved setting is an ElevenLabs voice
            if (data.voice_type === 'maysie' || data.voice_type === 'rachel') {
              try {
                const res = await fetch('/api/elevenlabs/check-tokens')
                if (!res.ok) {
                  const err = await res.json().catch(() => ({ error: 'unknown' }))
                  console.warn('ElevenLabs check failed', err)
                } else {
                  const json = await res.json()

                  // Log to browser console
                  try {
                    if (json.tokensLeft == null) {
                      console.log('[ElevenLabs] tokensLeft: null')
                    } else {
                      console.log('[ElevenLabs] tokensLeft:', json.tokensLeft, 'character_count:', json.character_count, 'character_limit:', json.character_limit)
                    }
                  } catch (e) {
                    // ignore
                  }

                  if (json.tokensLeft == null) {
                    console.log('[ElevenLabs] could not determine remaining tokens')
                  } else {
                    console.log('[ElevenLabs] tokensLeft:', json.tokensLeft)

                    if (typeof json.tokensLeft === 'number' && json.tokensLeft < 200) {
                      console.log('[ElevenLabs] tokens low, defaulting to Polly (Ruth)')
                      setVoiceType('polly')
                      setPremiumUnavailable(true)
                    }
                  }
                }
              } catch (e) {
                console.warn('Error checking ElevenLabs tokens:', e)
              }
            }
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

  // (Token check is performed during settings load only; no-op here)

  // (Token re-check on voice change removed — checks are performed during settings load only)

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
          onStop={async () => {
            try {
              // Collect all prayer point ids from the current session topics
              const ids: string[] = []
              currentTopics.forEach(t => {
                t.prayerPoints.forEach(p => {
                  if (p.id) ids.push(p.id)
                })
              })

              // Only UUIDs are stored in the DB; filter out local/static IDs (e.g. 'lords-prayer-1')
              const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
              const validIds = ids.filter(id => uuidRegex.test(id))
              const invalidIds = ids.filter(id => !uuidRegex.test(id))
              if (invalidIds.length > 0) {
                console.warn('Skipping non-UUID prayer point ids when updating last_prayed_for:', invalidIds)
              }

              if (validIds.length > 0) {
                // Update last_prayed_for to now() for all prayer points in this session
                const nowIso = new Date().toISOString()
                const { error } = await supabase
                  .from('prayer_points')
                  .update({ last_prayed_for: nowIso })
                  .in('id', validIds)

                if (error) {
                  console.warn('Failed to update last_prayed_for for prayer points:', error)
                }
              }
            } catch (e) {
              console.warn('Error updating last_prayed_for:', e)
            } finally {
              setIsPlaying(false)
              setCurrentTopics([])
              console.log("Updated!")
            }
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
            {premiumUnavailable && (
              <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-2 text-sm text-yellow-900">
                Premium Voices are unavailable, you have been defaulted back to a different voice
              </div>
            )}
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
                  <SelectItem value="psalms">Psalms</SelectItem>
                </SelectContent>
              </Select>
              {selectedFlow === 'psalms' && (
                <>
                  <Label htmlFor="psalm" className="text-base">
                    Select Psalm
                  </Label>
                  <Select value={selectedPsalmFlow} onValueChange={(value: PsalmFlow) => setSelectedPsalmFlow(value)}>
                    <SelectTrigger id="psalm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="psalm-13">Psalm 13</SelectItem>
                      <SelectItem value="psalm-103">Psalm 103</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
              {selectedFlow === 'your-prayers' && (
                <>
                  {availableThemes.length > 0 && (
                    <>
                      <Label htmlFor="theme" className="text-base mt-3">Theme</Label>
                      <Select value={selectedTheme ?? 'ALL_THEMES'} onValueChange={(v: string) => { setSelectedTheme(v === 'ALL_THEMES' ? null : v) }}>
                        <SelectTrigger id="theme" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL_THEMES">All Themes</SelectItem>
                          {availableThemes.map((th) => (
                            <SelectItem key={th} value={th}>{th}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {/* Time limit selection removed here to avoid duplicate; global Total Prayer Time is used instead */}
                </>
              )}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20 shadow-sm">
                <div className="space-y-2">
                  {(previewTopics && previewTopics.length > 0 ? previewTopics.map(t => t.name) : getPreviewTopicsForFlow(selectedFlow, selectedPsalmFlow, selectedCount, prayerData)).map((topicName, index) => (
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
            <Button
              onClick={startPraying}
              size="lg"
              className="w-full gap-2 text-lg h-14"
              disabled={
                // For flows that require user prayer data, ensure previewTopics is ready
                (selectedFlow !== 'confession' && selectedFlow !== 'lords-prayer' && previewTopics.length === 0)
              }
            >
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
