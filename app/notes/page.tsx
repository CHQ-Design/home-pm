import { prisma } from "@/lib/prisma"
import AddNoteForm from "./add-note-form"
import NoteList from "./note-list"

export default async function NotesPage() {
  const [notes, projects] = await Promise.all([
    prisma.note.findMany({
      include: { attachments: true, project: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold mb-6 text-[#3A3228]">Notes</h1>
      <AddNoteForm projects={projects} />
      <NoteList notes={notes} projects={projects} />
    </main>
  )
}
