import { prisma } from "@/lib/prisma"
import AddTaskForm from "./add-task-form"
import TaskList from "./task-list"

export default async function Home() {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: "asc" } })
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      <AddTaskForm />
      <TaskList tasks={tasks} />
    </main>
  )
}
