"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

export default function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav className="border-b border-[#DDD5C5]">
      <div className="max-w-2xl mx-auto px-3 flex gap-0.5 h-12 items-center">
        <Link href="/" className="font-serif text-sm font-bold text-[#3A3228] mr-2 shrink-0">
          The Board
        </Link>
        <NavLink href="/" active={pathname === "/"}>Things</NavLink>
        <NavLink href="/recurring" active={pathname.startsWith("/recurring")}>Routines</NavLink>
        <NavLink href="/projects" active={pathname.startsWith("/projects")}>Projects</NavLink>
        <NavLink href="/notes" active={pathname.startsWith("/notes")}>Notes</NavLink>
        {session && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-auto text-[#B5A898] hover:text-[#6B5E52] shrink-0 pl-2"
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
      className={`text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-[#8C7D6A] hover:text-[#3A3228]"
      }`}
    >
      {children}
    </Link>
  )
}
