"use client"

import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

type PrayerSettingsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  voiceType: "elevenlabs" | "polly" | "screenReader"
  setVoiceType: (value: "elevenlabs" | "polly" | "screenReader") => void
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8">
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
            <Select value={voiceType} onValueChange={(value: "elevenlabs" | "polly" | "screenReader") => setVoiceType(value)}>
              <SelectTrigger id="voice-modal" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="polly">Ruth</SelectItem>
                <SelectItem value="elevenlabs">Rachel</SelectItem>
                <SelectItem value="screenReader">Screen Reader</SelectItem>
              </SelectContent>
            </Select>
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
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
