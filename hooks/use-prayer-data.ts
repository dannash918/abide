"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { DatabaseService } from '@/lib/database'
import type { PrayerData, PrayerPoint } from '@/lib/types'

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
  // returns the new topic id (or null) so callers can create related points
  // create a topic; callers can disable the automatic reload when performing
  // batch updates and handle refreshing themselves.
  const createTopic = useCallback(async (
    name: string,
    themes: string[] = [],
    recurrence: string | null = null,
    options: { reload?: boolean } = {}
  ): Promise<string | null> => {
    if (!user) return null

    const { reload = true } = options
    try {
      const topicId = await DatabaseService.createTopic(name, user.id, themes, recurrence)
      if (topicId) {
        if (reload) await loadPrayerData() // Reload data
        return topicId
      }
      return null
    } catch (err) {
      console.error('Error creating topic:', err)
      return null
    }
  }, [user, loadPrayerData])

  // Delete a topic
  const deleteTopic = useCallback(async (topicId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const success = await DatabaseService.deleteTopic(topicId, user.id)
      if (success) await loadPrayerData()
      return success
    } catch (err) {
      console.error('Error deleting topic:', err)
      return false
    }
  }, [user, loadPrayerData])

  // Create a prayer point
  // create a prayer point; callers can disable the automatic data reload when
  // performing batch operations (e.g. saving a topic with multiple points).
  // default is to reload after creation.
  const createPrayerPoint = useCallback(async (
    text: string,
    topicId: string,
    options: { reload?: boolean; timePercentage?: number | null } = {}
  ): Promise<boolean> => {
    if (!user) return false

    const { reload = true } = options
    try {
      const pointId = await DatabaseService.createPrayerPoint(text, topicId, user.id, options.timePercentage)
      if (pointId) {
        if (reload) await loadPrayerData() // Reload data
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
    pointId: string,
    options: { reload?: boolean } = {}
  ): Promise<boolean> => {
    if (!user) return false

    const { reload = true } = options
    try {
      const success = await DatabaseService.deletePrayerPoint(pointId, user.id)
      if (success && reload) await loadPrayerData()
      return success
    } catch (err) {
      console.error('Error deleting prayer point:', err)
      return false
    }
  }, [user, loadPrayerData])

  // Update a prayer point
  const updatePrayerPoint = useCallback(async (
    pointId: string,
    text: string,
    options: { reload?: boolean; timePercentage?: number | null } = {}
  ): Promise<boolean> => {
    if (!user) return false

    const { reload = true } = options
    try {
      const success = await DatabaseService.updatePrayerPoint(pointId, text, user.id, options.timePercentage)
      if (success && reload) {
        await loadPrayerData()
      }
      return success
    } catch (err) {
      console.error('Error updating prayer point:', err)
      return false
    }
  }, [user, loadPrayerData])

  // Create a topic with prayer point (for the combined form)
  const createTopicWithPrayerPoint = useCallback(async (
    topicName: string,
    prayerPointText: string
    , themes: string[] = [],
    recurrence: string | null = null
  ): Promise<boolean> => {
    if (!user) return false

    try {
      const { topicId, pointId } = await DatabaseService.createTopicWithPrayerPoint(
        topicName,
        prayerPointText,
        user.id,
        themes,
        recurrence
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
    updateTopic: async (
      topicId: string,
      name: string,
      themes: string[] = [],
      recurrence: string | null = null,
      options: { reload?: boolean } = {}
    ) => {
      if (!user) return false
      const { reload = true } = options
      try {
        const success = await DatabaseService.updateTopic(topicId, name, user.id, themes, recurrence)
        if (success && reload) await loadPrayerData()
        return success
      } catch (err) {
        console.error('Error updating topic:', err)
        return false
      }
    },
    updatePrayerPoint,
    refreshData: loadPrayerData
  }
}

