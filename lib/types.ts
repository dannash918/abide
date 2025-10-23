export interface PrayerPoint {
  id: string
  text: string
  topicName?: string
  verseReference?: string
}

export interface Topic {
  id: string
  name: string
  prayerPoints: PrayerPoint[]
  customSpeechHeader?: string
}

export interface PrayerData {
  topics: Topic[]
}
