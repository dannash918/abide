import type { Topic } from './types'

// Select topics deterministically by the oldest prayer point in each topic
export function selectTopicsByOldestPoint(grouped: { [topicName: string]: any[] }, count: number): string[] {
  const topics = Object.keys(grouped)
  const withOldest = topics.map(name => {
    const points = grouped[name] || []
    const recurrence = (points as any).recurrence
    const isDaily = recurrence === 'daily'
    if (!points || points.length === 0) return { name, oldest: Infinity, isDaily, hasUnprayed: false }

    // If any point has null/undefined last_prayed_for, mark as unprayed (prioritize)
    for (const p of points) {
      if (!p.last_prayed_for) return { name, oldest: -Infinity, isDaily, hasUnprayed: true }
    }

    const oldestTs = Math.min(...points.map(p => new Date(p.last_prayed_for).getTime()))
    return { name, oldest: oldestTs, isDaily, hasUnprayed: false }
  })

  withOldest.sort((a, b) => {
    // daily topics first
    if (a.isDaily && !b.isDaily) return -1
    if (b.isDaily && !a.isDaily) return 1
    // then topics with unprayed points
    if (a.hasUnprayed && !b.hasUnprayed) return -1
    if (b.hasUnprayed && !a.hasUnprayed) return 1
    // finally by oldest timestamp (smaller = older)
    return a.oldest - b.oldest
  })

  return withOldest.slice(0, count).map(x => x.name)
}

export default selectTopicsByOldestPoint
