export interface PrayerPoint {
  id: string
  text: string
  verseReference?: string | null
  timePercentage?: number
  // Internal metadata
  topicName?: string
  last_prayed_for?: string | null
}

export interface PrayerTopic {
  id: string
  name: string
  customSpeechHeader?: string
  prayerPoints: PrayerPoint[]
  themes?: string[]
  recurrence?: string
}

export type Topic = PrayerTopic

export interface PrayerFlow {
  id: string
  name: string
  topics: PrayerTopic[]
}

export interface PrayerFlowDefinition {
  id: string
  name: string
  topicIds: string[]
}

export interface PrayerData {
  topics: PrayerTopic[]
  flows?: PrayerFlow[]
}
