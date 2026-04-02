import type { PrayerPoint, PrayerTopic } from '../types'

export const silenceTopic: PrayerTopic = {
  id: 'silence',
  name: 'Silence',
  prayerPoints: [
    {
      id: 'silence-1',
      text: "Take a moment to be still and listen for God's voice.",
      topicName: 'Silence',
    },
    {
      id: 'silence-2',
      text: 'Be still, and know that I am God.',
      topicName: 'Silence',
      verseReference: 'Psalm 46:10'
    }
  ]
};

export function getSilenceTopic(): PrayerTopic {
  return silenceTopic;
}
