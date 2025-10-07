export interface PrayerPoint {
  id: string
  text: string
  topicName?: string
}

export interface Topic {
  id: string
  name: string
  prayerPoints: PrayerPoint[]
}

export interface Category {
  id: string
  name: string
  topics: Topic[]
}

export interface PrayerData {
  categories: Category[]
}
