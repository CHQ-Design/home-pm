"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { EMAIL_RE } from "@/lib/parse"

async function requireSuperAdmin() {
  const superEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase()
  if (!superEmail) throw new Error("SUPERADMIN_EMAIL not configured")
  const session = await getServerSession(authOptions)
  if (session?.user?.email?.toLowerCase() !== superEmail) throw new Error("Not authorized")
}

export async function createHousehold(formData: FormData) {
  await requireSuperAdmin()

  const name = ((formData.get("name") as string) ?? "").trim()
  if (!name) return { error: "Household name is required" }
  if (name.length > 100) return { error: "Household name is too long" }

  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase()
  if (!email) return { error: "Admin email is required" }
  if (!EMAIL_RE.test(email)) return { error: "Invalid email address" }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: "That email is already in a household" }

  const household = await prisma.household.create({ data: { name } })
  await prisma.user.create({ data: { email, role: "admin", householdId: household.id } })

  revalidatePath("/superadmin")
}

export async function addHouseholdUser(formData: FormData) {
  await requireSuperAdmin()

  const householdId = Number(formData.get("householdId"))
  if (!householdId) return { error: "Missing household" }

  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase()
  if (!email) return { error: "Email is required" }
  if (!EMAIL_RE.test(email)) return { error: "Invalid email address" }

  const role = formData.get("role") as string
  if (role !== "admin" && role !== "member") return { error: "Invalid role" }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: "That email is already in a household" }

  await prisma.user.create({ data: { email, role, householdId } })
  revalidatePath("/superadmin")
}

export async function removeHouseholdUser(id: number) {
  await requireSuperAdmin()

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return

  if (target.role === "admin") {
    const adminCount = await prisma.user.count({
      where: { householdId: target.householdId, role: "admin" },
    })
    if (adminCount <= 1) return { error: "Can't remove the last admin" }
  }

  await prisma.user.delete({ where: { id } })
  revalidatePath("/superadmin")
}
