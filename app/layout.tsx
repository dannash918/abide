import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { ClearServiceWorker } from '@/components/clear-service-worker' // Import the fixer
import './globals.css'

export const metadata: Metadata = {
  title: 'Abide',
  description: 'Organize your prayers and deepen your spiritual practice',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: '/placeholder-logo.svg',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* This will run on the client and unregister any "ghost" service workers */}
        <ClearServiceWorker /> 
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}