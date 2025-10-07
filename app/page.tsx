"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManagePrayersTab } from "@/components/manage-prayers-tab"
import { PrayerSessionTab } from "@/components/prayer-session-tab"
import { BookOpen, Play } from "lucide-react"
import type { PrayerData } from "@/lib/types"

export default function PrayerApp() {
  const [activeTab, setActiveTab] = useState("manage")
  const [prayerData, setPrayerData] = useState<PrayerData>({
    topics: [
      {
        id: "1-1",
        name: "Spiritual Growth",
        prayerPoints: [
          { id: "1-1-1", text: "For a deeper relationship with God" },
          { id: "1-1-2", text: "For wisdom and discernment in daily decisions" },
          { id: "1-1-3", text: "For strength to overcome temptations" },
        ],
      },
      {
        id: "1-2",
        name: "Health & Wellbeing",
        prayerPoints: [
          { id: "1-2-1", text: "For physical health and healing" },
          { id: "1-2-2", text: "For mental peace and emotional stability" },
          { id: "1-2-3", text: "For rest and restoration" },
        ],
      },
      {
        id: "2-1",
        name: "Parents",
        prayerPoints: [
          { id: "2-1-1", text: "For their health and long life" },
          { id: "2-1-2", text: "For wisdom in their decisions" },
          { id: "2-1-3", text: "For their spiritual growth" },
        ],
      },
      {
        id: "2-2",
        name: "Siblings",
        prayerPoints: [
          { id: "2-2-1", text: "For their success in their endeavors" },
          { id: "2-2-2", text: "For protection and guidance" },
          { id: "2-2-3", text: "For strong family bonds" },
        ],
      },
      {
        id: "3-1",
        name: "Leadership",
        prayerPoints: [
          { id: "3-1-1", text: "For pastors and church leaders to have wisdom" },
          { id: "3-1-2", text: "For unity among the leadership team" },
          { id: "3-1-3", text: "For protection from burnout and discouragement" },
        ],
      },
      {
        id: "3-2",
        name: "Congregation",
        prayerPoints: [
          { id: "3-2-1", text: "For spiritual growth of all members" },
          { id: "3-2-2", text: "For new believers to be welcomed and discipled" },
          { id: "3-2-3", text: "For unity and love among members" },
        ],
      },
      {
        id: "4-1",
        name: "Missions",
        prayerPoints: [
          { id: "4-1-1", text: "For missionaries serving in difficult places" },
          { id: "4-1-2", text: "For the Gospel to reach unreached people groups" },
          { id: "4-1-3", text: "For provision and protection of mission workers" },
        ],
      },
      {
        id: "4-2",
        name: "Global Issues",
        prayerPoints: [
          { id: "4-2-1", text: "For peace in regions affected by conflict" },
          { id: "4-2-2", text: "For those suffering from poverty and hunger" },
          { id: "4-2-3", text: "For justice and righteousness to prevail" },
        ],
      },
    ],
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-serif font-bold text-primary mb-3 text-balance">Prayer Companion</h1>
          <p className="text-muted-foreground text-lg text-balance">
            Organize your prayers and deepen your spiritual practice
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
            <ManagePrayersTab prayerData={prayerData} setPrayerData={setPrayerData} />
          </TabsContent>

          <TabsContent value="pray" className="mt-0">
            <PrayerSessionTab prayerData={prayerData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
