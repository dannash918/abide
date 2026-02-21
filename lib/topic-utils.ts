import type { PrayerData } from './types'

export type NormalizedTopic = {
  points: any[]
  recurrence?: string | null
}

// Group and normalize topics: ensures points is always an array,
// sorts points (unprayed first, then by oldest last_prayed_for),
// and exposes recurrence separately instead of attaching to array.
export function groupAndNormalizeTopics(prayerData: PrayerData): Record<string, NormalizedTopic> {
  const grouped: Record<string, NormalizedTopic> = {}

  prayerData.topics.forEach((topic) => {
    const rawPoints = Array.isArray(topic.prayerPoints) ? topic.prayerPoints : []
    const points = rawPoints.map((p) => ({ ...p, topicName: topic.name }))

    if (typeof points.sort === 'function') {
      points.sort((a, b) => {
        if (!a.last_prayed_for && b.last_prayed_for) return -1
        if (!b.last_prayed_for && a.last_prayed_for) return 1
        if (!a.last_prayed_for && !b.last_prayed_for) return 0
        return new Date(a.last_prayed_for).getTime() - new Date(b.last_prayed_for).getTime()
      })
    }

    grouped[topic.name] = {
      points,
      recurrence: (topic as any).recurrence || null
    }
  })

  return grouped
}

export default groupAndNormalizeTopics
