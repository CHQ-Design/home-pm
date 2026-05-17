"use client"

import { useState } from "react"
import type { Person, Project, Prisma } from "@prisma/client"
import { IconAlertTriangle, IconChevronDown, IconChevronRight, IconClock, IconLeaf, IconStar, IconSun } from "@tabler/icons-react"
import TaskItem from "./task-item"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>

function utcDateStr(date: Date) {
  return new Date(date).toISOString().slice(0, 10)
}

function localTodayStr() {
  return new Date().toLocaleDateString("en-CA")
}

const PRIORITY_ORDER: Record<string, number> = { high: 1, medium: 2, low: 3 }

const PERSON_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "#EDE0D0", text: "#6B4C2A", border: "#C8A882" }, // Craig — camel
  2: { bg: "#D8E6DC", text: "#3A5C44", border: "#91B89A" }, // Hudson — sage
  3: { bg: "#EDE0E6", text: "#6B3A52", border: "#C8899A" }, // Quinn — dusty rose
}
const PERSON_COLOR_FALLBACK = { bg: "#EDE6D8", text: "#6B5E52", border: "#C8BFAD" }

function byPriority(a: Task, b: Task) {
  const p = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
  if (p !== 0) return p
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function groupTasks(tasks: Task[]) {
  const today = localTodayStr()
  const open = tasks.filter(t => !t.completed)
  return {
    overdue:   open.filter(t => t.dueDate && utcDateStr(t.dueDate) < today).sort(byPriority),
    today:     open.filter(t => t.dueDate && utcDateStr(t.dueDate) === today).sort(byPriority),
    upcoming:  open.filter(t => t.dueDate && utcDateStr(t.dueDate) > today).sort(byPriority),
    noDate:    open.filter(t => !t.dueDate).sort(byPriority),
    completed: tasks.filter(t => t.completed),
  }
}

function Section({
  title, tasks, titleClass, titleStyle, people, projects, icon, isAdmin, sessionPersonId,
}: {
  title: string
  tasks: Task[]
  titleClass: string
  titleStyle?: React.CSSProperties
  people: Person[]
  projects: Project[]
  icon?: React.ReactNode
  isAdmin: boolean
  sessionPersonId: number | null
}) {
  if (tasks.length === 0) return null
  return (
    <section className="mt-6 mb-4">
      <h2 className={`flex items-center gap-1.5 font-serif text-lg mb-2 ${titleClass}`} style={titleStyle}>
        {icon}
        {title}
      </h2>
      <ul className="divide-y divide-[#E4DDD0]">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
        ))}
      </ul>
    </section>
  )
}

type Props = { tasks: Task[]; people: Person[]; projects: Project[]; isAdmin: boolean; sessionPersonId: number | null }

