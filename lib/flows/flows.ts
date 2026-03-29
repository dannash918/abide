import type { PrayerFlowDefinition } from "../types";

export const confessionFlow: PrayerFlowDefinition = {
  id: 'confession',
  name: 'Confession',
  topicIds: [
    'adoration-of-god',
    'self-examination',
    'confession',
    'repentance',
    'forgiveness',
    'renewal',
  ]
};

export const lordsPrayerFlow: PrayerFlowDefinition = {
  id: 'lords-prayer',
  name: 'Lord\'s Prayer',
  topicIds: [
    'lords-prayer-1',
    'lords-prayer-2',
    'lords-prayer-3',
    'lords-prayer-4',
    'lords-prayer-5',
    'lords-prayer-6',
  ]
};

export const psalm13Flow: PrayerFlowDefinition = {
  id: 'psalm-13',
  name: 'Psalm 13',
  topicIds: [
    'psalm-13-2',
    'psalm-13-3',
    'psalm-13-4',
  ]
};

export const psalm103Flow: PrayerFlowDefinition = {
  id: 'psalm-103',
  name: 'Psalm 103',
  topicIds: [
    'psalm-103-1-2',
    'psalm-103-3-5',
    'psalm-103-6-7',
    'psalm-103-8-10',
    'psalm-103-11-12',
    'psalm-103-13-14',
    'psalm-103-15-18',
    'psalm-103-19-22',
  ]
};
