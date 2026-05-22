import { getServerSession } from "next-auth"
import { authOptions, Role } from "./auth"
import { prisma } from "./prisma"

async function getDbUser() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return null
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, householdId: true },
  })
  if (!user) return null
  return { ...user, email }
}

export async function getSessionUser(): Promise<{ role: Role; householdId: number } | null> {
  const user = await getDbUser()
  if (!user) return null
  return { role: user.role as Role, householdId: user.householdId }
}

export async function requireRole(minimum: Role): Promise<void> {
  const user = await getDbUser()
  if (!user) throw new Error("Not authenticated")
  if (minimum === "admin" && user.role !== "admin") throw new Error("Not authorized")
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
  const user = await getDbUser()
  if (!user) return null
  const person = await prisma.person.findFirst({
    where: { email: user.email, householdId: user.householdId },
    select: { id: true },
  })
  return person?.id ?? null
}

// Verifies a project or person ID belongs to the given household. Returns the ID or null.
export async function verifyBelongsToHousehold(
  type: "project" | "person",
  id: number | null | undefined,
  householdId: number
): Promise<number | null> {
  if (id == null) return null
  if (type === "project") {
    const found = await prisma.project.findFirst({ where: { id, householdId }, select: { id: true } })
    return found ? id : null
  }
  const found = await prisma.person.findFirst({ where: { id, householdId }, select: { id: true } })
  return found ? id : null
}

// Allows action if caller is admin of the same household, or if the item is assigned to them.
export async function requireAssignedOrAdmin(
  assigneeId: number | null,
  recordHouseholdId: number
): Promise<void> {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Not authenticated")
  const user = await getDbUser()
  if (user?.role === "admin") {
    if (user.householdId !== recordHouseholdId) throw new Error("Not authorized")
    return
  }
  if (!assigneeId) throw new Error("Not authorized")
  const email = session.user?.email?.toLowerCase() ?? ""
  const person = await prisma.person.findFirst({ where: { id: assigneeId, email }, select: { id: true, householdId: true } })
  if (!person || person.householdId !== recordHouseholdId) throw new Error("Not authorized")
}
