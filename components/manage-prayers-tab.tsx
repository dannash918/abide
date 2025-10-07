"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react"
import type { PrayerData, Category, Topic, PrayerPoint } from "@/lib/types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface ManagePrayersTabProps {
  prayerData: PrayerData
  setPrayerData: (data: PrayerData) => void
}

export function ManagePrayersTab({ prayerData, setPrayerData }: ManagePrayersTabProps) {
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newTopicName, setNewTopicName] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [newPrayerPoint, setNewPrayerPoint] = useState("")
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState("")

  const addCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newCategoryName,
        topics: [],
      }
      setPrayerData({
        categories: [...prayerData.categories, newCategory],
      })
      setNewCategoryName("")
    }
  }

  const startEditCategory = (category: Category) => {
    setEditingCategoryId(category.id)
    setEditCategoryName(category.name)
  }

  const saveEditCategory = (categoryId: string) => {
    if (editCategoryName.trim()) {
      setPrayerData({
        categories: prayerData.categories.map((category) =>
          category.id === categoryId ? { ...category, name: editCategoryName } : category,
        ),
      })
      setEditingCategoryId(null)
      setEditCategoryName("")
    }
  }

  const cancelEditCategory = () => {
    setEditingCategoryId(null)
    setEditCategoryName("")
  }

  const deleteCategory = (categoryId: string) => {
    setPrayerData({
      categories: prayerData.categories.filter((c) => c.id !== categoryId),
    })
  }

  const addTopic = (categoryId: string) => {
    if (newTopicName.trim()) {
      const newTopic: Topic = {
        id: Date.now().toString(),
        name: newTopicName,
        prayerPoints: [],
      }
      setPrayerData({
        categories: prayerData.categories.map((category) =>
          category.id === categoryId ? { ...category, topics: [...category.topics, newTopic] } : category,
        ),
      })
      setNewTopicName("")
      setSelectedCategoryId(null)
    }
  }

  const deleteTopic = (categoryId: string, topicId: string) => {
    setPrayerData({
      categories: prayerData.categories.map((category) =>
        category.id === categoryId
          ? { ...category, topics: category.topics.filter((t) => t.id !== topicId) }
          : category,
      ),
    })
  }

  const addPrayerPoint = (categoryId: string, topicId: string) => {
    if (newPrayerPoint.trim()) {
      const newPoint: PrayerPoint = {
        id: Date.now().toString(),
        text: newPrayerPoint,
      }
      setPrayerData({
        categories: prayerData.categories.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                topics: category.topics.map((topic) =>
                  topic.id === topicId ? { ...topic, prayerPoints: [...topic.prayerPoints, newPoint] } : topic,
                ),
              }
            : category,
        ),
      })
      setNewPrayerPoint("")
      setSelectedTopicId(null)
    }
  }

  const deletePrayerPoint = (categoryId: string, topicId: string, pointId: string) => {
    setPrayerData({
      categories: prayerData.categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              topics: category.topics.map((topic) =>
                topic.id === topicId
                  ? { ...topic, prayerPoints: topic.prayerPoints.filter((p) => p.id !== pointId) }
                  : topic,
              ),
            }
          : category,
      ),
    })
  }

  const toggleCategory = (categoryId: string) => {
    const newOpen = new Set(openCategories)
    if (newOpen.has(categoryId)) {
      newOpen.delete(categoryId)
    } else {
      newOpen.add(categoryId)
    }
    setOpenCategories(newOpen)
  }

  return (
    <div className="space-y-6">
      {/* Add Category Section */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Category</CardTitle>
          <CardDescription>Create categories to organize your prayer topics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Family, Health, Work"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <Button onClick={addCategory} disabled={!newCategoryName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      {prayerData.categories.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground text-balance">No categories yet. Start by adding a category above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prayerData.categories.map((category) => (
            <Card key={category.id} className="border-primary/10 bg-card/50 backdrop-blur">
              <Collapsible open={openCategories.has(category.id)} onOpenChange={() => toggleCategory(category.id)}>
                <CardHeader>
                  {editingCategoryId === category.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditCategory(category.id)
                          if (e.key === "Escape") cancelEditCategory()
                        }}
                        autoFocus
                        className="flex-1"
                      />
                      <Button
                        onClick={() => saveEditCategory(category.id)}
                        disabled={!editCategoryName.trim()}
                        size="sm"
                      >
                        Save
                      </Button>
                      <Button variant="outline" onClick={cancelEditCategory} size="sm">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left hover:text-primary transition-colors">
                        {openCategories.has(category.id) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                        <CardTitle className="text-xl">{category.name}</CardTitle>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({category.topics.length} {category.topics.length === 1 ? "topic" : "topics"})
                        </span>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditCategory(category)}
                          className="hover:text-primary hover:bg-primary/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCategory(category.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {selectedCategoryId === category.id ? (
                      <div className="space-y-2 p-4 bg-secondary/50 rounded-lg">
                        <Label>New Topic</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="e.g., Mom's health, Job interview"
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addTopic(category.id)}
                            autoFocus
                          />
                          <Button onClick={() => addTopic(category.id)} disabled={!newTopicName.trim()}>
                            Add
                          </Button>
                          <Button variant="outline" onClick={() => setSelectedCategoryId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => setSelectedCategoryId(category.id)} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Topic
                      </Button>
                    )}

                    {category.topics.length > 0 && (
                      <div className="space-y-3">
                        {category.topics.map((topic) => (
                          <Card key={topic.id} className="bg-background/50">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{topic.name}</CardTitle>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteTopic(category.id, topic.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {selectedTopicId === topic.id ? (
                                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
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
                                      onClick={() => addPrayerPoint(category.id, topic.id)}
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedTopicId(topic.id)}
                                  className="w-full"
                                >
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
                                        onClick={() => deletePrayerPoint(category.id, topic.id, point.id)}
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
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
