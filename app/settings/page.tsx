export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionRole } from "@/lib/require-auth"
import PeopleManager from "@/app/people-manager"

export default async function SettingsPage() {
  const role = await getSessionRole()
  if (role !== "admin") redirect("/")

  const people = await prisma.person.findMany({
    include: { _count: { select: { tasks: { where: { completed: false } } } } },
    orderBy: { name: "asc" },
  })

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold mb-6">Settings</h1>
      <PeopleManager people={people} />
    </main>
  )
}
