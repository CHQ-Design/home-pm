"use client"

import { useState } from "react"
import type { Person, Project, Prisma } from "@prisma/client"
import { IconSun, IconWaveSine } from "@tabler/icons-react"
import TaskItem from "./task-item"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>

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
  title, tasks, titleClass, people, projects, icon,
}: {
  title: string; tasks: Task[]; titleClass: string; people: Person[]; projects: Project[];
  icon?: React.ReactNode;
}) {
  if (tasks.length === 0) return null
  return (
    <section className="mb-4">
      <h2 className={`flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider mb-2 ${titleClass}`}>
        {icon}
        {title}
      </h2>
      <ul className="divide-y divide-[#E4DDD0]">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} people={people} projects={projects} />
        ))}
      </ul>
    </section>
  )
}

type Props = { tasks: Task[]; people: Person[]; projects: Project[] }

export default function TaskList({ tasks, people, projects }: Props) {
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
                ? "bg-accent text-white font-medium"
                : "bg-[#EDE6D8] text-[#6B5E52] border border-[#C8BFAD] hover:bg-[#E4DBD0] hover:text-[#3A3228]"
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
                  ? "bg-accent text-white font-medium"
                  : "bg-[#EDE6D8] text-[#6B5E52] border border-[#C8BFAD] hover:bg-[#E4DBD0] hover:text-[#3A3228]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {openCount === 0 && groups.completed.length === 0 && filterPersonId === null && (
        <p className="text-[#A09080] text-sm py-4">No tasks yet. Add one above.</p>
      )}
      {openCount === 0 && groups.completed.length === 0 && filterPersonId !== null && (
        <p className="text-[#A09080] text-sm py-4">
          No open tasks for {people.find(p => p.id === filterPersonId)?.name}.
        </p>
      )}
      {openCount === 0 && groups.completed.length > 0 && (
        <p className="text-[#A09080] text-sm py-2">All done!</p>
      )}

      <Section title="Overdue"   tasks={groups.overdue}  titleClass="text-red-700"   people={people} projects={projects} />
      <Section title="Today"     tasks={groups.today}    titleClass="text-accent"    people={people} projects={projects} />
      <Section title="Coming up" tasks={groups.upcoming} titleClass="text-[#8C7D6A]" people={people} projects={projects}
        icon={<IconSun size={14} />} />
      <Section title="No rush"   tasks={groups.noDate}   titleClass="text-[#A09080]" people={people} projects={projects}
        icon={<IconWaveSine size={14} />} />

      {groups.completed.length > 0 && (
        <div className="mt-8 border-t border-[#D4C9B5] pt-5">
          <button
            onClick={() => setShowCompleted(v => !v)}
            aria-expanded={showCompleted}
            className="text-sm text-[#8C7D6A] hover:text-[#3A3228]"
          >
            {showCompleted ? "▾" : "▸"} {groups.completed.length} completed
          </button>
          {showCompleted && (
            <ul className="mt-2 divide-y divide-[#E4DDD0] opacity-75">
              {groups.completed.map(task => (
                <TaskItem key={task.id} task={task} people={people} projects={projects} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
