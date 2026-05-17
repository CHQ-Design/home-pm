import { getServerSession } from "next-auth"
import { authOptions, getRole, Role } from "./auth"
import { prisma } from "./prisma"

export async function requireRole(minimum: Role): Promise<void> {
  const session = await getServerSession(authOptions)
  const role = getRole(session?.user?.email)

  if (!session) throw new Error("Not authenticated")
  if (minimum === "admin" && role !== "admin") throw new Error("Not authorized")
}

export async function getSessionRole(): Promise<Role | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return getRole(session.user.email)
}

export async function getSessionPersonId(): Promise<number | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return null
  const person = await prisma.person.findFirst({ where: { email }, select: { id: true } })
  return person?.id ?? null
}

// Allows action if caller is admin, or if the item is assigned to them.
export async function requireAssignedOrAdmin(assigneeId: number | null): Promise<void> {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Not authenticated")
  if (getRole(session.user?.email) === "admin") return
  if (!assigneeId) throw new Error("Not authorized")
  const email = session.user?.email?.toLowerCase() ?? ""
  const person = await prisma.person.findFirst({ where: { id: assigneeId, email }, select: { id: true } })
  if (!person) throw new Error("Not authorized")
}
