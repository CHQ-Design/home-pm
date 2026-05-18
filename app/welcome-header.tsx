"use client"

import { useEffect, useState } from "react"
import { greeting } from "@/lib/dates"

export default function WelcomeHeader({ name, color }: { name: string; color: string }) {
  const [greet, setGreet] = useState(() => greeting(new Date().getUTCHours()))
  useEffect(() => { setGreet(greeting()) }, [])

  return (
    <p className="font-serif text-3xl font-bold mb-6" style={{ color }}>
      {greet}, {name}.
    </p>
  )
}
