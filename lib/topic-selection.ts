import type { Topic } from './types'

// Select topics deterministically by the oldest prayer point in each topic
import type { NormalizedTopic } from './topic-utils'

// grouped: Record<topicName, { points: any[], recurrence?: string }>
export function selectTopicsByOldestPoint(grouped: Record<string, NormalizedTopic>, count: number): string[] {
  const topics = Object.keys(grouped)
  const withOldest = topics.map(name => {
    const data = grouped[name]
    const points = data?.points || []
    const recurrence = data?.recurrence
    const isDaily = recurrence === 'daily'
    if (!points || points.length === 0) return { name, oldest: Infinity, isDaily, hasUnprayed: false }

    for (const p of points) {
      if (!p.last_prayed_for) return { name, oldest: -Infinity, isDaily, hasUnprayed: true }
    }

    const oldestTs = Math.min(...points.map(p => new Date(p.last_prayed_for).getTime()))
    return { name, oldest: oldestTs, isDaily, hasUnprayed: false }
  })

  withOldest.sort((a, b) => {
    if (a.isDaily && !b.isDaily) return -1
    if (b.isDaily && !a.isDaily) return 1
    if (a.hasUnprayed && !b.hasUnprayed) return -1
    if (b.hasUnprayed && !a.hasUnprayed) return 1
    return a.oldest - b.oldest
  })

  return withOldest.slice(0, count).map(x => x.name)
}

export default selectTopicsByOldestPoint
