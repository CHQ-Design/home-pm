"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export default function SignOutButton() {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-foreground">Sign out?</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-warm-text hover:text-foreground font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
        >
          Yes, sign out
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-text-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-sm text-text-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 rounded"
    >
      Sign out
    </button>
  )
}
