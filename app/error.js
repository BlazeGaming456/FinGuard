"use client"

import React, { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-bg-card border border-border p-8 rounded-xl text-center">
            <h1 className="text-xl font-semibold mb-2 text-text-primary">Something went wrong</h1>
            <p className="text-text-secondary mb-4">An unexpected error occurred. Try reloading the page.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => reset()} className="px-4 py-2 bg-accent text-white rounded">Retry</button>
              <Link href="/" className="px-4 py-2 border rounded text-text-secondary">Home</Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
