"use client"

import { useEffect, useState } from "react"
import { greeting } from "@/lib/dates"

export default function WelcomeHeader({ name, color, streakCount = 0 }: { name: string; color: string; streakCount?: number }) {
  const [greet, setGreet] = useState(() => greeting(new Date().getUTCHours()))
  useEffect(() => { setGreet(greeting()) }, [])

  return (
    <div className="mb-6">
      <p className="font-serif text-3xl font-bold" style={{ color }}>
        {greet}, {name}.
      </p>
      {streakCount >= 2 && (
        <p className="text-sm mt-1 text-accent">🔥 {streakCount}-day streak</p>
      )}
    </div>
  )
}
