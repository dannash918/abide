import type { PrayerData, PrayerFlow } from "../types";
import { getAbideTopic } from "../topics/abide-topics";
import { getPraiseTopic } from "../topics/praise-topics";
import { getConfessionTopic } from "../topics/confess-topics";
import { getSilenceTopic } from "../topics/silence-topic";
import { getLordsPrayerTopic } from "../topics/lords-prayer-topic";
import { selectTopicsByOldestPoint } from "../topic-selection";
import groupAndNormalizeTopics from '../topic-utils'

export function getEverydayFlow(userPrayerCount: number, prayerData: PrayerData): PrayerFlow {
  const grouped = groupAndNormalizeTopics(prayerData)

  const topics = [
    {
      id: 'abide',
      name: 'Abide',
      customSpeechHeader: "Let's Abide",
      prayerPoints: getAbideTopic().prayerPoints
    },
    getPraiseTopic(),
    {
      id: 'confession',
      name: 'Confession',
      prayerPoints: getConfessionTopic().prayerPoints
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
      prayerPoints: getSilenceTopic().prayerPoints
    },
    {
      id: 'lords-prayer',
      name: 'Lord\'s Prayer',
      customSpeechHeader: "Let's finish with the Lord's Prayer",
      prayerPoints: getLordsPrayerTopic().prayerPoints
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
      prayerPoints: getAbideTopic().prayerPoints
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
