"use client"

import { useEffect, useRef, useState } from "react"
import type { Person, Project, Prisma } from "@prisma/client"
import { IconAlertTriangle, IconChevronDown, IconChevronRight, IconClock, IconLeaf, IconStar, IconSun } from "@tabler/icons-react"
import TaskItem from "./task-item"
import { todayUTC, todayLocal, utcDateStr } from "@/lib/dates"
import { getPersonColor } from "@/lib/person-colors"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>

const PRIORITY_ORDER: Record<string, number> = { high: 1, medium: 2, low: 3 }

function byPriority(a: Task, b: Task) {
  const p = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
  if (p !== 0) return p
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function byDateThenPriority(a: Task, b: Task) {
  if (a.dueDate && b.dueDate) {
    const d = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    if (d !== 0) return d
  }
  const p = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
  if (p !== 0) return p
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function groupTasks(tasks: Task[], today: string) {
  const open = tasks.filter(t => !t.completed)
  return {
    overdue:   open.filter(t => t.dueDate && utcDateStr(t.dueDate) < today).sort(byDateThenPriority),
    today:     open.filter(t => t.dueDate && utcDateStr(t.dueDate) === today).sort(byDateThenPriority),
    upcoming:  open.filter(t => t.dueDate && utcDateStr(t.dueDate) > today).sort(byDateThenPriority),
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

const DRIFT_COLORS = ["#C8A882", "#91B89A", "#C8899A", "#8891B8", "#B0A87A", "#C8922A", "#D4C9B5"]

type Props = { tasks: Task[]; people: Person[]; projects: Project[]; isAdmin: boolean; sessionPersonId: number | null }

export default function TaskList({ tasks, people, projects, isAdmin, sessionPersonId }: Props) {
  const [showCompleted, setShowCompleted] = useState(false)
  const [completedPulse, setCompletedPulse] = useState(false)
  const hasExpandedCompleted = useRef(false)
  const [filterPersonId, setFilterPersonId] = useState<number | null>(isAdmin ? null : sessionPersonId)
  const boardClearCelebrated = useRef(false)
  const [showCelebration, setShowCelebration] = useState(false)
  // Start with UTC so SSR and initial client render match; update to local after mount
  const [today, setToday] = useState(todayUTC())
  useEffect(() => { setToday(todayLocal()) }, [])

  const filtered = filterPersonId === null
    ? tasks
    : tasks.filter(t => t.assigneeId === filterPersonId)

  const groups = groupTasks(filtered, today)
  const openCount =
    groups.overdue.length + groups.today.length + groups.upcoming.length + groups.noDate.length

  const activePerson   = filterPersonId !== null ? people.find(p => p.id === filterPersonId) : null
  const activeColors   = filterPersonId !== null ? getPersonColor(people, filterPersonId) : null
  const doneToday      = groups.completed.filter(t =>
    t.completedAt && new Date(t.completedAt).toLocaleDateString("en-CA") === today
  ).length
  const isBoardClear = openCount === 0 && groups.completed.length > 0

  useEffect(() => {
    if (isBoardClear && !boardClearCelebrated.current) {
      boardClearCelebrated.current = true
      setShowCelebration(true)
      const t = setTimeout(() => setShowCelebration(false), 1500)
      return () => clearTimeout(t)
    }
    if (!isBoardClear) {
      boardClearCelebrated.current = false
    }
  }, [isBoardClear])

  return (
    <div>
      {isAdmin && people.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterPersonId(null)}
            aria-pressed={filterPersonId === null}
            aria-label="Show everyone's things"
            className={`text-xs px-4 rounded-full transition-colors touch-manipulation min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
              filterPersonId === null
                ? "bg-accent text-white font-medium"
                : "bg-[#EDE6D8] text-[#6B5E52] border border-[#C8BFAD] hover:bg-[#E4DBD0] hover:text-[#3A3228]"
            }`}
          >
            Everyone
          </button>
          {people.map(p => {
            const isActive = filterPersonId === p.id
            const colors = getPersonColor(people, p.id)
            return (
              <button
                key={p.id}
                onClick={() => setFilterPersonId(p.id)}
                aria-pressed={isActive}
                aria-label={`Show ${p.name}'s things`}
                className="text-xs pl-1.5 pr-3 rounded-full transition-colors touch-manipulation border font-medium flex items-center gap-1.5 min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
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
                {p.streakCount >= 2 && (
                  <span className="text-[10px] ml-0.5" aria-label={`${p.streakCount} day streak`}>
                    🔥{p.streakCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {isAdmin && activePerson && activeColors && (
        <div className="mb-4">
          <p className="font-serif text-xl font-bold" style={{ color: activeColors.text }}>
            {activePerson.name}'s Things
          </p>
          {doneToday > 0 && (
            <p className="font-serif text-sm mt-0.5 text-accent">
              {doneToday} {doneToday === 1 ? "thing" : "things"} handled today.
            </p>
          )}
        </div>
      )}
      {!isAdmin && doneToday > 0 && activePerson && activeColors && (
        <p className="font-serif text-sm mb-4 text-accent">
          {doneToday} {doneToday === 1 ? "thing" : "things"} handled today.
        </p>
      )}

      {openCount === 0 && groups.completed.length === 0 && (
        <p className="text-[#A09080] text-sm py-4">
          {!isAdmin
            ? "Nothing on your list right now."
            : filterPersonId !== null
              ? `No things for ${activePerson?.name}.`
              : "No things yet. Add one above."}
        </p>
      )}
      {isBoardClear && (
        <div className="py-12 text-center relative">
          {showCelebration && (
            <>
              <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{ animation: "board-clear-wash 1.5s ease-out both" }}
              />
              {DRIFT_COLORS.map((color, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="fixed font-serif text-4xl pointer-events-none z-10"
                  style={{
                    color,
                    left: `${8 + i * 13}%`,
                    top: "50%",
                    animationDelay: `${i * 0.1}s`,
                    animation: `drift-up 1.5s ease-out ${i * 0.1}s both`,
                  }}
                >
                  ✦
                </span>
              ))}
            </>
          )}
          <span
            aria-hidden="true"
            className={`block font-serif text-[#D4C9B5] mb-4 leading-none transition-all duration-500 ${showCelebration ? "text-6xl" : "text-4xl"}`}
          >
            ✦
          </span>
          <p className={`font-serif text-[#A09080] transition-all duration-500 ${showCelebration ? "text-3xl" : "text-xl"}`} suppressHydrationWarning>
            {(["The board's clear.", "Everything's handled.", "Nothing left on the board."])[new Date().getDay() % 3]}
          </p>
        </div>
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
        title="No rush"
        tasks={groups.noDate}
        titleClass={activePerson ? "" : "text-[#A09080]"}
        titleStyle={activeColors ? { color: activeColors.text } : undefined}
        icon={<IconLeaf size={18} aria-hidden="true" />}
        people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId}
      />

      {groups.completed.length > 0 && (
        <div className="mt-8 border-t border-[#D4C9B5] pt-5">
          <button
            onClick={() => {
              if (!showCompleted && !hasExpandedCompleted.current) {
                hasExpandedCompleted.current = true
                setCompletedPulse(true)
                setTimeout(() => setCompletedPulse(false), 600)
              }
              setShowCompleted(v => !v)
            }}
            aria-expanded={showCompleted}
            className="min-h-[44px] inline-flex items-center text-sm text-[#8C7D6A] hover:text-[#3A3228] rounded-md px-1"
            style={completedPulse ? { animation: "warm-pulse 600ms ease-out" } : undefined}
          >
            <span className="inline-flex items-center gap-1">
              {showCompleted ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
              {groups.completed.length} things handled
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
