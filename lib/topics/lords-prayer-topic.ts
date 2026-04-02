import type { PrayerPoint, PrayerTopic } from '../types'

export const lordsPrayerTopic: PrayerTopic = {
  id: 'lords-prayer',
  name: "Lord's Prayer",
  prayerPoints: [
    {
      id: 'lords-prayer-1',
      text: `Our Father in heaven,
hallowed be your name.
Your kingdom come,
your will be done,
on earth as in heaven.
Give us today our daily bread.
Forgive us our sins
as we forgive those who sin against us.
Lead us not into temptation
but deliver us from evil.
For the kingdom, the power,
and the glory are yours
now and for ever.
Amen.`,
      topicName: "Lord's Prayer",
      verseReference: `The Lord's Prayer`
    }
  ]
};

export function getLordsPrayerTopic(): PrayerTopic {
  return lordsPrayerTopic;
}
