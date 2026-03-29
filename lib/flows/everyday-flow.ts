import type { PrayerData, PrayerFlow } from "../types";
import { getAbidePoints } from "../topics/abide-topics";
import { getPraisePoints } from "../topics/praise-topics";
import { getConfessionPoints } from "../topics/confess-topics";
import { silencePoints } from "../topics/silence-topic";
import { lordsPrayerPoints } from "../topics/lords-prayer-topic";
import { selectTopicsByOldestPoint } from "../topic-selection";
import groupAndNormalizeTopics from '../topic-utils'

export function getEverydayFlow(userPrayerCount: number, prayerData: PrayerData): PrayerFlow {
  const grouped = groupAndNormalizeTopics(prayerData)

  const topics = [
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
      prayerPoints: (grouped[topicName]?.points) || []
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

  return { id: 'everyday', name: 'Everyday', topics }
}

export function getYourPrayersFlow(userPrayerCount: number, prayerData: PrayerData): PrayerFlow {
  const grouped = groupAndNormalizeTopics(prayerData)

  const topics = [
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
      prayerPoints: (grouped[topicName]?.points) || []
    }))
  ];

  return { id: 'your-prayers', name: 'Your Prayers', topics }
}
