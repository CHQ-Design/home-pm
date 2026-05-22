"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { IconList, IconRepeat, IconFolder, IconNotes } from "@tabler/icons-react"

export default function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  if (!session?.user) return null

  const tabs = [
    { href: "/", label: "Things", Icon: IconList, active: pathname === "/" },
    { href: "/recurring", label: "Routines", Icon: IconRepeat, active: pathname.startsWith("/recurring") },
    ...(isAdmin ? [
      { href: "/projects", label: "Projects", Icon: IconFolder, active: pathname.startsWith("/projects") },
      { href: "/notes", label: "Notes", Icon: IconNotes, active: pathname.startsWith("/notes") },
    ] : []),
  ]

  return (
    <nav aria-label="Sections" className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border">
      <div className="max-w-2xl mx-auto flex pb-[max(env(safe-area-inset-bottom),_4px)]">
        {tabs.map(({ href, label, Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B07A3C] focus-visible:ring-inset ${
              active ? "text-foreground font-semibold" : "font-medium text-text-hover hover:text-foreground"
            }`}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
            <span aria-hidden="true" className={`w-1 h-1 rounded-full ${active ? "bg-accent" : "invisible"}`} />
          </Link>
        ))}
      </div>
    </nav>
  )
}
