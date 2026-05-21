export const dynamic = "force-dynamic"

import type { Metadata } from "next"
export const metadata: Metadata = { title: "Notes — Otium" }

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/require-auth"
import AddNoteForm from "./add-note-form"
import NoteList from "./note-list"
import PageHeader from "@/app/page-header"

export default async function NotesPage() {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") redirect("/")
  const { householdId } = sessionUser

  const [notes, projects] = await Promise.all([
    prisma.note.findMany({
      where: { householdId },
      include: { attachments: true, project: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({ where: { householdId }, orderBy: { name: "asc" } }),
  ])

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pt-8 pb-20 sm:pb-8">
      <PageHeader title="Notes" />
      <AddNoteForm projects={projects} />
      <NoteList notes={notes} projects={projects} />
    </main>
  )
}
