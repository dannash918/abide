export interface PrayerPoint {
  id: string
  text: string
  topicName?: string
  verseReference?: string
  last_prayed_for?: string
}

export interface Topic {
  id: string
  name: string
  prayerPoints: PrayerPoint[]
  themes?: string[]
  customSpeechHeader?: string
}

export interface PrayerData {
  topics: Topic[]
}
