export const dynamic = "force-dynamic"

import type { Metadata } from "next"
export const metadata: Metadata = { title: "Projects — Otium" }

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/require-auth"
import AddProjectForm from "./add-project-form"
import ProjectList from "./project-list"
import PageMast from "@/app/page-mast"

export default async function ProjectsPage() {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") redirect("/")
  const { householdId } = sessionUser

  const projects = await prisma.project.findMany({
    where: { householdId },
    include: { tasks: { select: { completed: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <main className="w-full max-w-2xl mx-auto px-4 pt-8 pb-28 sm:pb-8">
      <PageMast title="Projects" />
      <AddProjectForm />
      <ProjectList projects={projects} />
    </main>
  )
}
