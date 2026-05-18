"use client"

import { useEffect, useState } from "react"

export default function LocalDate() {
  // Initialize with UTC to match server render, then update to local after mount
  const [text, setText] = useState(() =>
    new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
  )
  useEffect(() => {
    setText(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }))
  }, [])
  return <p className="font-serif text-sm text-[#8C7D6A] mb-1">{text}</p>
}
