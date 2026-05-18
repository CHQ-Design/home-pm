export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createHousehold } from "./actions"
import HouseholdCard from "./household-card"

async function NewHouseholdForm() {
  async function handleCreate(formData: FormData) {
    "use server"
    await createHousehold(formData)
  }

  return (
    <form action={handleCreate} className="p-4 bg-[#F4EEE3] border border-[#D4C9B5] rounded-xl space-y-3">
      <p className="text-sm font-medium text-[#3A3228]">New household</p>
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="Family name (e.g. Smith Family)"
          autoComplete="off"
          className="flex-1 bg-[#F2ECE2] border border-[#D4C9B5] rounded-md px-3 py-2 text-base text-[#3A3228] placeholder-[#A09080] outline-none focus:border-[#6B7A5A] focus:ring-1 focus:ring-[#6B7A5A]/20"
        />
      </div>
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          placeholder="Admin Google email"
          autoComplete="off"
          className="flex-1 bg-[#F2ECE2] border border-[#D4C9B5] rounded-md px-3 py-2 text-base text-[#3A3228] placeholder-[#A09080] outline-none focus:border-[#6B7A5A] focus:ring-1 focus:ring-[#6B7A5A]/20"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#6B7A5A] text-white text-sm font-medium rounded-lg hover:bg-[#556148] shrink-0"
        >
          Create
        </button>
      </div>
      <p className="text-xs text-[#A09080]">
        The admin email will be the household owner — they can invite the rest of their family from Settings.
      </p>
    </form>
  )
}

export default async function SuperAdminPage() {
  const superEmail = process.env.SUPERADMIN_EMAIL?.toLowerCase()
  const session = await getServerSession(authOptions)
  if (!superEmail || session?.user?.email?.toLowerCase() !== superEmail) redirect("/")

  const households = await prisma.household.findMany({
    include: { users: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  })

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold mb-1 text-[#3A3228]">Super Admin</h1>
      <p className="text-sm text-[#A09080] mb-8">Manage all households on this instance.</p>

      <div className="space-y-3 mb-8">
        {households.length === 0 && (
          <p className="text-sm text-[#A09080]">No households yet.</p>
        )}
        {households.map(h => (
          <HouseholdCard key={h.id} household={h} />
        ))}
      </div>

      <NewHouseholdForm />
    </main>
  )
}
