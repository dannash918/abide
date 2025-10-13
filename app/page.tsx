"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManagePrayersTab } from "@/components/manage-prayers-tab"
import { PrayerSessionTab } from "@/components/prayer-session-tab"
import { SwipeMenu } from "@/components/swipe-menu"
import { useAuth } from "@/lib/auth-context"
import { BookOpen, Play } from "lucide-react"
import type { PrayerData } from "@/lib/types"

export default function PrayerApp() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState("manage")
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <SwipeMenu 
        isAuthenticated={!!user} 
        userEmail={user?.email} 
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-serif font-bold text-primary mb-3 text-balance">Abide</h1>
          <p className="text-muted-foreground text-lg text-balance">
             Abide in Me, and I will abide in you.
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
            <TabsTrigger value="manage" className="gap-2 text-base">
              <BookOpen className="w-5 h-5" />
              Manage Prayers
            </TabsTrigger>
            <TabsTrigger value="pray" className="gap-2 text-base">
              <Play className="w-5 h-5" />
              Start Praying
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="mt-0">
            <ManagePrayersTab />
          </TabsContent>

          <TabsContent value="pray" className="mt-0">
            <PrayerSessionTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
