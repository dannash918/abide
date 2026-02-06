"use client"

import React from "react"

export default function GlobalErrorPage() {
  return (
    <html>
      <body>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'}}>
          <div style={{textAlign: 'center'}}>
            <h1 style={{fontSize: 24, marginBottom: 8}}>Something went wrong</h1>
            <p style={{color: '#666'}}>An unexpected error occurred. Please try again later.</p>
          </div>
        </div>
      </body>
    </html>
  )
}
