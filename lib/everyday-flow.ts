import { Topic } from "./types";
import { abidePoints, getPraisePoints, getConfessionPoints, silencePoints, lordsPrayerPoints, getYourPrayers } from "./included-topics";
import type { PrayerData } from "./types";

// Function to get the everyday flow with user prayer count
export function getEverydayFlow(userPrayerCount: number, prayerData: PrayerData): Topic[] {
  // Group user prayer points by topic
  const grouped: { [topicName: string]: any[] } = {}
  prayerData.topics.forEach((topic) => {
    const pointsWithTopic = topic.prayerPoints.map((point) => ({
      ...point,
      topicName: topic.name,
    }))
    grouped[topic.name] = pointsWithTopic
  })

  const availableUserTopics = Object.keys(grouped)

  return [
    {
      id: 'abide',
      name: 'Abide',
      customSpeechHeader: "Let's Abide",
      prayerPoints: abidePoints
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
    ...getYourPrayers(availableUserTopics, userPrayerCount).map(topicName => ({
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
      prayerPoints: lordsPrayerPoints
    }
  ];
}

// Function to get the your-prayers flow
export function getYourPrayersFlow(userPrayerCount: number, prayerData: PrayerData): Topic[] {
  // Group user prayer points by topic
  const grouped: { [topicName: string]: any[] } = {}
  prayerData.topics.forEach((topic) => {
    const pointsWithTopic = topic.prayerPoints.map((point) => ({
      ...point,
      topicName: topic.name,
    }))
    grouped[topic.name] = pointsWithTopic
  })

  const availableUserTopics = Object.keys(grouped)

  return [
    {
      id: 'abide',
      name: 'Abide',
      customSpeechHeader: "Let's Abide",
      prayerPoints: abidePoints
    },
    ...getYourPrayers(availableUserTopics, userPrayerCount).map(topicName => ({
      id: topicName.toLowerCase().replace(/\s+/g, '-'),
      name: topicName,
      customSpeechHeader: "Pray for " + topicName,
      prayerPoints: grouped[topicName] || []
    }))
  ];
}
