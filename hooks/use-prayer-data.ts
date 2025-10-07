"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { DatabaseService } from '@/lib/database'
import type { PrayerData, Topic, PrayerPoint } from '@/lib/types'

export function usePrayerData() {
  const { user } = useAuth()
  const [prayerData, setPrayerData] = useState<PrayerData>({ topics: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load prayer data from database
  const loadPrayerData = useCallback(async () => {
    if (!user) {
      setPrayerData({ topics: [] })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await DatabaseService.getPrayerData(user.id)
      setPrayerData(data)
    } catch (err) {
      setError('Failed to load prayer data')
      console.error('Error loading prayer data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Load data when user changes
  useEffect(() => {
    loadPrayerData()
  }, [loadPrayerData])

  // Create a new topic
  const createTopic = useCallback(async (name: string): Promise<boolean> => {
    if (!user) return false

    try {
      const topicId = await DatabaseService.createTopic(name, user.id)
      if (topicId) {
        await loadPrayerData() // Reload data
        return true
      }
      return false
    } catch (err) {
      console.error('Error creating topic:', err)
      return false
    }
  }, [user, loadPrayerData])

  // Delete a topic
  const deleteTopic = useCallback(async (topicId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const success = await DatabaseService.deleteTopic(topicId, user.id)
      if (success) {
        await loadPrayerData() // Reload data
      }
      return success
    } catch (err) {
      console.error('Error deleting topic:', err)
      return false
    }
  }, [user, loadPrayerData])

  // Create a prayer point
  const createPrayerPoint = useCallback(async (
    text: string,
    topicId: string
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const pointId = await DatabaseService.createPrayerPoint(text, topicId, user.id)
      if (pointId) {
        await loadPrayerData() // Reload data
        return true
      }
      return false
    } catch (err) {
      console.error('Error creating prayer point:', err)
      return false
    }
  }, [user, loadPrayerData])

  // Delete a prayer point
  const deletePrayerPoint = useCallback(async (
    topicId: string,
    pointId: string
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const success = await DatabaseService.deletePrayerPoint(pointId, user.id)
      if (success) {
        await loadPrayerData() // Reload data
      }
      return success
    } catch (err) {
      console.error('Error deleting prayer point:', err)
      return false
    }
  }, [user, loadPrayerData])

  // Create a topic with prayer point (for the combined form)
  const createTopicWithPrayerPoint = useCallback(async (
    topicName: string,
    prayerPointText: string
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const { topicId, pointId } = await DatabaseService.createTopicWithPrayerPoint(
        topicName,
        prayerPointText,
        user.id
      )
      if (topicId && pointId) {
        await loadPrayerData() // Reload data
        return true
      }
      return false
    } catch (err) {
      console.error('Error creating topic with prayer point:', err)
      return false
    }
  }, [user, loadPrayerData])

  return {
    prayerData,
    loading,
    error,
    createTopic,
    deleteTopic,
    createPrayerPoint,
    deletePrayerPoint,
    createTopicWithPrayerPoint,
    refreshData: loadPrayerData
  }
}

