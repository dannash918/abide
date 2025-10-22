import { Topic, PrayerPoint } from "./types";
import { abidePoints, getPraisePoints, getConfessionPoints, silencePoints, lordsPrayerPoints, getYourPrayers } from "./included-topics";

// Function to get the everyday flow with user prayer count
export function getEverydayFlow(userPrayerCount: number, availableUserTopics: string[], grouped: { [key: string]: PrayerPoint[] }): Topic[] {
  return [
    {
      id: 'abide',
      name: 'Abide',
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
export function getYourPrayersFlow(userPrayerCount: number, availableUserTopics: string[], grouped: { [key: string]: PrayerPoint[] }): Topic[] {
  return [
    {
      id: 'abide',
      name: 'Abide',
      prayerPoints: abidePoints
    },
    ...getYourPrayers(availableUserTopics, userPrayerCount).map(topicName => ({
      id: topicName.toLowerCase().replace(/\s+/g, '-'),
      name: topicName,
      prayerPoints: grouped[topicName] || []
    }))
  ];
}
