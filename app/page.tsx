"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManagePrayersTab } from "@/components/manage-prayers-tab"
import { PrayerSessionTab } from "@/components/prayer-session-tab"
import { SwipeMenu } from "@/components/swipe-menu"
import { MobileHeader } from "@/components/mobile-header"
import { useAuth } from "@/lib/auth-context"
import { BookOpen, Play } from "lucide-react"
import type { PrayerData } from "@/lib/types"

export default function PrayerApp() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState("manage")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10 flex flex-col">
      <MobileHeader
        title="Abide"
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
      />
      <SwipeMenu
        isAuthenticated={!!user}
        userEmail={user?.email}
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
      />
      <div className="flex-1 container mx-auto px-4 py-8 pt-20 pb-24 max-w-4xl">
        <header className="hidden md:block text-center mb-8">
          <h1 className="text-5xl font-serif font-bold text-primary mb-3 text-balance">Abide</h1>
          <p className="text-muted-foreground text-lg text-balance">
             Abide in Me, and I will abide in you.
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="manage" className="mt-0">
            <ManagePrayersTab />
          </TabsContent>

          <TabsContent value="pray" className="mt-0">
            <PrayerSessionTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-16 rounded-none bg-transparent">
            <TabsTrigger value="manage" className="gap-2 text-base data-[state=active]:bg-muted/50">
              <BookOpen className="w-5 h-5" />
              Manage Prayers
            </TabsTrigger>
            <TabsTrigger value="pray" className="gap-2 text-base data-[state=active]:bg-muted/50">
              <Play className="w-5 h-5" />
              Start Praying
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </nav>
    </div>
  )
}
