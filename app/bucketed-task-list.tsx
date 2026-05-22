"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Person, Project, Prisma } from "@prisma/client"
import { IconChevronDown, IconChevronRight, IconDots, IconFlame, IconRepeat } from "@tabler/icons-react"
import TaskItem from "./task-item"
import RoutineActionSheet from "./routine-action-sheet"
import type { RoutineVerb } from "./routine-action-sheet"
import UndoToast from "./undo-toast"
import {
  completeRecurringTask, snoozeRoutine, skipRoutine,
  moveRoutineToTodayAction, undoRoutineAction,
} from "./recurring/actions"
import type { ActionSnapshot } from "./recurring/actions"
import { bucketForTask, bucketForRoutine } from "@/lib/bucket"
import { getPersonColor } from "@/lib/person-colors"
import { playCompletionTone } from "@/lib/sounds"
import { todayUTC, todayInTz, endOfWeekStr, utcDateStr, formatTime, formatToastDate } from "@/lib/dates"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true; project: true } }>
type RecurringTask = Prisma.RecurringTaskGetPayload<{ include: { assignee: true } }>

type WrappedItem =
  | { kind: "task"; task: Task }
  | { kind: "routine"; routine: RecurringTask }

const PRIORITY_ORDER: Record<string, number> = { high: 1, medium: 2, low: 3 }

const DRIFT_COLORS = ["#C8A882", "#91B89A", "#C8899A", "#8891B8", "#B0A87A", "#C8922A", "#D4C9B5"]
const KID_BURST_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

function describeCadence(value: number, unit: string): string {
  if (unit === "weekday") return "Mon–Fri"
  if (value === 1) {
    if (unit === "day") return "Daily"
    if (unit === "week") return "Weekly"
    if (unit === "month") return "Monthly"
    if (unit === "year") return "Yearly"
  }
  return `Every ${value} ${unit}s`
}

function itemDueDateStr(item: WrappedItem): string | null {
  if (item.kind === "task") return item.task.dueDate ? utcDateStr(item.task.dueDate) : null
  return utcDateStr(item.routine.nextDue)
}

function itemTime(item: WrappedItem): string | null {
  return item.kind === "task" ? (item.task.time ?? null) : (item.routine.time ?? null)
}

function itemPriorityOrder(item: WrappedItem): number {
  return item.kind === "task" ? (PRIORITY_ORDER[item.task.priority] ?? 2) : 2
}

function itemCreatedAt(item: WrappedItem): number {
  return item.kind === "task"
    ? new Date(item.task.createdAt).getTime()
    : new Date(item.routine.createdAt).getTime()
}

// 6-step sort: dated before undated; date asc; timed before untimed on same date;
// priority desc (high first); createdAt asc as tiebreaker.
function itemCompare(a: WrappedItem, b: WrappedItem): number {
  const aDate = itemDueDateStr(a)
  const bDate = itemDueDateStr(b)
  if (aDate === null && bDate !== null) return 1
  if (aDate !== null && bDate === null) return -1
  if (aDate !== null && bDate !== null && aDate !== bDate) return aDate < bDate ? -1 : 1
  const aTime = itemTime(a)
  const bTime = itemTime(b)
  if (aTime && !bTime) return -1
  if (!aTime && bTime) return 1
  if (aTime && bTime && aTime !== bTime) return aTime < bTime ? -1 : 1
  const ap = itemPriorityOrder(a)
  const bp = itemPriorityOrder(b)
  if (ap !== bp) return ap - bp
  return itemCreatedAt(a) - itemCreatedAt(b)
}

function toastMessage(verb: RoutineVerb, nextDue: string): string {
  const date = formatToastDate(nextDue)
  switch (verb) {
    case "done":          return `Marked done. Next due ${date}.`
    case "snooze":        return `Snoozed until ${date}.`
    case "skip":          return `Skipped this cycle. Next due ${date}.`
    case "move-to-today": return "Moved to today."
  }
}

