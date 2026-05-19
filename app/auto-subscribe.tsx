"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { urlBase64ToUint8Array } from "@/lib/push-utils"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

async function registerAndSubscribe() {
  const reg = await navigator.serviceWorker.register("/sw.js")
  const existing = await reg.pushManager.getSubscription()
  if (existing) return
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  await fetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  })
}

export default function AutoSubscribe() {
  const { data: session } = useSession()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (!session) return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    if (Notification.permission === "granted") {
      // Already granted — silently re-register in case subscription lapsed
      registerAndSubscribe().catch(() => {})
      return
    }

    if (Notification.permission === "denied") return
    if (localStorage.getItem("notif-banner-dismissed") === "1") return

    setShowBanner(true)
  }, [session])

  async function handleTurnOn() {
    localStorage.setItem("notif-banner-dismissed", "1")
    setShowBanner(false)
    try {
      await registerAndSubscribe()
    } catch {
      // User denied the browser prompt — nothing to do
    }
  }

  function handleDismiss() {
    localStorage.setItem("notif-banner-dismissed", "1")
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="w-full bg-surface-warm border-b border-border-card px-4 py-2.5 flex items-center justify-between gap-3">
      <span className="text-sm text-text-hover">Get reminders when tasks are due.</span>
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={handleTurnOn}
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          Turn on
        </button>
        <button
          onClick={handleDismiss}
          className="text-sm text-text-faint hover:text-text-hover"
          aria-label="Dismiss notification banner"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
