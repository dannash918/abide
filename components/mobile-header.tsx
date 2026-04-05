"use client"

import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

interface MobileHeaderProps {
  title: string
  onMenuToggle: () => void
}

export function MobileHeader({ title, onMenuToggle }: MobileHeaderProps) {
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background border-b border-border backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="p-2 text-primary hover:bg-muted/50 rounded-lg"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          <h1 className="text-xl font-serif font-bold text-primary">{title}</h1>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {isHome ? (
            <Button variant="ghost" size="sm">Manage Prayers</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <Menu className="h-4 w-4 rotate-180" /> Back
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}