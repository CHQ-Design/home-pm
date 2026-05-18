"use client"

import { useEffect, useState } from "react"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export default function PushManager() {
  const [status, setStatus] = useState<"unsupported" | "denied" | "subscribed" | "unsubscribed">("unsubscribed")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported")
      return
    }
    if (Notification.permission === "denied") {
      setStatus("denied")
      return
    }
    navigator.serviceWorker.register("/sw.js").then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? "subscribed" : "unsubscribed")
    })
  }, [])

  async function subscribe() {
    setLoading(true)
    setError(null)
    try {
      console.log("[push] VAPID key:", VAPID_PUBLIC_KEY?.slice(0, 10))
      const reg = await navigator.serviceWorker.ready
      console.log("[push] SW ready, subscribing...")
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      console.log("[push] browser subscription created, saving to server...")
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(`${res.status}: ${body.error ?? "unknown"}`)
      }
      console.log("[push] saved, status subscribed")
      setStatus("subscribed")
    } catch (err) {
      console.error("[push] subscribe error:", err)
      setError(err instanceof Error ? err.message : "Failed to subscribe")
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus("unsubscribed")
    } finally {
      setLoading(false)
    }
  }

  if (status === "unsupported" || status === "denied") return null

  const isSubscribed = status === "subscribed"

  return (
    <div className="ml-auto flex items-center gap-1">
      {error && <span className="text-red-500 text-xs">{error}</span>}
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={loading}
      className="text-[#B5A898] hover:text-[#6B5E52] shrink-0 pl-2 disabled:opacity-50"
      aria-label={isSubscribed ? "Disable notifications" : "Enable notifications"}
      title={isSubscribed ? "Disable notifications" : "Enable notifications"}
    >
      {isSubscribed ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )}
    </button>
    </div>
  )
}
