"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Trash2, Loader2, Edit } from "lucide-react"

type Point = { id?: string; text: string; timePercentage?: number | null }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  // if topicId is null or undefined we treat the modal as "add" mode
  topicId?: string | null
  initialTopicName?: string
  initialPoints?: Point[]
  initialTopicThemes?: string[]
  initialTopicRecurrence?: string | null

  // callbacks for data operations; not all are required in both modes
  createTopic?: (name: string, themes?: string[], recurrence?: string | null, options?: { reload?: boolean }) => Promise<string | null>
  updateTopic?: (topicId: string, name: string, themes?: string[], recurrence?: string | null, options?: { reload?: boolean }) => Promise<boolean>
  deletePrayerPoint?: (topicId: string, pointId: string, options?: { reload?: boolean }) => Promise<boolean>
  updatePrayerPoint?: (pointId: string, text: string, options?: { reload?: boolean; timePercentage?: number | null }) => Promise<boolean>
  createPrayerPoint: (text: string, tId: string, options?: { reload?: boolean; timePercentage?: number | null }) => Promise<boolean>
  deleteTopic?: (topicId: string) => Promise<boolean>
  refreshData: () => Promise<void>
}

export function TopicModal({
  open,
  onOpenChange,
  topicId,
  initialTopicName = "",
  initialPoints,
  initialTopicThemes,
  initialTopicRecurrence = null,
  createTopic,
  updateTopic,
  deletePrayerPoint,
  updatePrayerPoint,
  createPrayerPoint,
  deleteTopic,
  refreshData
}: Props) {  const [topicName, setTopicName] = useState(initialTopicName)
  const [points, setPoints] = useState<Point[]>(initialPoints || [])
  const [topicThemes, setTopicThemes] = useState<string[]>(initialTopicThemes || [])
  const [topicRecurrence, setTopicRecurrence] = useState<string | null>(initialTopicRecurrence || null)
  const [removedPointIds, setRemovedPointIds] = useState<string[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync to incoming props when modal is opened or topicId changes
  useEffect(() => {
    if (open) {
      setTopicName(initialTopicName)
      setPoints(initialPoints || [])
      setRemovedPointIds([])
      setEditingIndex(null)
      setTopicThemes(initialTopicThemes || [])
      setTopicRecurrence(initialTopicRecurrence || null)
    }
  }, [open, topicId, initialTopicName, initialPoints, initialTopicThemes, initialTopicRecurrence])


  const handleAddPoint = () => {
    setPoints(prev => {
      const next = [...prev, { text: "", timePercentage: null }]
      setEditingIndex(next.length - 1)
      return next
    })
  }

  const handleRemovePoint = (idx: number) => {
    const copy = [...points]
    const removed = copy.splice(idx, 1)[0]
    setPoints(copy)
    if (removed?.id) setRemovedPointIds(prev => [...prev, removed.id as string])
    // adjust editingIndex
    if (editingIndex !== null) {
      if (idx < editingIndex) setEditingIndex(editingIndex - 1)
      else if (idx === editingIndex) setEditingIndex(null)
    }
  }

  const isAddMode = !topicId

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      if (!topicName.trim()) return

      if (isAddMode) {
        if (!createTopic) return
        // create the topic and then any points; suppress intermediate reloads
        const newId = await createTopic(topicName.trim(), topicThemes, topicRecurrence, { reload: false })
        if (!newId) {
          // creation failed, don't close the modal
          return
        }
        for (const pt of points) {
          if (pt.text.trim()) {
            await createPrayerPoint(pt.text, newId, { reload: false, timePercentage: pt.timePercentage })
          }
        }
      } else {
        // editing an existing topic
        if (topicId && updateTopic) {
          await updateTopic(topicId, topicName.trim(), topicThemes, topicRecurrence, { reload: false })
        }

        // delete removed points
        if (topicId && deletePrayerPoint) {
          for (const rid of removedPointIds) {
            try { await deletePrayerPoint(topicId, rid, { reload: false }) } catch (e) { /* ignore */ }
          }
        }

        // upsert points
        for (const pt of points) {
          if (pt.id) {
            if (updatePrayerPoint) await updatePrayerPoint(pt.id, pt.text, { reload: false, timePercentage: pt.timePercentage })
          } else if (topicId) {
            await createPrayerPoint(pt.text, topicId, { reload: false, timePercentage: pt.timePercentage })
          }
        }
      }

      await refreshData()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTopic = async () => {
    if (!topicId || !deleteTopic) return
    if (!confirm('Delete this topic and all its prayer points? This cannot be undone.')) return
    setIsSubmitting(true)
    try {
      await deleteTopic(topicId)
      onOpenChange(false)
      await refreshData()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onOpenChange(false) } else onOpenChange(true) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isAddMode ? 'Add Topic' : 'Edit Topic'}</DialogTitle>
          <DialogDescription>{isAddMode ? 'Enter a new topic and its prayer points.' : 'Edit the topic name and its prayer points.'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Topic Name</Label>
            <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Topic name" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Themes</Label>
              <div className="text-sm text-muted-foreground">Topic-level themes (comma-separated). Used for grouping and filters.</div>
              <Input
                value={topicThemes.join(', ')}
                onChange={(e) => setTopicThemes(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                placeholder="e.g. family, work, health"
              />
            </div>

            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select value={topicRecurrence || undefined} onValueChange={(v) => setTopicRecurrence(v || null)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  {/* <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem> */}
                </SelectContent>
              </Select>
            </div>

            <Label>Prayer Points</Label>
            <div className="space-y-2">
              {points.map((pt, idx) => (
                <div key={pt.id || `new-${idx}`} className="flex items-start gap-2">
                  {editingIndex === idx ? (
                    <div className="flex-1 space-y-3">
                      <Textarea
                        value={pt.text}
                        onChange={(e) => {
                          const copy = [...points]
                          copy[idx] = { ...copy[idx], text: e.target.value }
                          setPoints(copy)
                        }}
                        className="min-h-[64px] w-full"
                      />
                      <div className="space-y-2">
                        <Label>Time multiplier (%)</Label>
                        <Input
                          type="number"
                          value={pt.timePercentage !== undefined && pt.timePercentage !== null ? String(pt.timePercentage) : ''}
                          placeholder="Default"
                          onChange={(e) => {
                            const value = e.target.value.trim()
                            const parsed = value === '' ? null : Number(value)
                            const copy = [...points]
                            copy[idx] = {
                              ...copy[idx],
                              timePercentage: parsed === null || Number.isFinite(parsed) ? parsed : null
                            }
                            setPoints(copy)
                          }}
                        />
                        <p className="text-xs text-muted-foreground">Leave blank to use the session default pause time.</p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={() => setEditingIndex(null)}>Cancel</Button>
                        <Button onClick={() => setEditingIndex(null)}>Done</Button>
                        <Button variant="ghost" className="text-destructive" onClick={() => { if (confirm('Delete this prayer point?')) handleRemovePoint(idx) }} disabled={isSubmitting}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm leading-relaxed">{pt.text}</p>
                        <p className="text-xs text-muted-foreground">{typeof pt.timePercentage === 'number' ? `Time multiplier: ${pt.timePercentage}%` : 'Time multiplier: default'}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingIndex(idx)} className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              <Button onClick={handleAddPoint} className="mt-2">+ Add Point</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              <Button variant="ghost" className="text-destructive" onClick={handleDeleteTopic} disabled={isSubmitting || isAddMode}>
                Delete Topic
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSubmitting || !topicName.trim()}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TopicModal
