export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/require-auth"
import PeopleManager from "@/app/people-manager"
import UserManager from "./user-manager"

export default async function SettingsPage() {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") redirect("/")
  const { householdId } = sessionUser

  const session = await getServerSession(authOptions)
  const currentEmail = session?.user?.email?.toLowerCase() ?? ""

  const [people, users] = await Promise.all([
    prisma.person.findMany({
      where: { householdId },
      include: { _count: { select: { tasks: { where: { completed: false } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { householdId },
      orderBy: { createdAt: "asc" },
    }),
  ])

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold mb-6">Settings</h1>
      <UserManager users={users} currentEmail={currentEmail} />
      <PeopleManager people={people} />
    </main>
  )
}
