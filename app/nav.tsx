"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { IconSettings } from "@tabler/icons-react"

export default function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  return (
    <nav aria-label="Primary" className="border-b border-border">
      <div className="max-w-2xl mx-auto px-3 flex gap-0.5 h-12 items-center">
        <Link href="/" className="font-serif text-base font-bold text-foreground mr-2 shrink-0">
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
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center justify-center min-h-[44px] px-2 text-text-faint hover:text-text-hover"
              aria-label="Sign out"
              title="Sign out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
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
