import type { PrayerTopic } from "../types";
import { confessionTopics } from "./confession";
import { lordsPrayerTopics } from "./lords-prayer";
import { psalm13Topics } from "./psalm-13";
import { psalm103Topics } from "./psalm-103";

export const localPrayerTopics: PrayerTopic[] = [
  ...confessionTopics,
  ...lordsPrayerTopics,
  ...psalm13Topics,
  ...psalm103Topics,
];

export const localPrayerTopicById: Record<string, PrayerTopic> = Object.fromEntries(
  localPrayerTopics.map(topic => [topic.id, topic] as const)
);

export function getLocalPrayerTopicById(id: string): PrayerTopic | undefined {
  return localPrayerTopicById[id];
}

export function getLocalPrayerTopicsByIds(ids: string[]): PrayerTopic[] {
  return ids
    .map(id => localPrayerTopicById[id])
    .filter((topic): topic is PrayerTopic => Boolean(topic));
}
