import React from "react"

type PageMastProps = {
  kicker?: string
  title: string
  subtitle?: React.ReactNode
  accentColor?: string
  children?: React.ReactNode
}

export default function PageMast({ kicker, title, subtitle, accentColor, children }: PageMastProps) {
  return (
    <header className="mb-6 pb-4 border-b border-border-subtle flex items-end justify-between gap-4">
      <div>
        {kicker && <p className="text-xs uppercase tracking-widest text-text-faint mb-1">{kicker}</p>}
        <h1
          className={`font-serif-display font-bold ${accentColor ? "text-3xl" : "text-2xl"}`}
          style={accentColor ? { color: accentColor } : undefined}
        >
          {title}
        </h1>
        {subtitle && <div className="mt-1 text-sm text-text-muted">{subtitle}</div>}
      </div>
      {children}
    </header>
  )
}
