import { Topic } from "./types";
import { getAbidePoints, getPraisePoints, getConfessionPoints, silencePoints, lordsPrayerPoints } from "./included-topics";
import { selectTopicsByOldestPoint } from "./topic-selection";
import type { PrayerData } from "./types";

// Function to get the everyday flow with user prayer count
export function getEverydayFlow(userPrayerCount: number, prayerData: PrayerData): Topic[] {
  // Group user prayer points by topic
  const grouped: { [topicName: string]: any[] } = {}
  prayerData.topics.forEach((topic) => {
    const rawPoints = Array.isArray(topic.prayerPoints) ? topic.prayerPoints : []
    const pointsWithTopic = rawPoints.map((point) => ({
      ...point,
      topicName: topic.name,
    }))

    // Ensure per-topic ordering: unprayed (null) first, then by oldest last_prayed_for
    if (typeof pointsWithTopic.sort === 'function') {
      pointsWithTopic.sort((a, b) => {
        if (!a.last_prayed_for && b.last_prayed_for) return -1
        if (!b.last_prayed_for && a.last_prayed_for) return 1
        if (!a.last_prayed_for && !b.last_prayed_for) return 0
        return new Date(a.last_prayed_for!).getTime() - new Date(b.last_prayed_for!).getTime()
      })
    }

    // Attach topic recurrence for selection priority
    ;(pointsWithTopic as any).recurrence = topic.recurrence

    grouped[topic.name] = pointsWithTopic
  })

  const availableUserTopics = Object.keys(grouped)

  return [
    {
      id: 'abide',
      name: 'Abide',
      customSpeechHeader: "Let's Abide",
      prayerPoints: getAbidePoints()
    },
    {
      id: 'praise',
      name: 'Praise',
      prayerPoints: getPraisePoints()
    },
    {
      id: 'confession',
      name: 'Confession',
      prayerPoints: getConfessionPoints()
    },
    ...selectTopicsByOldestPoint(grouped, userPrayerCount).map(topicName => ({
      id: topicName.toLowerCase().replace(/\s+/g, '-'),
      name: topicName,
      customSpeechHeader: "Pray for " + topicName,
      prayerPoints: grouped[topicName] || []
    })),
    {
      id: 'silence',
      name: 'Silence',
      prayerPoints: silencePoints
    },
    {
      id: 'lords-prayer',
      name: 'Lord\'s Prayer',
      customSpeechHeader: "Let's finish with the Lord's Prayer",
      prayerPoints: lordsPrayerPoints
    }
  ];
}

// Function to get the your-prayers flow
export function getYourPrayersFlow(userPrayerCount: number, prayerData: PrayerData): Topic[] {
  // Group user prayer points by topic
  const grouped: { [topicName: string]: any[] } = {}
  prayerData.topics.forEach((topic) => {
    const rawPoints = Array.isArray(topic.prayerPoints) ? topic.prayerPoints : []
    const pointsWithTopic = rawPoints.map((point) => ({
      ...point,
      topicName: topic.name,
    }))

    // Ensure per-topic ordering: unprayed (null) first, then by oldest last_prayed_for
    if (typeof pointsWithTopic.sort === 'function') {
      pointsWithTopic.sort((a, b) => {
        if (!a.last_prayed_for && b.last_prayed_for) return -1
        if (!b.last_prayed_for && a.last_prayed_for) return 1
        if (!a.last_prayed_for && !b.last_prayed_for) return 0
        return new Date(a.last_prayed_for!).getTime() - new Date(b.last_prayed_for!).getTime()
      })
    }

    // Attach topic recurrence for selection priority
    ;(pointsWithTopic as any).recurrence = topic.recurrence

    grouped[topic.name] = pointsWithTopic
  })

  const availableUserTopics = Object.keys(grouped)

  return [
    {
      id: 'abide',
      name: 'Abide',
      customSpeechHeader: "Let's Abide",
      prayerPoints: getAbidePoints()
    },
    ...selectTopicsByOldestPoint(grouped, userPrayerCount).map(topicName => ({
      id: topicName.toLowerCase().replace(/\s+/g, '-'),
      name: topicName,
      customSpeechHeader: "Pray for " + topicName,
      prayerPoints: grouped[topicName] || []
    }))
  ];
}
