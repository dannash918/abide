import { Topic } from "./types";
import { getAbidePoints, getPraisePoints, getConfessionPoints, silencePoints, lordsPrayerPoints } from "./included-topics";
import { selectTopicsByOldestPoint } from "./topic-selection";
import groupAndNormalizeTopics from './topic-utils'
import type { PrayerData } from "./types";

// Function to get the everyday flow with user prayer count
export function getEverydayFlow(userPrayerCount: number, prayerData: PrayerData): Topic[] {
  // Group and normalize topics (sorting + recurrence extraction)
  const grouped = groupAndNormalizeTopics(prayerData)

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
}

// Function to get the your-prayers flow
export function getYourPrayersFlow(userPrayerCount: number, prayerData: PrayerData): Topic[] {
  // Group and normalize topics (sorting + recurrence extraction)
  const grouped = groupAndNormalizeTopics(prayerData)

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
      prayerPoints: (grouped[topicName]?.points) || []
    }))
  ];
}
