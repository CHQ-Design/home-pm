"use client"

import { useState } from "react"
import type { Person, Prisma } from "@prisma/client"
import TaskItem from "./task-item"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true } }>

function utcDateStr(date: Date) {
  return new Date(date).toISOString().slice(0, 10)
}

function localTodayStr() {
  return new Date().toLocaleDateString("en-CA")
}

function groupTasks(tasks: Task[]) {
  const today = localTodayStr()
  const open = tasks.filter(t => !t.completed)

  return {
    overdue:  open.filter(t => t.dueDate && utcDateStr(t.dueDate) < today)
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
    today:    open.filter(t => t.dueDate && utcDateStr(t.dueDate) === today),
    upcoming: open.filter(t => t.dueDate && utcDateStr(t.dueDate) > today),
    noDate:   open.filter(t => !t.dueDate),
    completed: tasks.filter(t => t.completed),
  }
}

function Section({
  title, tasks, titleClass, people,
}: {
  title: string; tasks: Task[]; titleClass: string; people: Person[]
}) {
  if (tasks.length === 0) return null
  return (
    <section className="mb-4">
      <h2 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${titleClass}`}>
        {title}
      </h2>
      <ul className="divide-y divide-stone-800">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} people={people} />
        ))}
      </ul>
    </section>
  )
}

type Props = { tasks: Task[]; people: Person[] }

export default function TaskList({ tasks, people }: Props) {
  const [showCompleted, setShowCompleted] = useState(false)
  const [filterPersonId, setFilterPersonId] = useState<number | null>(null)

  const filtered = filterPersonId === null
    ? tasks
    : tasks.filter(t => t.assigneeId === filterPersonId)

  const groups = groupTasks(filtered)
  const openCount =
    groups.overdue.length + groups.today.length + groups.upcoming.length + groups.noDate.length

  return (
    <div>
      {people.length > 0 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilterPersonId(null)}
            aria-pressed={filterPersonId === null}
            className={`text-xs px-4 py-2.5 rounded-full transition-colors touch-manipulation ${
              filterPersonId === null
                ? "bg-accent text-stone-900 font-medium"
                : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300"
            }`}
          >
            All
          </button>
          {people.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterPersonId(p.id)}
              aria-pressed={filterPersonId === p.id}
              className={`text-xs px-4 py-2.5 rounded-full transition-colors touch-manipulation ${
                filterPersonId === p.id
                  ? "bg-accent text-stone-900 font-medium"
                  : "bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-300"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {openCount === 0 && groups.completed.length === 0 && filterPersonId === null && (
        <p className="text-stone-500 text-sm py-4">No tasks yet. Add one above.</p>
      )}
      {openCount === 0 && groups.completed.length === 0 && filterPersonId !== null && (
        <p className="text-stone-500 text-sm py-4">
          No open tasks for {people.find(p => p.id === filterPersonId)?.name}.
        </p>
      )}
      {openCount === 0 && groups.completed.length > 0 && (
        <p className="text-stone-500 text-sm py-2">All done!</p>
      )}

      <Section title="Overdue"  tasks={groups.overdue}  titleClass="text-red-400"   people={people} />
      <Section title="Today"    tasks={groups.today}    titleClass="text-accent"    people={people} />
      <Section title="Upcoming" tasks={groups.upcoming} titleClass="text-stone-400" people={people} />
      <Section title="No date"  tasks={groups.noDate}   titleClass="text-stone-600" people={people} />

      {groups.completed.length > 0 && (
        <div className="mt-6 border-t border-stone-800 pt-4">
          <button
            onClick={() => setShowCompleted(v => !v)}
            aria-expanded={showCompleted}
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            {showCompleted ? "▾" : "▸"} {groups.completed.length} completed
          </button>
          {showCompleted && (
            <ul className="mt-2 divide-y divide-stone-800 opacity-60">
              {groups.completed.map(task => (
                <TaskItem key={task.id} task={task} people={people} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
