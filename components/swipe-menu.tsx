"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LogIn, User, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

interface SwipeMenuProps {
  isAuthenticated?: boolean
  userEmail?: string
}

export function SwipeMenu({ isAuthenticated = false, userEmail }: SwipeMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    setIsOpen(false)
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border border-primary/20 hover:bg-background/90"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold">Menu</h2>
            {isAuthenticated && userEmail && (
              <p className="text-sm text-muted-foreground mt-1">{userEmail}</p>
            )}
          </div>

          {/* Menu Items */}
          <div className="flex-1 p-6 space-y-4">
            {!isAuthenticated ? (
              <Link href="/login" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Logged in as {userEmail}</span>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            )}
            
            <Link href="/" onClick={() => setIsOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                Prayer App
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Prayer Companion v1.0
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
