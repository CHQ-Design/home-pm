"use client"

import { useEffect, useState } from "react"
import { IconFlame } from "@tabler/icons-react"
import { greeting } from "@/lib/dates"
import PageMast from "./page-mast"

function kidGreeting(hour: number): string {
  if (hour < 12) return "Good morning ☀️"
  if (hour < 17) return "Hi there 🌤"
  return "Almost bedtime 🌙"
}

export default function GreetingMast({ name, accentColor, streakCount = 0, isKid = false }: {
  name: string
  accentColor: string
  streakCount?: number
  isKid?: boolean
}) {
  const [greet, setGreet] = useState(() =>
    isKid ? kidGreeting(new Date().getHours()) : greeting(new Date().getUTCHours())
  )
  useEffect(() => {
    setGreet(isKid ? kidGreeting(new Date().getHours()) : greeting())
  }, [isKid])

  return (
    <PageMast
      kicker={isKid ? undefined : "Things"}
      title={`${greet}, ${name}${isKid ? "!" : "."}`}
      accentColor={accentColor}
      subtitle={!isKid && streakCount >= 2 ? (
        <span className="inline-flex items-center gap-1 text-accent-hover">
          <IconFlame size={14} aria-hidden="true" /> {streakCount}-day streak
        </span>
      ) : undefined}
    />
  )
}
