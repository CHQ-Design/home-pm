"use client"

import { useEffect, useState } from "react"
import { IconFlame } from "@tabler/icons-react"
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
      <h1 className={`font-serif font-bold ${isKid ? "text-4xl" : "text-3xl"}`} style={{ color }}>
        {greet}, {name}{isKid ? "!" : "."}
      </h1>
      {!isKid && streakCount >= 2 && (
        <p className="text-sm mt-1 text-accent-hover inline-flex items-center gap-1"><IconFlame size={14} aria-hidden="true" /> {streakCount}-day streak</p>
      )}
    </div>
  )
}
