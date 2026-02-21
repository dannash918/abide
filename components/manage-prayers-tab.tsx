"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, Loader2, Edit, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import EditTopicModal from "@/components/edit-topic-modal"
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
    updatePrayerPoint,
    updateTopic,
    refreshData
  } = usePrayerData()

  const [editingPoint, setEditingPoint] = useState<{ topicId: string; pointId: string } | null>(null)
  const [editingText, setEditingText] = useState("")

  const [newPrayerPoint, setNewPrayerPoint] = useState("")
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [newTopicName, setNewTopicName] = useState("")
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [modalTopicName, setModalTopicName] = useState("")
  const [modalPrayerPoint, setModalPrayerPoint] = useState("")
  const [modalPrayerThemes, setModalPrayerThemes] = useState("")
  const [modalTopicRecurrence, setModalTopicRecurrence] = useState<string | null>(null)
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false)
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null)
  const [editingTopicName, setEditingTopicName] = useState("")
  const [editingPoints, setEditingPoints] = useState<Array<{ id?: string; text: string }>>([])
  const [editingTopicThemes, setEditingTopicThemes] = useState<string[]>([])
  const [editingTopicRecurrence, setEditingTopicRecurrence] = useState<string | null>(null)
  const [removedPointIds, setRemovedPointIds] = useState<string[]>([])
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    }

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      setDeferredPrompt(null)
      setIsInstallable(false)
    }
  }

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
    // No themes provided in this inline flow
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

  const handleModalSubmit = async () => {
    const topicName = modalTopicName.trim()
    const pointText = modalPrayerPoint.trim()
    const themes = modalPrayerThemes.split(',').map(t => t.trim()).filter(Boolean)
    if (!topicName || !pointText) return

    setIsSubmitting(true)
    try {
      const existing = prayerData.topics.find(t => t.name.toLowerCase() === topicName.toLowerCase())
      let success = false
      if (existing) {
        // update themes and recurrence when provided
        await updateTopic(existing.id, existing.name, themes, modalTopicRecurrence)
        success = await createPrayerPoint(pointText, existing.id)
      } else {
        success = await createTopicWithPrayerPoint(topicName, pointText, themes, modalTopicRecurrence)
      }

      if (success) {
        setModalTopicName("")
        setModalPrayerPoint("")
        setModalTopicRecurrence(null)
        setIsAddModalOpen(false)
        try { await refreshData() } catch (e) { /* ignore */ }
      } else {
        console.error('Failed to add from modal')
      }
    } finally {
      setIsSubmitting(false)
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

      {/* Download as App Button */}
      {isInstallable && (
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Install Abide</h3>
                <p className="text-sm text-muted-foreground">Add to your home screen for a better experience</p>
              </div>
              <Button onClick={handleInstallApp} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download as App
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search bar */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardContent className="flex items-center gap-3">
          <Input
            placeholder="Search topics or prayer points..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
          {(() => {
            const q = searchTerm.trim().toLowerCase()
            let filteredTopics = prayerData.topics
            if (q) {
              const topicMatches = prayerData.topics.filter(t => t.name.toLowerCase().includes(q))
              const pointMatches = prayerData.topics.filter(t => !t.name.toLowerCase().includes(q) && t.prayerPoints.some(p => p.text.toLowerCase().includes(q)))

              // Prefer topics whose name starts with the query (e.g. "Me" before "James")
              topicMatches.sort((a, b) => {
                const aName = a.name.toLowerCase()
                const bName = b.name.toLowerCase()
                const aStarts = aName.startsWith(q)
                const bStarts = bName.startsWith(q)
                if (aStarts && !bStarts) return -1
                if (!aStarts && bStarts) return 1
                return aName.localeCompare(bName)
              })

              filteredTopics = [...topicMatches, ...pointMatches]
            }

            return filteredTopics.map((topic) => (
            <Card key={topic.id} className="border-primary/10 bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{topic.name}</CardTitle>
                    {topic.themes && topic.themes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {topic.themes.map((th) => (
                          <span key={th} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted/20 text-muted-foreground">{th}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingTopicId(topic.id)
                        setEditingTopicName(topic.name)
                        setEditingPoints(topic.prayerPoints.map(p => ({ id: p.id, text: p.text })))
                        setEditingTopicThemes(topic.themes || [])
                        setEditingTopicRecurrence(topic.recurrence || null)
                        setRemovedPointIds([])
                        setIsTopicModalOpen(true)
                      }}
                      aria-label={`Edit topic ${topic.name}`}
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
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
                                  const success = await updatePrayerPoint(point.id, editingText.trim(), [])
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
                              {/* deletion moved into topic edit modal */}
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="flex-1 text-sm leading-relaxed">{point.text}</p>
                            <div className="flex gap-2 ml-2">
                              {/* deletion moved into topic edit modal */}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))})()}
        </div>
      )}
      {/* Add Topic+Point Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Topic and Prayer Point</DialogTitle>
            <DialogDescription>Enter a topic name (existing or new) and a prayer point.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Topic Name</Label>
              <Input value={modalTopicName} onChange={(e) => setModalTopicName(e.target.value)} placeholder="Topic name" />
            </div>
            <div className="space-y-2">
              <Label>Prayer Point</Label>
              <Textarea value={modalPrayerPoint} onChange={(e) => setModalPrayerPoint(e.target.value)} className="min-h-[120px]" />
            </div>
            <div className="space-y-2">
              <Label>Themes (comma-separated)</Label>
              <Input value={modalPrayerThemes} onChange={(e) => setModalPrayerThemes(e.target.value)} placeholder="e.g. family, work, health" />
            </div>
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select value={modalTopicRecurrence || undefined} onValueChange={(v) => setModalTopicRecurrence(v || null)}>
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
          </div>

          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button onClick={handleModalSubmit} disabled={isSubmitting || !modalTopicName.trim() || !modalPrayerPoint.trim()}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditTopicModal
        open={isTopicModalOpen}
        onOpenChange={(open) => {
          setIsTopicModalOpen(open)
          if (!open) {
            setEditingTopicId(null)
            setEditingTopicName("")
            setEditingPoints([])
            setRemovedPointIds([])
            setEditingTopicThemes([])
          }
        }}
        topicId={editingTopicId}
        initialTopicName={editingTopicName}
        initialPoints={editingPoints}
        initialTopicThemes={editingTopicThemes}
        initialTopicRecurrence={editingTopicRecurrence}
        updateTopic={async (id, name, themes, recurrence) => { const res = await updateTopic(id, name, themes, recurrence); return res }}
        deletePrayerPoint={async (tId, pId) => { const res = await deletePrayerPoint(tId, pId); return res }}
        updatePrayerPoint={async (pId, text) => { const res = await updatePrayerPoint(pId, text); return res }}
        createPrayerPoint={async (text, tId) => { const res = await createPrayerPoint(text, tId); return res }}
        deleteTopic={async (tId) => { const res = await deleteTopic(tId); return res }}
        refreshData={async () => { await refreshData() }}
      />

      {/* Floating add button */}
      <Button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  )
}
