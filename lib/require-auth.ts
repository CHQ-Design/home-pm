import { getServerSession } from "next-auth"
import { authOptions, Role } from "./auth"
import { prisma } from "./prisma"

async function getDbUser() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return null
  return prisma.user.findUnique({
    where: { email },
    select: { role: true, householdId: true },
  })
}

export async function getSessionUser(): Promise<{ role: Role; householdId: number } | null> {
  const user = await getDbUser()
  if (!user) return null
  return { role: user.role as Role, householdId: user.householdId }
}

export async function requireRole(minimum: Role): Promise<void> {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Not authenticated")
  const user = await getDbUser()
  if (minimum === "admin" && user?.role !== "admin") throw new Error("Not authorized")
}

export async function getSessionRole(): Promise<Role | null> {
  const user = await getDbUser()
  if (!user) return null
  return user.role as Role
}

export async function getSessionHouseholdId(): Promise<number | null> {
  const user = await getDbUser()
  return user?.householdId ?? null
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
  const user = await getDbUser()
  if (user?.role === "admin") return
  if (!assigneeId) throw new Error("Not authorized")
  const email = session.user?.email?.toLowerCase() ?? ""
  const person = await prisma.person.findFirst({ where: { id: assigneeId, email }, select: { id: true } })
  if (!person) throw new Error("Not authorized")
}