function KidAllDone({ name, personColor, soundEnabled }: { name: string; personColor: string; soundEnabled: boolean }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    if (soundEnabled) playCompletionTone(null)
  }, [soundEnabled])
  return (
    <div className="py-10 text-center relative overflow-hidden">
      <span className="sr-only" aria-live="polite">All done!</span>
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

export default function BucketedTaskList({
  tasks,
  recurringTasks,
  people,
  projects,
  isAdmin,
  sessionPersonId,
  isKid,
  soundEnabled = true,
  timezone = "America/Los_Angeles",
  filterPersonId: filterPersonIdProp,
  onFilterChange,
}: {
  tasks: Task[]
  recurringTasks: RecurringTask[]
  people: Person[]
  projects: Project[]
  isAdmin: boolean
  sessionPersonId: number | null
  isKid: boolean
  soundEnabled?: boolean
  timezone?: string
  filterPersonId?: number | null
  onFilterChange?: (id: number | null) => void
}) {
  const [today, setToday] = useState(todayUTC())
  const [endOfWeek, setEndOfWeek] = useState(() => endOfWeekStr(timezone))
  useEffect(() => {
    setToday(todayInTz(timezone))
    setEndOfWeek(endOfWeekStr(timezone))
  }, [timezone])

  const [showLater, setShowLater] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [completedPulse, setCompletedPulse] = useState(false)
  const hasExpandedCompleted = useRef(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [boardClearAnnouncement, setBoardClearAnnouncement] = useState("")
  const boardClearCelebrated = useRef(false)

  const [localFilterPersonId, setLocalFilterPersonId] = useState<number | null>(isAdmin ? null : sessionPersonId)
  const filterPersonId = filterPersonIdProp ?? localFilterPersonId
  const setFilterPersonId = onFilterChange ?? setLocalFilterPersonId

  // Routine action state (single open sheet + single toast for all routines)
  const [openSheetRoutine, setOpenSheetRoutine] = useState<RecurringTask | null>(null)
  const [sheetAnchorRect, setSheetAnchorRect] = useState<DOMRect | null>(null)
  const [flashState, setFlashState] = useState<{ id: number; verb: RoutineVerb } | null>(null)
  const [toast, setToast] = useState<{ message: string; undoFn: () => Promise<void> } | null>(null)
  const dotsRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  // ── Filtering ────────────────────────────────────────────────────────────────

  const filteredTasks = filterPersonId === null
    ? tasks
    : tasks.filter(t => t.assigneeId === filterPersonId)

  // Routines with no assignee are shown to everyone when a person filter is active
  const filteredRoutines = filterPersonId === null
    ? recurringTasks
    : recurringTasks.filter(r => r.assigneeId === filterPersonId || r.assigneeId === null)

  // ── Bucketing ────────────────────────────────────────────────────────────────

  const openTasks = filteredTasks.filter(t => !t.completed)
  const completedTasks = filteredTasks.filter(t => t.completed)

  const buckets = useMemo(() => {
    const b: Record<"today" | "thisWeek" | "later", WrappedItem[]> = {
      today: [], thisWeek: [], later: [],
    }
    for (const task of openTasks) {
      b[bucketForTask(task.dueDate, task.priority, today, endOfWeek)].push({ kind: "task", task })
    }
    for (const r of filteredRoutines) {
      b[bucketForRoutine(r.nextDue, today, endOfWeek)].push({ kind: "routine", routine: r })
    }
    b.today.sort(itemCompare)
    b.thisWeek.sort(itemCompare)
    b.later.sort(itemCompare)
    return b
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, filteredRoutines, today, endOfWeek])

  const openItemCount = buckets.today.length + buckets.thisWeek.length + buckets.later.length
  const isBoardClear = openItemCount === 0 && completedTasks.length > 0

  useEffect(() => {
    if (isBoardClear && !boardClearCelebrated.current) {
      boardClearCelebrated.current = true
      setShowCelebration(true)
      setBoardClearAnnouncement("All clear")
      const t = setTimeout(() => setShowCelebration(false), 1500)
      const a = setTimeout(() => setBoardClearAnnouncement(""), 3000)
      return () => { clearTimeout(t); clearTimeout(a) }
    }
    if (!isBoardClear) boardClearCelebrated.current = false
  }, [isBoardClear])

  const personStats = useMemo(() => {
    const map = new Map<number, { open: number; overdue: number }>()
    for (const person of people) {
      const personTasks = tasks.filter(t => t.assigneeId === person.id && !t.completed)
      const overdue = personTasks.filter(t => t.dueDate && utcDateStr(t.dueDate) < today).length
      map.set(person.id, { open: personTasks.length, overdue })
    }
    return map
  }, [tasks, people, today])

  const activePerson = filterPersonId !== null ? people.find(p => p.id === filterPersonId) : null
  const activeColors = filterPersonId !== null ? getPersonColor(people, filterPersonId) : null
  const doneToday = completedTasks.filter(t =>
    t.completedAt && new Date(t.completedAt).toLocaleDateString("en-CA") === today
  ).length

  // ── Routine sheet / action handlers ─────────────────────────────────────────

  function openSheet(routine: RecurringTask, rect: DOMRect) {
    setOpenSheetRoutine(routine)
    setSheetAnchorRect(rect)
  }

  function closeSheet() {
    if (openSheetRoutine) dotsRefs.current.get(openSheetRoutine.id)?.focus()
    setOpenSheetRoutine(null)
    setSheetAnchorRect(null)
  }

  async function handleRoutineAction(verb: RoutineVerb) {
    if (!openSheetRoutine) return
    const routine = openSheetRoutine
    closeSheet()

    let result: { nextDue: string; snapshot: ActionSnapshot }
    if (verb === "done")          result = await completeRecurringTask(routine.id)
    else if (verb === "snooze")   result = await snoozeRoutine(routine.id)
    else if (verb === "skip")     result = await skipRoutine(routine.id)
    else                          result = await moveRoutineToTodayAction(routine.id)

    setFlashState({ id: routine.id, verb })
    setTimeout(() => setFlashState(null), 200)
    setToast({
      message: toastMessage(verb, result.nextDue),
      undoFn: () => undoRoutineAction(routine.id, result.snapshot),
    })
  }

  async function handleUndo() {
    if (!toast) return
    const { undoFn } = toast
    setToast(null)
    await undoFn()
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  function renderItem(item: WrappedItem) {
    if (item.kind === "task") {
      return (
        <TaskItem
          key={`t-${item.task.id}`}
          task={item.task}
          people={people}
          projects={projects}
          isAdmin={isAdmin}
          sessionPersonId={sessionPersonId}
          isKid={isKid}
          soundEnabled={soundEnabled}
          filterPersonId={filterPersonId}
        />
      )
    }

    const r = item.routine
    const canAct = isAdmin || r.assigneeId === sessionPersonId
    const isFlash = flashState?.id === r.id
    const flashCls = isFlash
      ? `row-flash-${flashState!.verb === "move-to-today" ? "move" : flashState!.verb}`
      : ""

    return (
      <li key={`r-${r.id}`} className={`flex items-center gap-3 py-2.5 px-3 ${flashCls}`}>
        <div className="flex-1 min-w-0">
          <span className={`${isKid ? "text-xl" : "text-sm"} text-foreground`}>{r.title}</span>
          {!isKid && (
            <>
              <span aria-hidden="true" className="ml-1.5 text-text-faint">
                <IconRepeat size={11} className="inline" aria-hidden="true" />
              </span>
              {r.time && (
                <span aria-hidden="true" className="ml-2 text-xs text-text-muted">{formatTime(r.time)}</span>
              )}
              {r.assignee && (
                <span aria-hidden="true" className="ml-2 text-xs text-text-faint">{r.assignee.name}</span>
              )}
            </>
          )}
        </div>
        {canAct && (
          <button
            ref={el => { if (el) dotsRefs.current.set(r.id, el); else dotsRefs.current.delete(r.id) }}
            onClick={e => openSheet(r, e.currentTarget.getBoundingClientRect())}
            aria-label={`More options for ${r.title}`}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] text-text-faint hover:text-foreground hover:bg-surface-hover rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 shrink-0"
          >
            <IconDots size={18} aria-hidden="true" />
          </button>
        )}
      </li>
    )
  }

  // ── Layout ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{boardClearAnnouncement}</span>

      {/* Person filter pills — admin only */}
      {isAdmin && people.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setFilterPersonId(null)}
            aria-pressed={filterPersonId === null}
            aria-label="Show everyone's things"
            className={`text-xs px-4 rounded-full transition-colors touch-manipulation min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 inline-flex items-center gap-1.5 ${
              filterPersonId === null
                ? "bg-accent text-white font-medium"
                : "bg-surface text-text-hover border border-border-chip hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            Everyone
          </button>
          {people.map(p => {
            const isActive = filterPersonId === p.id
            const colors = getPersonColor(people, p.id)
            const stats = personStats.get(p.id)
            return (
              <button
                key={p.id}
                onClick={() => setFilterPersonId(p.id)}
                aria-pressed={isActive}
                aria-label={`Show ${p.name}'s things${p.streakCount >= 2 ? ` — ${p.streakCount} day streak` : ""}`}
                className="text-xs pl-1.5 pr-3 rounded-full transition-colors touch-manipulation border font-medium flex items-center gap-1.5 min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                style={isActive
                  ? { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }
                  : { backgroundColor: "var(--color-surface)", color: "var(--color-text-hover)", borderColor: "var(--color-border-chip)" }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold leading-none shrink-0"
                  style={{ backgroundColor: colors.border, color: "white" }}
                >
                  {p.name[0]}
                </span>
                {p.name}
                {stats?.overdue ? (
                  <span className="text-[10px] text-warm-text">{stats.overdue} late</span>
                ) : null}
                {p.streakCount >= 2 && (
                  <span className="text-[10px] ml-0.5 inline-flex items-center gap-0.5" aria-label={`${p.streakCount} day streak`}>
                    <IconFlame size={10} aria-hidden="true" />{p.streakCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Active person header */}
      {isAdmin && activePerson && activeColors && (
        <div className="mb-4">
          <p className="font-serif text-xl font-bold" style={{ color: activeColors.text }}>
            {activePerson.name}'s Things
          </p>
          {doneToday > 0 && (
            <p className="font-serif text-sm mt-0.5 text-accent-hover">
              {doneToday} {doneToday === 1 ? "thing" : "things"} done today. Nice work, {activePerson.name}.
            </p>
          )}
        </div>
      )}
      {!isAdmin && doneToday > 0 && activePerson && activeColors && (
        <p className="font-serif text-sm mb-4 text-accent-hover">
          {doneToday} {doneToday === 1 ? "thing" : "things"} done today.
        </p>
      )}

      {/* Kid progress bar */}
      {isKid && filteredTasks.length > 0 && !isBoardClear && (
        <div className="mb-5">
          <div className="w-full h-4 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-warm rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.round((completedTasks.length / filteredTasks.length) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-text-muted mt-1.5">{completedTasks.length} of {filteredTasks.length} done</p>
        </div>
      )}

      {/* Kid all-done */}
      {isKid && isBoardClear && (
        <KidAllDone
          name={activePerson?.name ?? "you"}
          personColor={activeColors?.border ?? "var(--color-accent)"}
          soundEnabled={soundEnabled}
        />
      )}

      {/* All-empty state (no tasks or routines at all) */}
      {!isKid && openItemCount === 0 && completedTasks.length === 0 && (
        !isAdmin ? (
          <div className="py-10 text-center">
            <span className="block font-serif text-4xl text-text-faint mb-3" aria-hidden="true">✦</span>
            <p className="font-serif text-lg text-text-muted">You're all clear. Nice work.</p>
          </div>
        ) : (
          <div className="py-10 text-center">
            <span className="block font-serif text-4xl text-text-faint mb-3" aria-hidden="true">✦</span>
            <p className="font-serif text-lg text-text-muted">Nothing here yet.</p>
            <p className="text-sm text-text-secondary mt-1">Add the first thing below.</p>
          </div>
        )
      )}
      {isKid && openItemCount === 0 && completedTasks.length === 0 && (
        <div className="py-10 text-center">
          <span className="text-5xl" aria-hidden="true">🌟</span>
          <p className="font-serif text-2xl font-bold text-foreground mt-3">Nothing to do!</p>
        </div>
      )}

      {/* Board clear */}
      {!isKid && isBoardClear && (
        <div className="py-12 text-center relative">
          {showCelebration && (
            <>
              <div className="fixed inset-0 pointer-events-none z-0" style={{ animation: "board-clear-wash 1.5s ease-out both" }} />
              {DRIFT_COLORS.map((color, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="fixed font-serif text-4xl pointer-events-none z-10"
                  style={{ color, left: `${8 + i * 13}%`, top: "50%", animationDelay: `${i * 0.1}s`, animation: `drift-up 1.5s ease-out ${i * 0.1}s both` }}
                >
                  ✦
                </span>
              ))}
            </>
          )}
          <span aria-hidden="true" className={`block font-serif text-border-card mb-4 leading-none transition-all duration-500 ${showCelebration ? "text-6xl" : "text-4xl"}`}>✦</span>
          <p className={`font-serif text-text-muted transition-all duration-500 ${showCelebration ? "text-3xl" : "text-xl"}`} suppressHydrationWarning>
            {([
              "The board's clear.",
              "Everything's handled.",
              `All done! ${completedTasks.length} ${completedTasks.length === 1 ? "thing" : "things"} done. The day is yours.`,
            ])[new Date().getDay() % 3]}
          </p>
        </div>
      )}

      {/* ── Today bucket ────────────────────────────────────────────────────── */}
      {!isBoardClear && (
        <section aria-labelledby="bucket-today" className="mb-2">
          <h2 id="bucket-today" className="font-serif text-xl text-foreground mb-2 mt-6 first:mt-0">
            Today
          </h2>
          {buckets.today.length === 0 ? (
            <p className="text-sm text-text-muted py-1">
              {activePerson ? `Nothing critical today for ${activePerson.name}.` : "Nothing critical today."}
            </p>
          ) : (
            <ul className="space-y-1">
              {buckets.today.map(renderItem)}
            </ul>
          )}
        </section>
      )}

      {/* ── This week bucket ─────────────────────────────────────────────────── */}
      {!isBoardClear && buckets.thisWeek.length > 0 && (
        <>
          <hr className="border-border-subtle my-6" aria-hidden="true" />
          <section aria-labelledby="bucket-thisweek">
            <h2 id="bucket-thisweek" className="font-serif text-lg text-foreground mb-2">
              This week
            </h2>
            <ul className="space-y-1">
              {buckets.thisWeek.map(renderItem)}
            </ul>
          </section>
        </>
      )}

      {/* ── Later bucket ─────────────────────────────────────────────────────── */}
      {!isBoardClear && buckets.later.length > 0 && (
        <>
          <hr className="border-border-subtle my-6" aria-hidden="true" />
          <section aria-labelledby="bucket-later">
            <h2>
              <button
                id="bucket-later"
                onClick={() => setShowLater(v => !v)}
                aria-expanded={showLater}
                aria-controls="later-list"
                className="min-h-[44px] inline-flex items-center gap-1.5 font-serif text-base text-text-muted hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                {showLater ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
                Later ({buckets.later.length})
              </button>
            </h2>
            {showLater && (
              <ul id="later-list" className="space-y-1 mt-2">
                {buckets.later.map(renderItem)}
              </ul>
            )}
          </section>
        </>
      )}

      {/* ── Completed section ─────────────────────────────────────────────────── */}
      {completedTasks.length > 0 && (
        <div className="mt-8 border-t border-border-card pt-5">
          <h2>
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
            aria-label={
              showCompleted
                ? `Hide completed items`
                : `Show ${completedTasks.length} completed items`
            }
            className="min-h-[44px] inline-flex items-center text-sm text-text-secondary hover:text-foreground rounded-md px-1"
            style={completedPulse ? { animation: "warm-pulse 600ms ease-out" } : undefined}
          >
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              {showCompleted ? <IconChevronDown size={14} aria-hidden="true" /> : <IconChevronRight size={14} aria-hidden="true" />}
              {completedTasks.length}{" "}
              {completedTasks.length === 1 ? "thing" : "things"} done. Nice work.
            </span>
          </button>
          </h2>
          {showCompleted && (
            <ul className="mt-2 space-y-1">
              {completedTasks.map(task => (
                <TaskItem key={`t-${task.id}`} task={task} people={people} projects={projects} isAdmin={isAdmin} sessionPersonId={sessionPersonId} isKid={isKid} soundEnabled={soundEnabled} filterPersonId={filterPersonId} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Routine action sheet */}
      {openSheetRoutine && (
        <RoutineActionSheet
          taskTitle={openSheetRoutine.title}
          nextDue={openSheetRoutine.nextDue}
          today={today}
          anchorRect={sheetAnchorRect}
          onAction={handleRoutineAction}
          onClose={closeSheet}
        />
      )}

      {/* Undo toast */}
      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
