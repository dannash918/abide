"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Settings, Volume2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

type PrayerSettingsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  voiceType: "rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "screenReader"
  setVoiceType: (value: "rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "screenReader") => void
  silencePreference: string
  setSilencePreference: (value: string) => void
  topicCountPreference: string
  setTopicCountPreference: (value: string) => void
}

export function PrayerSettingsModal({
  open,
  onOpenChange,
  voiceType,
  setVoiceType,
  silencePreference,
  setSilencePreference,
  topicCountPreference,
  setTopicCountPreference,
}: PrayerSettingsModalProps) {
  const [isPlayingSample, setIsPlayingSample] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  const playSampleVoice = async (selectedVoice: "rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "screenReader") => {
    if (isPlayingSample) return

    const sampleText = "Abide in Me, and I will Abide in you."

    setIsPlayingSample(true)

    try {
      if (selectedVoice === "rachel") {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(sampleText)}&provider=rachel`)
        if (response.ok) {
          const blob = await response.blob()
          const audio = new Audio(URL.createObjectURL(blob))
          audio.play()
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve()
            audio.onerror = () => resolve()
          })
        }
      } else if (selectedVoice === "polly") {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(sampleText)}&provider=polly`)
        if (response.ok) {
          const blob = await response.blob()
          const audio = new Audio(URL.createObjectURL(blob))
          audio.play()
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve()
            audio.onerror = () => resolve()
          })
        }
      } else if (selectedVoice === "danielle") {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(sampleText)}&provider=danielle`)
        if (response.ok) {
          const blob = await response.blob()
          const audio = new Audio(URL.createObjectURL(blob))
          audio.play()
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve()
            audio.onerror = () => resolve()
          })
        }
      } else if (selectedVoice === "patrick") {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(sampleText)}&provider=patrick`)
        if (response.ok) {
          const blob = await response.blob()
          const audio = new Audio(URL.createObjectURL(blob))
          audio.play()
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve()
            audio.onerror = () => resolve()
          })
        }
      } else if (selectedVoice === "maysie") {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(sampleText)}&provider=maysie`)
        if (response.ok) {
          const blob = await response.blob()
          const audio = new Audio(URL.createObjectURL(blob))
          audio.play()
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve()
            audio.onerror = () => resolve()
          })
        }
      } else if (selectedVoice === "stephen") {
        const response = await fetch(`/api/tts?text=${encodeURIComponent(sampleText)}&provider=stephen&type=generative`)
        if (response.ok) {
          const blob = await response.blob()
          const audio = new Audio(URL.createObjectURL(blob))
          audio.play()
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve()
            audio.onerror = () => resolve()
          })
        }
      } else {
        // Screen reader
        if (typeof window !== "undefined" && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(sampleText)
          utterance.rate = 0.75
          utterance.pitch = 1.0
          utterance.volume = 0.9
          window.speechSynthesis.speak(utterance)
          await new Promise<void>((resolve) => {
            utterance.onend = () => resolve()
            utterance.onerror = () => resolve()
          })
        }
      }
    } catch (error) {
      console.warn('Failed to play voice sample:', error)
    } finally {
      setIsPlayingSample(false)
    }
  }

  const handleVoiceChange = (value: "rachel" | "maysie" | "polly" | "danielle" | "patrick" | "stephen" | "screenReader") => {
    setVoiceType(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={isPlayingSample}>
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label htmlFor="voice-modal" className="text-base">
              Voice Type
            </Label>
            <div className="flex gap-2">
              <Select value={voiceType} onValueChange={handleVoiceChange}>
                <SelectTrigger id="voice-modal" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="polly">Ruth</SelectItem>
                  <SelectItem value="danielle">Danielle</SelectItem>
                  <SelectItem value="patrick">Patrick</SelectItem>
                  <SelectItem value="stephen">Stephen</SelectItem>
                  <SelectItem value="rachel">Rachel</SelectItem>
                  <SelectItem value="maysie">Maysie</SelectItem>
                  <SelectItem value="screenReader">Screen Reader</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => playSampleVoice(voiceType)}
                disabled={isPlayingSample}
                className="shrink-0"
              >
                <Volume2 className={`h-4 w-4 ${isPlayingSample ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="silence-modal" className="text-base">
              Silence Time
            </Label>
            <Select value={silencePreference} onValueChange={setSilencePreference}>
              <SelectTrigger id="silence-modal" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic (based on session length)</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="45">45 seconds</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
                <SelectItem value="90">90 seconds</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
                <SelectItem value="180">3 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label htmlFor="topics-modal" className="text-base">
              Number of Prayer Topics
            </Label>
            <Select value={topicCountPreference} onValueChange={setTopicCountPreference}>
              <SelectTrigger id="topics-modal" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic (based on session length)</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="7">7</SelectItem>
                <SelectItem value="10">10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={async () => {
              try {
                setIsSavingSettings(true)
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                  // Use upsert instead of manual insert/update - it's more reliable
                  const { error } = await supabase
                    .from('user_settings')
                    .upsert({
                      user_id: user.id,
                      voice_type: voiceType,
                      silence_preference: silencePreference,
                      topic_count_preference: topicCountPreference
                    }, {
                      onConflict: 'user_id'
                    })

                  if (error) {
                    console.error('Failed to save settings:', error)
                  }
                }
              } catch (error) {
                console.error('Failed to save settings:', error)
              } finally {
                setIsSavingSettings(false)
                onOpenChange(false)
              }
            }}
            disabled={isSavingSettings || isPlayingSample}
          >
            {isSavingSettings ? 'Saving...' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
