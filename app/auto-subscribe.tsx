"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { urlBase64ToUint8Array } from "@/lib/push-utils"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

export default function AutoSubscribe() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session) return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    if (Notification.permission === "denied") return

    navigator.serviceWorker.register("/sw.js").then(async reg => {
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
    }).catch(() => {})
  }, [session])

  return null
}
