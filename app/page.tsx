import { prisma } from "@/lib/prisma"
import AddTaskForm from "./add-task-form"
import TaskList from "./task-list"
import PeopleManager from "./people-manager"

export default async function Home() {
  const [tasks, people] = await Promise.all([
    prisma.task.findMany({ include: { assignee: true }, orderBy: { createdAt: "asc" } }),
    prisma.person.findMany({
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      <AddTaskForm people={people} />
      <TaskList tasks={tasks} people={people} />
      <PeopleManager people={people} />
    </main>
  )
}