export default function TaskList({ tasks, people, projects, isAdmin, sessionPersonId }: Props) {
  const [showCompleted, setShowCompleted] = useState(false)
  const [filterPersonId, setFilterPersonId] = useState<number | null>(null)

  const filtered = filterPersonId === null
    ? tasks
    : tasks.filter(t => t.assigneeId === filterPersonId)

  const groups = groupTasks(filtered)
  const openCount =
    groups.overdue.length + groups.today.length + groups.upcoming.length + groups.noDate.length

  const activePerson   = filterPersonId !== null ? people.find(p => p.id === filterPersonId) : null
  const activeColors   = filterPersonId !== null ? (PERSON_COLORS[filterPersonId] ?? PERSON_COLOR_FALLBACK) : null
  const doneToday      = groups.completed.filter(t =>
    t.completedAt && new Date(t.completedAt).toLocaleDateString("en-CA") === localTodayStr()
  ).length

  return (
    <div>
      {people.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterPersonId(null)}
            aria-pressed={filterPersonId === null}
            aria-label="Show everyone's things"
            className={`text-xs px-4 rounded-full transition-colors touch-manipulation min-h-[44px] ${
              filterPersonId === null
                ? "bg-accent text-white font-medium"
                : "bg-[#EDE6D8] text-[#6B5E52] border border-[#C8BFAD] hover:bg-[#E4DBD0] hover:text-[#3A3228]"
            }`}
          >
            Everyone
          </button>
          {people.map(p => {
            const isActive = filterPersonId === p.id
            const colors = PERSON_COLORS[p.id] ?? PERSON_COLOR_FALLBACK
            return (
              <button
                key={p.id}
                onClick={() => setFilterPersonId(p.id)}
                aria-pressed={isActive}
                aria-label={`Show ${p.name}'s things`}
                className="text-xs pl-1.5 pr-3 rounded-full transition-colors touch-manipulation border font-medium flex items-center gap-1.5 min-h-[44px]"
                style={isActive
                  ? { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }
                  : { backgroundColor: "#EDE6D8", color: "#6B5E52", borderColor: "#C8BFAD" }
                }
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold leading-none shrink-0"
                  style={{ backgroundColor: colors.border, color: "white" }}
                >
                  {p.name[0]}
                </span>
                {p.name}
              </button>
            )
          })}
        </div>
      )}

      {activePerson && activeColors && (
        <div className="mb-4">
          <p className="font-serif text-xl font-bold" style={{ color: activeColors.text }}>
            {activePerson.name}'s Things
          </p>
          {doneToday > 0 && (
            <p className="text-sm mt-0.5" style={{ color: activeColors.text }}>
              {doneToday} done today ✓
            </p>
          )}
        </div>
      )}

      {openCount === 0 && groups.completed.length === 0 && filterPersonId === null && (
        <p className="text-[#A09080] text-sm py-4">No things yet. Add one above.</p>
      )}
      {openCount === 0 && groups.completed.length === 0 && filterPersonId !== null && (
        <p className="text-[#A09080] text-sm py-4">
          No things for {activePerson?.name}.
        </p>
      )}
      {openCount === 0 && groups.completed.length > 0 && (
        <p className="font-serif text-xl text-[#A09080] py-2">
          {(["The board's clear. ✦", "Everything's handled.", "Nothing left on the board."])[new Date().getDay() % 3]}
        </p>
      )}

      <Section
        title={activePerson ? "Needs attention" : "Overdue"}
        tasks={groups.overdue}
        titleClass={activePerson ? "" : "text-red-700"}
        titleStyle={activeColors ? { color: activeColors.text } : undefined}
        icon={activePerson
          ? <IconStar size={18} aria-hidden="true" />
          : <IconAlertTriangle size={18} aria-hidden="true" />
        }
        people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId}
      />
      <Section
        title="Today"
        tasks={groups.today}
        titleClass={activePerson ? "" : "text-accent"}
        titleStyle={activeColors ? { color: activeColors.text } : undefined}
        icon={<IconSun size={18} aria-hidden="true" />}
        people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId}
      />
      <Section
        title="Coming up"
        tasks={groups.upcoming}
        titleClass={activePerson ? "" : "text-[#8C7D6A]"}
        titleStyle={activeColors ? { color: activeColors.text } : undefined}
        icon={<IconClock size={18} aria-hidden="true" />}
        people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId}
      />
      <Section
        title="Later"
        tasks={groups.noDate}
        titleClass={activePerson ? "" : "text-[#A09080]"}
        titleStyle={activeColors ? { color: activeColors.text } : undefined}
        icon={<IconLeaf size={18} aria-hidden="true" />}
        people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId}
      />

      {groups.completed.length > 0 && (
        <div className="mt-8 border-t border-[#D4C9B5] pt-5">
          <button
            onClick={() => setShowCompleted(v => !v)}
            aria-expanded={showCompleted}
            className="text-sm text-[#8C7D6A] hover:text-[#3A3228]"
          >
            <span className="inline-flex items-center gap-1">
              {showCompleted ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
              {groups.completed.length} things done
            </span>
          </button>
          {showCompleted && (
            <ul className="mt-2 divide-y divide-[#E4DDD0] opacity-75">
              {groups.completed.map(task => (
                <TaskItem key={task.id} task={task} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
