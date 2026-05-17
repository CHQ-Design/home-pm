import { getServerSession } from "next-auth"
import { authOptions, getRole, Role } from "./auth"

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
