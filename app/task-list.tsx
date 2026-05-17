"use client"

import { useState } from "react"
import type { Task } from "@prisma/client"
import TaskItem from "./task-item"

// Dates are stored as midnight UTC (e.g. "2026-05-16T00:00:00Z").
// Compare as YYYY-MM-DD strings to avoid timezone drift.
function utcDateStr(date: Date) {
  return new Date(date).toISOString().slice(0, 10)
}

function localTodayStr() {
  // "en-CA" locale formats as YYYY-MM-DD
  return new Date().toLocaleDateString("en-CA")
}

function groupTasks(tasks: Task[]) {
  const today = localTodayStr()
  const open = tasks.filter(t => !t.completed)

  return {
    overdue: open.filter(t => t.dueDate && utcDateStr(t.dueDate) < today),
    today:   open.filter(t => t.dueDate && utcDateStr(t.dueDate) === today),
    upcoming: open.filter(t => t.dueDate && utcDateStr(t.dueDate) > today),
    noDate: open.filter(t => !t.dueDate),
    completed: tasks.filter(t => t.completed),
  }
}

function Section({ title, tasks, titleClass }: { title: string; tasks: Task[]; titleClass: string }) {
  if (tasks.length === 0) return null
  return (
    <section className="mb-4">
      <h2 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${titleClass}`}>
        {title}
      </h2>
      <ul className="divide-y divide-slate-100">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} />
        ))}
      </ul>
    </section>
  )
}

export default function TaskList({ tasks }: { tasks: Task[] }) {
  const [showCompleted, setShowCompleted] = useState(false)
  const groups = groupTasks(tasks)
  const openCount =
    groups.overdue.length + groups.today.length + groups.upcoming.length + groups.noDate.length

  return (
    <div>
      {openCount === 0 && groups.completed.length === 0 && (
        <p className="text-slate-400 text-sm py-4">No tasks yet. Add one above.</p>
      )}
      {openCount === 0 && groups.completed.length > 0 && (
        <p className="text-slate-400 text-sm py-2">All done!</p>
      )}

      <Section title="Overdue" tasks={groups.overdue} titleClass="text-red-500" />
      <Section title="Today" tasks={groups.today} titleClass="text-blue-500" />
      <Section title="Upcoming" tasks={groups.upcoming} titleClass="text-slate-500" />
      <Section title="No date" tasks={groups.noDate} titleClass="text-slate-400" />

      {groups.completed.length > 0 && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            {showCompleted ? "▾" : "▸"} {groups.completed.length} completed
          </button>
          {showCompleted && (
            <ul className="mt-2 divide-y divide-slate-100 opacity-60">
              {groups.completed.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
