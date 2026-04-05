"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Menu, LogIn, User, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

interface SwipeMenuProps {
  isAuthenticated?: boolean
  userEmail?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SwipeMenu({ 
  isAuthenticated = false, 
  userEmail,
  open,
  onOpenChange
}: SwipeMenuProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const { signOut } = useAuth()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
  }, [open])

  const handleMenuToggle = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      onOpenChange?.(!open)
      setIsTransitioning(false)
    }, 300)
  }

  const handleLogout = async () => {
    await signOut()
    onOpenChange?.(false)
  }

  return (
    <Sheet open={open || false} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 p-0 bg-background/95 backdrop-blur-sm border-r border-border">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-serif font-bold text-primary mb-2">Menu</h2>
            {isAuthenticated && userEmail && (
              <p className="text-sm text-muted-foreground mt-1">{userEmail}</p>
            )}
          </div>

          {/* Menu Items */}
          <div className="flex-1 p-6 space-y-4">
            {!isAuthenticated ? (
              <Link href="/login" onClick={() => {
                onOpenChange?.(false)
              }}>
                <Button variant="outline" className="w-full justify-start gap-2 h-12">
                  <LogIn className="h-5 w-5" />
                  <span className="text-base font-medium">Login</span>
                </Button>
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5" />
                  <span className="text-sm font-medium">Logged in as {userEmail}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-12"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-base font-medium">Logout</span>
                </Button>
              </>
            )}

            <Link href="/" onClick={() => {
              onOpenChange?.(false)
            }}>
              <Button variant="ghost" className="w-full justify-start gap-2 h-12">
                <Settings className="h-5 w-5" />
                <span className="text-base font-medium">Prayer App</span>
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Abide v1.0
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
