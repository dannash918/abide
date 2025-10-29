"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, Loader2, Edit } from "lucide-react"
import { usePrayerData } from "@/hooks/use-prayer-data"

interface ManagePrayersTabProps {
  // Remove these props since we're using the hook now
}

export function ManagePrayersTab({}: ManagePrayersTabProps) {
  const {
    prayerData,
    loading,
    error,
    createTopic,
    deleteTopic,
    createPrayerPoint,
    deletePrayerPoint,
    createTopicWithPrayerPoint,
    updatePrayerPoint
  } = usePrayerData()

  const [editingPoint, setEditingPoint] = useState<{ topicId: string; pointId: string } | null>(null)
  const [editingText, setEditingText] = useState("")

  const [newPrayerPoint, setNewPrayerPoint] = useState("")
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [newTopicName, setNewTopicName] = useState("")
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)


  const handleDeleteTopic = async (topicId: string) => {
    setIsSubmitting(true)
    const success = await deleteTopic(topicId)
    setIsSubmitting(false)
    if (!success) {
      // Handle error - you could show a toast notification here
      console.error('Failed to delete topic')
    }
  }

  const handleAddPrayerPoint = async () => {
    if (!newPrayerPoint.trim() || !selectedTopicId) return

    setIsSubmitting(true)
    const success = await createPrayerPoint(newPrayerPoint, selectedTopicId)
    setIsSubmitting(false)
    
    if (success) {
      setNewPrayerPoint("")
      setSelectedTopicId(null)
      setIsCreatingNewTopic(false)
      setNewTopicName("")
    } else {
      console.error('Failed to create prayer point')
    }
  }

  const handleAddPrayerPointWithNewTopic = async () => {
    if (!newPrayerPoint.trim() || !newTopicName.trim()) return

    setIsSubmitting(true)
    const success = await createTopicWithPrayerPoint(newTopicName, newPrayerPoint)
    setIsSubmitting(false)
    
    if (success) {
      setNewPrayerPoint("")
      setNewTopicName("")
      setIsCreatingNewTopic(false)
      setSelectedTopicId(null)
    } else {
      console.error('Failed to create topic with prayer point')
    }
  }

  const handleDeletePrayerPoint = async (topicId: string, pointId: string) => {
    setIsSubmitting(true)
    const success = await deletePrayerPoint(topicId, pointId)
    setIsSubmitting(false)
    if (!success) {
      console.error('Failed to delete prayer point')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your prayers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Add Prayer Point Section */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Prayer Point</CardTitle>
          <CardDescription>Add a prayer point and assign it to a topic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prayer-point">Prayer Point</Label>
            <Textarea
              id="prayer-point"
              placeholder="Enter your prayer point..."
              value={newPrayerPoint}
              onChange={(e) => setNewPrayerPoint(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="topic-select">Topic</Label>
            <Select
              value={isCreatingNewTopic ? "new" : selectedTopicId || ""}
              onValueChange={(value) => {
                if (value === "new") {
                  setIsCreatingNewTopic(true)
                  setSelectedTopicId(null)
                } else {
                  setIsCreatingNewTopic(false)
                  setSelectedTopicId(value)
                }
              }}
            >
              <SelectTrigger id="topic-select">
                <SelectValue placeholder="Select or create a topic" />
              </SelectTrigger>
              <SelectContent>
                {prayerData.topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Create New Topic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCreatingNewTopic && (
            <div className="space-y-2">
              <Label htmlFor="new-topic">New Topic Name</Label>
              <Input
                id="new-topic"
                placeholder="e.g., Family, Health, Work"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPrayerPointWithNewTopic()}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={isCreatingNewTopic ? handleAddPrayerPointWithNewTopic : handleAddPrayerPoint} 
              disabled={!newPrayerPoint.trim() || (!selectedTopicId && !isCreatingNewTopic) || (isCreatingNewTopic && !newTopicName.trim()) || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? "Adding..." : "Add Prayer Point"}
            </Button>
            {(selectedTopicId || isCreatingNewTopic) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedTopicId(null)
                  setIsCreatingNewTopic(false)
                  setNewTopicName("")
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Topics List */}
      {prayerData.topics.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground text-balance">No prayer points yet. Start by adding a prayer point above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prayerData.topics.map((topic) => (
            <Card key={topic.id} className="border-primary/10 bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{topic.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTopic(topic.id)}
                    disabled={isSubmitting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {topic.prayerPoints.length > 0 && (
                  <div className="space-y-2">
                    {topic.prayerPoints.map((point, index) => (
                      <div
                        key={point.id}
                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-md"
                      >
                        <span className="text-sm font-medium text-primary mt-0.5">{index + 1}.</span>

                        {/* If this point is being edited, show textarea + actions */}
                        {editingPoint && editingPoint.pointId === point.id && editingPoint.topicId === topic.id ? (
                          <div className="flex-1 space-y-2">
                            <Textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="min-h-[72px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={async () => {
                                  if (!editingText.trim()) return
                                  setIsSubmitting(true)
                                  const success = await updatePrayerPoint(point.id, editingText.trim())
                                  setIsSubmitting(false)
                                  if (success) {
                                    setEditingPoint(null)
                                    setEditingText("")
                                  } else {
                                    console.error('Failed to update prayer point')
                                  }
                                }}
                                disabled={isSubmitting}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingPoint(null)
                                  setEditingText("")
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  setIsSubmitting(true)
                                  const success = await deletePrayerPoint(topic.id, point.id)
                                  setIsSubmitting(false)
                                  if (success) {
                                    setEditingPoint(null)
                                    setEditingText("")
                                  } else {
                                    console.error('Failed to delete prayer point')
                                  }
                                }}
                                aria-label={`Delete prayer point ${index + 1}`}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                {isSubmitting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="flex-1 text-sm leading-relaxed">{point.text}</p>
                            <div className="flex gap-2 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingPoint({ topicId: topic.id, pointId: point.id })
                                  setEditingText(point.text)
                                }}
                                aria-label={`Edit prayer point ${index + 1}`}
                                className="h-8 w-8"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
