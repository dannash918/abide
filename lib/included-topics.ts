import { PrayerPoint } from "./types";
import { praiseOptions } from "./praise-verses";
import { confessOptions } from "./confess-options";

// List of included topics
export const includedTopics = ['Abide', 'Praise', 'Confession', 'Silence', 'Lord\'s Prayer'];

// Abide topic points
export const abidePoints: PrayerPoint[] = [
  {
    id: 'begin-prayer-1',
    text: 'Take a few deep breaths, and get ready to pray.',
    topicName: 'Abide',
  },
  {
    id: 'begin-prayer-2',
    text: 'Abide in me, and I will abide in you.',
    topicName: 'Abide',
    verseReference: 'John 15:4'
  }
];

// Function to get Praise points (random selection)
export function getPraisePoints(): PrayerPoint[] {
  const randomPraise = praiseOptions[Math.floor(Math.random() * praiseOptions.length)];
  return [
    {
      id: 'praise-intro',
      text: 'Spend some time praising our great God and reflecting on His majesty.',
      topicName: 'Praise',
    },
    {
      id: 'praise-verse',
      text: randomPraise.text,
      topicName: 'Praise',
      verseReference: randomPraise.verse
    }
  ];
}

// Function to get Confession points (random selection)
export function getConfessionPoints(): PrayerPoint[] {
  const randomConfess = confessOptions[Math.floor(Math.random() * confessOptions.length)];
  return [
    {
      id: 'confession-intro',
      text: 'Take some time to reflect and confess your sins to God',
      topicName: 'Confession',
    },
    {
      id: 'confession-verse',
      text: randomConfess.text,
      topicName: 'Confession',
      verseReference: randomConfess.verse
    }
  ];
}

// Silence topic points
export const silencePoints: PrayerPoint[] = [
  {
    id: 'silence-1',
    text: 'Take a moment to be still and listen for God\'s voice.',
    topicName: 'Silence',
  },
  {
    id: 'silence-2',
    text: 'Be still, and know that I am God.',
    topicName: 'Silence',
    verseReference: 'Psalm 46:10'
  }
];

// Lord's Prayer points for everyday flow
export const lordsPrayerPoints: PrayerPoint[] = [
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
    topicName: 'Lord\'s Prayer',
    verseReference: `The Lord's Prayer`
  }
];

// Function to get a random selection of user's prayer topics
export function getYourPrayers(availableTopics: string[], numPrayers: number): string[] {
  // Shuffle the available topics
  const shuffled = [...availableTopics].sort(() => Math.random() - 0.5);
  // Return the first numPrayers topics (or all if fewer available)
  return shuffled.slice(0, Math.min(numPrayers, shuffled.length));
}
