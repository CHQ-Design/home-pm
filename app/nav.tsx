"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { IconSettings } from "@tabler/icons-react"

export default function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  return (
    <nav aria-label="Primary" className="border-b border-border">
      <div className="max-w-2xl mx-auto px-3 flex gap-0.5 h-12 items-center">
        <Link href="/" className="font-serif text-lg font-bold tracking-tight text-foreground mr-2 shrink-0">
          Otium<span className="text-warm" aria-hidden="true">.</span>
        </Link>
        <div className="hidden sm:flex gap-0.5 items-center">
          <NavLink href="/" active={pathname === "/"}>Things</NavLink>
          <NavLink href="/recurring" active={pathname.startsWith("/recurring")}>Routines</NavLink>
          {isAdmin && <NavLink href="/projects" active={pathname.startsWith("/projects")}>Projects</NavLink>}
          {isAdmin && <NavLink href="/notes" active={pathname.startsWith("/notes")}>Notes</NavLink>}
        </div>
        <div className="ml-auto flex items-center shrink-0">
          {isAdmin && (
            <Link
              href="/settings"
              aria-label="Settings"
              title="Settings"
              className={`flex items-center justify-center min-h-[44px] px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                pathname.startsWith("/settings") ? "text-accent" : "text-text-faint hover:text-text-hover"
              }`}
            >
              <IconSettings size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`text-sm font-medium px-2 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
        active
          ? "bg-accent/10 text-accent-hover"
          : "text-text-secondary hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  )
}
