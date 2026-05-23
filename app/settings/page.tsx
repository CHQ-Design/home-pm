export const dynamic = "force-dynamic"

import type { Metadata } from "next"
export const metadata: Metadata = { title: "Settings — Otium" }

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/require-auth"
import Link from "next/link"
import PeopleManager from "@/app/people-manager"
import UserManager from "./user-manager"
import SoundSettingToggle from "./sound-setting-toggle"
import CustodySettingToggle from "./custody-setting-toggle"
import PushManager from "@/app/push-manager"
import PageMast from "@/app/page-mast"
import SignOutButton from "./sign-out-button"

export default async function SettingsPage() {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") redirect("/")
  const { householdId } = sessionUser

  const session = await getServerSession(authOptions)
  const currentEmail = session?.user?.email?.toLowerCase() ?? ""

  const [people, users, household] = await Promise.all([
    prisma.person.findMany({
      where: { householdId },
      include: { _count: { select: { tasks: { where: { completed: false } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { householdId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.household.findUnique({
      where: { id: householdId },
      select: { soundEnabled: true, custodyModeEnabled: true },
    }),
  ])

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pt-8 pb-28 sm:pb-8">
      <PageMast title="Settings" />
      <SoundSettingToggle initialEnabled={household?.soundEnabled ?? true} />
      <CustodySettingToggle initialEnabled={household?.custodyModeEnabled ?? false} />
      <div className="mb-8 pb-6 border-b border-border">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-3">Notifications</h2>
        <div className="flex items-center justify-between">
          <span>
            <span className="text-sm text-foreground block">Push notifications</span>
            <span className="text-xs text-text-secondary block mt-0.5">Get reminders on this device when tasks are due.</span>
          </span>
          <PushManager />
        </div>
      </div>
<UserManager users={users} currentEmail={currentEmail} />
      <PeopleManager people={people} />
      <div className="mt-10 pt-6 border-t border-border flex items-center gap-4">
        <Link href="/about" className="text-sm text-text-secondary hover:text-foreground">
          About Otium
        </Link>
        {currentEmail === process.env.SUPERADMIN_EMAIL?.toLowerCase() && (
          <Link href="/superadmin" className="text-xs text-text-secondary hover:text-foreground">
            Super Admin
          </Link>
        )}
        <div className="ml-auto">
          <SignOutButton />
        </div>
      </div>
    </main>
  )
}
