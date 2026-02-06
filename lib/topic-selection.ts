import type { Topic } from './types'

// Select topics deterministically by the oldest prayer point in each topic
export function selectTopicsByOldestPoint(grouped: { [topicName: string]: any[] }, count: number): string[] {
  const topics = Object.keys(grouped)
  const withOldest = topics.map(name => {
    const points = grouped[name] || []
    if (!points || points.length === 0) return { name, oldest: Infinity }
    // If any point has null/undefined last_prayed_for, treat as oldest (prioritize)
    for (const p of points) {
      if (!p.last_prayed_for) return { name, oldest: -Infinity }
    }
    const oldestTs = Math.min(...points.map(p => new Date(p.last_prayed_for).getTime()))
    return { name, oldest: oldestTs }
  })

  withOldest.sort((a, b) => a.oldest - b.oldest)
  return withOldest.slice(0, count).map(x => x.name)
}

export default selectTopicsByOldestPoint
