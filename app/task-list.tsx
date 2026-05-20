"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Person, Project, Prisma } from "@prisma/client"
import { IconAlertTriangle, IconChevronDown, IconChevronRight, IconClock, IconLeaf, IconStar, IconSun } from "@tabler/icons-react"
import TaskItem from "./task-item"
import { todayUTC, todayLocal, utcDateStr } from "@/lib/dates"
import { getPersonColor } from "@/lib/person-colors"
import { playCompletionTone } from "@/lib/sounds"

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
  // same date — sort by time (nulls last), then priority
  if (a.time !== b.time) {
    if (!a.time) return 1
    if (!b.time) return -1
    return a.time.localeCompare(b.time)
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
  title, tasks, titleClass, titleStyle, people, projects, icon, isAdmin, sessionPersonId, isKid, currentProjectId,
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
  isKid: boolean
  currentProjectId?: number
}) {
  if (tasks.length === 0) return null
  const headingId = `heading-${title.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <section className="mt-6 mb-4" aria-labelledby={headingId}>
      <h2 id={headingId} className={`flex items-center gap-1.5 font-serif text-xl mb-2 ${titleClass}`} style={titleStyle}>
        {icon}
        {title}
      </h2>
      <ul className="space-y-1">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={isKid} currentProjectId={currentProjectId} />
        ))}
      </ul>
    </section>
  )
}

const DRIFT_COLORS = ["#C8A882", "#91B89A", "#C8899A", "#8891B8", "#B0A87A", "#C8922A", "#D4C9B5"]

const KID_BURST_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

function KidAllDone({ name, personColor }: { name: string; personColor: string }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    playCompletionTone(null)
  }, [])
  return (
    <div className="py-10 text-center relative overflow-hidden">
      <div className="relative inline-block mb-4">
        <span className="text-6xl" aria-hidden="true">🎉</span>
        {KID_BURST_ANGLES.map(angle => (
          <span
            key={angle}
            aria-hidden="true"
            className="absolute h-2.5 w-2.5 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              backgroundColor: personColor,
              ["--angle" as string]: `${angle}deg`,
              animation: "particle-burst-kid 1000ms cubic-bezier(0.22,1,0.36,1) both",
            }}
          />
        ))}
      </div>
      <p className="font-serif text-3xl font-bold text-foreground mb-1">You did it, {name}!</p>
      <p className="text-base text-text-muted">All done for today.</p>
    </div>
  )
}

type Props = { tasks: Task[]; people: Person[]; projects: Project[]; isAdmin: boolean; sessionPersonId: number | null; isKid: boolean; currentProjectId?: number }

export default function TaskList({ tasks, people, projects, isAdmin, sessionPersonId, isKid, currentProjectId }: Props) {
  const [showCompleted, setShowCompleted] = useState(false)
  const [completedPulse, setCompletedPulse] = useState(false)
  const hasExpandedCompleted = useRef(false)
  const [filterPersonId, setFilterPersonId] = useState<number | null>(isAdmin ? null : sessionPersonId)
  const boardClearCelebrated = useRef(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [boardClearAnnouncement, setBoardClearAnnouncement] = useState("")
  // Start with UTC so SSR and initial client render match; update to local after mount
  const [today, setToday] = useState(todayUTC())
  useEffect(() => { setToday(todayLocal()) }, [])

  const personStats = useMemo(() => {
    const map = new Map<number, { open: number; overdue: number }>()
    for (const person of people) {
      const personTasks = tasks.filter(t => t.assigneeId === person.id && !t.completed)
      const overdue = personTasks.filter(t => t.dueDate && utcDateStr(t.dueDate) < today).length
      map.set(person.id, { open: personTasks.length, overdue })
    }
    return map
  }, [tasks, people, today])

  const totalOpen = useMemo(() => tasks.filter(t => !t.completed).length, [tasks])

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
      setBoardClearAnnouncement("All clear")
      const t = setTimeout(() => setShowCelebration(false), 1500)
      const a = setTimeout(() => setBoardClearAnnouncement(""), 3000)
      return () => { clearTimeout(t); clearTimeout(a) }
    }
    if (!isBoardClear) {
      boardClearCelebrated.current = false
    }
  }, [isBoardClear])

  return (
    <div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{boardClearAnnouncement}</span>
      {isAdmin && people.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterPersonId(null)}
            aria-pressed={filterPersonId === null}
            aria-label="Show everyone's things"
            className={`text-xs px-4 rounded-full transition-colors touch-manipulation min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 inline-flex items-center gap-1.5 ${
              filterPersonId === null
                ? "bg-accent text-white font-medium"
                : "bg-surface text-text-hover border border-border-chip hover:bg-[#E4DBD0] hover:text-foreground"
            }`}
          >
            Everyone
            {totalOpen > 0 && <span className="text-[10px] opacity-70">{totalOpen}</span>}
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
                  : { backgroundColor: "var(--color-surface)", color: "var(--color-text-hover)", borderColor: "var(--color-border-chip)" }
                }
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold leading-none shrink-0"
                  style={{ backgroundColor: colors.border, color: "white" }}
                >
                  {p.name[0]}
                </span>
                {p.name}
                {(() => {
                  const stats = personStats.get(p.id)
                  if (!stats || stats.open === 0) return null
                  return (
                    <>
                      <span className="text-[10px] opacity-70">{stats.open}</span>
                      {stats.overdue > 0 && (
                        <span className="text-[10px] text-warm-text">{stats.overdue} late</span>
                      )}
                    </>
                  )
                })()}
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

      {isKid && filtered.length > 0 && !isBoardClear && (
        <div className="mb-5">
          <div className="w-full h-4 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-warm rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.round((groups.completed.length / filtered.length) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-text-muted mt-1.5">
            {groups.completed.length} of {filtered.length} done
          </p>
        </div>
      )}

      {isKid && isBoardClear && (
        <KidAllDone
          name={activePerson?.name ?? "you"}
          personColor={activeColors?.border ?? "#6B7A5A"}
        />
      )}

      {!isKid && openCount === 0 && groups.completed.length === 0 && (
        !isAdmin ? (
          <div className="py-10 text-center">
            <span className="block font-serif text-4xl text-text-faint mb-3" aria-hidden="true">✦</span>
            <p className="font-serif text-lg text-text-muted">You're all clear.</p>
            <p className="text-sm text-text-faint mt-1">Nothing on your list right now.</p>
          </div>
        ) : filterPersonId !== null ? (
          <div className="py-8 text-center">
            <p className="font-serif text-base text-text-muted">Nothing for {activePerson?.name} right now.</p>
          </div>
        ) : (
          <div className="py-10 text-center">
            <span className="block font-serif text-4xl text-text-faint mb-3" aria-hidden="true">✦</span>
            <p className="font-serif text-lg text-text-muted">Nothing here yet.</p>
            <p className="text-sm text-text-faint mt-1">Add the first thing below.</p>
          </div>
        )
      )}
      {isKid && openCount === 0 && groups.completed.length === 0 && (
        <div className="py-10 text-center">
          <span className="text-5xl" aria-hidden="true">🌟</span>
          <p className="font-serif text-2xl font-bold text-foreground mt-3">Nothing to do!</p>
        </div>
      )}
      {!isKid && isBoardClear && (
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
            className={`block font-serif text-border-card mb-4 leading-none transition-all duration-500 ${showCelebration ? "text-6xl" : "text-4xl"}`}
          >
            ✦
          </span>
          <p className={`font-serif text-text-muted transition-all duration-500 ${showCelebration ? "text-3xl" : "text-xl"}`} suppressHydrationWarning>
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
        people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={isKid} currentProjectId={currentProjectId}
      />
      <Section
        title="Today"
        tasks={groups.today}
        titleClass={activePerson ? "" : "text-accent"}
        titleStyle={activeColors ? { color: activeColors.text } : undefined}
        icon={<IconSun size={18} aria-hidden="true" />}
        people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={isKid} currentProjectId={currentProjectId}
      />
      <Section
        title="Coming up"
        tasks={groups.upcoming}
        titleClass={activePerson ? "" : "text-text-secondary"}
        titleStyle={activeColors ? { color: activeColors.text } : undefined}
        icon={<IconClock size={18} aria-hidden="true" />}
        people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={isKid} currentProjectId={currentProjectId}
      />
      <Section
        title="No rush"
        tasks={groups.noDate}
        titleClass={activePerson ? "" : "text-text-muted"}
        titleStyle={activeColors ? { color: activeColors.text } : undefined}
        icon={<IconLeaf size={18} aria-hidden="true" />}
        people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={isKid} currentProjectId={currentProjectId}
      />

      {groups.completed.length > 0 && (
        <div className="mt-8 border-t border-border-card pt-5">
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
            aria-label={showCompleted ? `Hide ${groups.completed.length} completed ${groups.completed.length === 1 ? "task" : "tasks"}` : `Show ${groups.completed.length} completed ${groups.completed.length === 1 ? "task" : "tasks"}`}
            className="min-h-[44px] inline-flex items-center text-sm text-text-secondary hover:text-foreground rounded-md px-1"
            style={completedPulse ? { animation: "warm-pulse 600ms ease-out" } : undefined}
          >
            <span className="inline-flex items-center gap-1">
              {showCompleted ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
              {groups.completed.length} things handled
            </span>
          </button>
          {showCompleted && (
            <ul className="mt-2 space-y-1">
              {groups.completed.map(task => (
                <TaskItem key={task.id} task={task} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={isKid} currentProjectId={currentProjectId} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
