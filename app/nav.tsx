"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-[#DDD5C5]">
      <div className="max-w-2xl mx-auto px-4 flex gap-1 h-12 items-center">
        <NavLink href="/" active={pathname === "/"}>Things</NavLink>
        <NavLink href="/projects" active={pathname.startsWith("/projects")}>Projects</NavLink>
        <NavLink href="/recurring" active={pathname.startsWith("/recurring")}>Recurring</NavLink>
        <NavLink href="/notes" active={pathname.startsWith("/notes")}>Notes</NavLink>
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
