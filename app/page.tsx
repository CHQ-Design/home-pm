import { prisma } from "@/lib/prisma"
import AddTaskForm from "./add-task-form"
import TaskList from "./task-list"
import PeopleManager from "./people-manager"

export default async function Home() {
  const [tasks, people, projects] = await Promise.all([
    prisma.task.findMany({ include: { assignee: true, project: true }, orderBy: { createdAt: "asc" } }),
    prisma.person.findMany({
      include: { _count: { select: { tasks: { where: { completed: false } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-serif text-2xl font-bold mb-6">Tasks</h1>
      <AddTaskForm people={people} projects={projects} />
      <TaskList tasks={tasks} people={people} projects={projects} />
      <PeopleManager people={people} />
    </main>
  )
}
