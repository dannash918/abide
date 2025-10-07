"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import type { PrayerData, Topic, PrayerPoint } from "@/lib/types"

interface ManagePrayersTabProps {
  prayerData: PrayerData
  setPrayerData: (data: PrayerData) => void
}

export function ManagePrayersTab({ prayerData, setPrayerData }: ManagePrayersTabProps) {
  const [newTopicName, setNewTopicName] = useState("")
  const [newPrayerPoint, setNewPrayerPoint] = useState("")
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  const addTopic = () => {
    if (newTopicName.trim()) {
      const newTopic: Topic = {
        id: Date.now().toString(),
        name: newTopicName,
        prayerPoints: [],
      }
      setPrayerData({
        topics: [...prayerData.topics, newTopic],
      })
      setNewTopicName("")
    }
  }

  const deleteTopic = (topicId: string) => {
    setPrayerData({
      topics: prayerData.topics.filter((t) => t.id !== topicId),
    })
  }

  const addPrayerPoint = (topicId: string) => {
    if (newPrayerPoint.trim()) {
      const newPoint: PrayerPoint = {
        id: Date.now().toString(),
        text: newPrayerPoint,
      }
      setPrayerData({
        topics: prayerData.topics.map((topic) =>
          topic.id === topicId ? { ...topic, prayerPoints: [...topic.prayerPoints, newPoint] } : topic,
        ),
      })
      setNewPrayerPoint("")
      setSelectedTopicId(null)
    }
  }

  const deletePrayerPoint = (topicId: string, pointId: string) => {
    setPrayerData({
      topics: prayerData.topics.map((topic) =>
        topic.id === topicId
          ? { ...topic, prayerPoints: topic.prayerPoints.filter((p) => p.id !== pointId) }
          : topic,
      ),
    })
  }

  return (
    <div className="space-y-6">
      {/* Add Topic Section */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Topic</CardTitle>
          <CardDescription>Create topics for your prayer items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Family, Health, Work"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTopic()}
            />
            <Button onClick={addTopic} disabled={!newTopicName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Topics List */}
      {prayerData.topics.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground text-balance">No topics yet. Start by adding a topic above.</p>
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
                    onClick={() => deleteTopic(topic.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTopicId === topic.id ? (
                  <div className="space-y-2 p-4 bg-secondary/50 rounded-lg">
                    <Label>New Prayer Point</Label>
                    <Textarea
                      placeholder="Enter your prayer point..."
                      value={newPrayerPoint}
                      onChange={(e) => setNewPrayerPoint(e.target.value)}
                      className="min-h-[80px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => addPrayerPoint(topic.id)}
                        disabled={!newPrayerPoint.trim()}
                        size="sm"
                      >
                        Add
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedTopicId(null)} size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setSelectedTopicId(topic.id)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Prayer Point
                  </Button>
                )}

                {topic.prayerPoints.length > 0 && (
                  <div className="space-y-2">
                    {topic.prayerPoints.map((point, index) => (
                      <div
                        key={point.id}
                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-md group"
                      >
                        <span className="text-sm font-medium text-primary mt-0.5">{index + 1}.</span>
                        <p className="flex-1 text-sm leading-relaxed">{point.text}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePrayerPoint(topic.id, point.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
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
