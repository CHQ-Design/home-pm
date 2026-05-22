"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/require-auth"
import { revalidatePath } from "next/cache"
import { EMAIL_RE } from "@/lib/parse"

export async function inviteUser(formData: FormData) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")

  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase()
  if (!email) return { error: "Email is required" }
  if (!EMAIL_RE.test(email)) return { error: "Invalid email address" }

  const role = formData.get("role") as string
  if (role !== "admin" && role !== "member") return { error: "Invalid role" }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: "That email is already a member" }

  await prisma.user.create({ data: { email, role, householdId: sessionUser.householdId } })
  revalidatePath("/settings")
}

export async function removeUser(id: number) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")

  const session = await getServerSession(authOptions)
  const currentEmail = session?.user?.email?.toLowerCase() ?? ""

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.householdId !== sessionUser.householdId) return

  if (target.email === currentEmail) return { error: "You can't remove yourself" }

  if (target.role === "admin") {
    const adminCount = await prisma.user.count({
      where: { householdId: sessionUser.householdId, role: "admin" },
    })
    if (adminCount <= 1) return { error: "Can't remove the last admin" }
  }

  await prisma.pushSubscription.deleteMany({ where: { userEmail: target.email } })
  await prisma.user.delete({ where: { id } })
  revalidatePath("/settings")
}

export async function updateUserRole(id: number, role: "admin" | "member") {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  if (role !== "admin" && role !== "member") return { error: "Invalid role" }

  const session = await getServerSession(authOptions)
  const currentEmail = session?.user?.email?.toLowerCase() ?? ""

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.householdId !== sessionUser.householdId) return
  if (target.email === currentEmail) return { error: "You can't change your own role" }

  if (target.role === "admin" && role === "member") {
    const adminCount = await prisma.user.count({
      where: { householdId: sessionUser.householdId, role: "admin" },
    })
    if (adminCount <= 1) return { error: "Can't remove the last admin" }
  }

  await prisma.user.update({ where: { id }, data: { role } })
  revalidatePath("/settings")
}

export async function updateHouseholdSoundEnabled(enabled: boolean) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")

  await prisma.household.update({
    where: { id: sessionUser.householdId },
    data: { soundEnabled: enabled },
  })

  revalidatePath("/settings")
  revalidatePath("/")
}

export async function updateHouseholdCustodyModeEnabled(enabled: boolean) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")

  await prisma.household.update({
    where: { id: sessionUser.householdId },
    data: { custodyModeEnabled: enabled },
  })

  revalidatePath("/settings")
  revalidatePath("/")
}

export async function setUserCustodyMode(mode: "with_kids" | "without_kids" | null) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) throw new Error("Not authenticated")
  if (mode !== null && mode !== "with_kids" && mode !== "without_kids") throw new Error("Invalid mode")

  await prisma.user.update({ where: { id: sessionUser.id }, data: { custodyMode: mode } })
  revalidatePath("/")
}
