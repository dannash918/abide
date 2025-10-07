import { supabase } from './supabase'
import type { PrayerData, Topic, PrayerPoint } from './types'

// Database types (matching the Supabase schema)
export interface DatabaseTopic {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface DatabasePrayerPoint {
  id: string
  text: string
  topic_id: string
  user_id: string
  created_at: string
  updated_at: string
}

// Convert database types to app types
export function convertDatabaseToApp(
  topics: DatabaseTopic[],
  prayerPoints: DatabasePrayerPoint[]
): PrayerData {
  const topicsMap = new Map<string, Topic>()
  
  // Create topics
  topics.forEach(topic => {
    topicsMap.set(topic.id, {
      id: topic.id,
      name: topic.name,
      prayerPoints: []
    })
  })
  
  // Add prayer points to topics
  prayerPoints.forEach(point => {
    const topic = topicsMap.get(point.topic_id)
    if (topic) {
      topic.prayerPoints.push({
        id: point.id,
        text: point.text,
        topicName: topic.name
      })
    }
  })
  
  return {
    topics: Array.from(topicsMap.values())
  }
}

// Convert app types to database types
export function convertAppToDatabase(topic: Topic, userId: string): {
  topic: Omit<DatabaseTopic, 'id' | 'created_at' | 'updated_at'>
  prayerPoints: Omit<DatabasePrayerPoint, 'id' | 'created_at' | 'updated_at'>[]
} {
  return {
    topic: {
      name: topic.name,
      user_id: userId
    },
    prayerPoints: topic.prayerPoints.map(point => ({
      text: point.text,
      topic_id: topic.id,
      user_id: userId
    }))
  }
}

// Database service functions
export class DatabaseService {
  // Get all prayer data for a user
  static async getPrayerData(userId: string): Promise<PrayerData> {
    try {
      // Fetch topics
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (topicsError) throw topicsError

      // Fetch prayer points
      const { data: prayerPoints, error: pointsError } = await supabase
        .from('prayer_points')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (pointsError) throw pointsError

      return convertDatabaseToApp(topics || [], prayerPoints || [])
    } catch (error) {
      console.error('Error fetching prayer data:', error)
      return { topics: [] }
    }
  }

  // Create a new topic
  static async createTopic(name: string, userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({ name, user_id: userId })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Error creating topic:', error)
      return null
    }
  }

  // Update a topic
  static async updateTopic(topicId: string, name: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('topics')
        .update({ name })
        .eq('id', topicId)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating topic:', error)
      return false
    }
  }

  // Delete a topic
  static async deleteTopic(topicId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting topic:', error)
      return false
    }
  }

  // Create a prayer point
  static async createPrayerPoint(
    text: string,
    topicId: string,
    userId: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('prayer_points')
        .insert({ text, topic_id: topicId, user_id: userId })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch (error) {
      console.error('Error creating prayer point:', error)
      return null
    }
  }

  // Update a prayer point
  static async updatePrayerPoint(
    pointId: string,
    text: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('prayer_points')
        .update({ text })
        .eq('id', pointId)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating prayer point:', error)
      return false
    }
  }

  // Delete a prayer point
  static async deletePrayerPoint(pointId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('prayer_points')
        .delete()
        .eq('id', pointId)
        .eq('user_id', userId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting prayer point:', error)
      return false
    }
  }

  // Create a topic with prayer points (for the new combined form)
  static async createTopicWithPrayerPoint(
    topicName: string,
    prayerPointText: string,
    userId: string
  ): Promise<{ topicId: string | null; pointId: string | null }> {
    try {
      // Create topic first
      const topicId = await this.createTopic(topicName, userId)
      if (!topicId) return { topicId: null, pointId: null }

      // Create prayer point
      const pointId = await this.createPrayerPoint(prayerPointText, topicId, userId)
      if (!pointId) {
        // If prayer point creation fails, clean up the topic
        await this.deleteTopic(topicId, userId)
        return { topicId: null, pointId: null }
      }

      return { topicId, pointId }
    } catch (error) {
      console.error('Error creating topic with prayer point:', error)
      return { topicId: null, pointId: null }
    }
  }
}

