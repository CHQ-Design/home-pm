"use client"

import { useEffect, useState } from "react"
import { greeting } from "@/lib/dates"

function kidGreeting(hour: number): string {
  if (hour < 12) return "Good morning ☀️"
  if (hour < 17) return "Hi there 🌤"
  return "Almost bedtime 🌙"
}

export default function WelcomeHeader({ name, color, streakCount = 0, isKid = false }: { name: string; color: string; streakCount?: number; isKid?: boolean }) {
  const [greet, setGreet] = useState(() =>
    isKid ? kidGreeting(new Date().getHours()) : greeting(new Date().getUTCHours())
  )
  useEffect(() => {
    setGreet(isKid ? kidGreeting(new Date().getHours()) : greeting())
  }, [isKid])

  return (
    <div className="mb-6">
      <p className={`font-serif font-bold ${isKid ? "text-4xl" : "text-3xl"}`} style={{ color }}>
        {greet}, {name}!
      </p>
      {!isKid && streakCount >= 2 && (
        <p className="text-sm mt-1 text-accent">🔥 {streakCount}-day streak</p>
      )}
    </div>
  )
}
