"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Trash2, Loader2, Edit } from "lucide-react"

type Point = { id?: string; text: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  topicId: string | null
  initialTopicName: string
  initialPoints: Point[]
  initialTopicThemes?: string[]
  initialTopicRecurrence?: string | null
  updateTopic: (topicId: string, name: string, themes?: string[], recurrence?: string | null) => Promise<boolean>
  deletePrayerPoint: (topicId: string, pointId: string) => Promise<boolean>
  updatePrayerPoint: (pointId: string, text: string) => Promise<boolean>
  createPrayerPoint: (text: string, tId: string) => Promise<boolean>
  deleteTopic: (topicId: string) => Promise<boolean>
  refreshData: () => Promise<void>
}

export function EditTopicModal({ open, onOpenChange, topicId, initialTopicName, initialPoints, initialTopicThemes, initialTopicRecurrence, updateTopic, deletePrayerPoint, updatePrayerPoint, createPrayerPoint, deleteTopic, refreshData }: Props) {
  const [topicName, setTopicName] = useState(initialTopicName)
  const [points, setPoints] = useState<Point[]>(initialPoints)
  const [topicThemes, setTopicThemes] = useState<string[]>([])
  const [topicRecurrence, setTopicRecurrence] = useState<string | null>(null)
  const [removedPointIds, setRemovedPointIds] = useState<string[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync to incoming props when modal is opened or topicId changes
  useEffect(() => {
    if (open) {
      setTopicName(initialTopicName)
      setPoints(initialPoints)
      setRemovedPointIds([])
      setEditingIndex(null)
      setTopicThemes(initialTopicThemes || [])
      setTopicRecurrence(initialTopicRecurrence || null)
    }
  }, [open, topicId, initialTopicName, initialPoints])


  const handleAddPoint = () => {
    setPoints(prev => [...prev, { text: "" }])
    setEditingIndex(points.length)
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

  const handleSave = async () => {
    if (!topicId) return
    setIsSubmitting(true)
    try {
      if (topicName.trim()) {
        await updateTopic(topicId, topicName.trim(), topicThemes, topicRecurrence)
      }

      // delete removed points
      for (const rid of removedPointIds) {
        try { await deletePrayerPoint(topicId, rid) } catch (e) { /* ignore */ }
      }

      // upsert points
      for (const pt of points) {
        if (pt.id) {
          await updatePrayerPoint(pt.id, pt.text)
        } else {
          await createPrayerPoint(pt.text, topicId)
        }
      }

      await refreshData()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTopic = async () => {
    if (!topicId) return
    if (!confirm('Delete this topic and all its prayer points? This cannot be undone.')) return
    setIsSubmitting(true)
    try {
      await deleteTopic(topicId)
      await refreshData()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onOpenChange(false) } else onOpenChange(true) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Topic</DialogTitle>
          <DialogDescription>Edit the topic name and its prayer points.</DialogDescription>
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
                    <div className="flex-1">
                      <Textarea
                        value={pt.text}
                        onChange={(e) => {
                          const copy = [...points]
                          copy[idx] = { ...copy[idx], text: e.target.value }
                          setPoints(copy)
                        }}
                        className="min-h-[64px] w-full"
                      />
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
                      <p className="flex-1 text-sm leading-relaxed">{pt.text}</p>
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
              <Button variant="ghost" className="text-destructive" onClick={handleDeleteTopic} disabled={isSubmitting}>
                Delete Topic
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditTopicModal
