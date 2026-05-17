"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

export default function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav className="border-b border-[#DDD5C5]">
      <div className="max-w-2xl mx-auto px-4 flex gap-1 h-12 items-center">
        <Link href="/" className="font-serif text-base font-bold text-[#3A3228] mr-3 shrink-0">
          The Board
        </Link>
        <NavLink href="/" active={pathname === "/"}>Things</NavLink>
        <NavLink href="/recurring" active={pathname.startsWith("/recurring")}>Routines</NavLink>
        <NavLink href="/projects" active={pathname.startsWith("/projects")}>Projects</NavLink>
        <NavLink href="/notes" active={pathname.startsWith("/notes")}>Notes</NavLink>
        {session && (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="ml-auto text-xs text-[#B5A898] hover:text-[#6B5E52] shrink-0"
          >
            Sign out
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
      className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
        active
          ? "bg-accent/10 text-accent"
          : "text-[#8C7D6A] hover:text-[#3A3228]"
      }`}
    >
      {children}
    </Link>
  )
}
