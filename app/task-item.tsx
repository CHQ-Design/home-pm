"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import type { Person, Prisma } from "@prisma/client"
import { toggleTask, toggleReminder, updateTask } from "./actions"
import TaskEditModal from "./task-edit-modal"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true } }>
type Priority = "high" | "medium" | "low"

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-[#C8922A]/20 text-[#D4A035]",
  medium: "",
  low: "bg-stone-800 text-stone-400 border border-stone-600",
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export default function TaskItem({ task, people }: { task: Task; people: Person[] }) {
  const [isInlineEditing, setIsInlineEditing] = useState(false)
  const [inlineTitle, setInlineTitle] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)

  function openInline() {
    if (task.completed) return
    setInlineTitle(task.title)
    setIsInlineEditing(true)
  }

  async function saveInline() {
    setIsInlineEditing(false)
    const trimmed = inlineTitle.trim()
    if (trimmed && trimmed !== task.title) {
      await updateTask(task.id, { title: trimmed })
    }
  }

  return (
    <li className="group">
      <div className="flex items-center gap-2 min-h-[44px]">
        {/* 44px touch target wrapping the visual checkbox */}
        <label className="shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => toggleTask(task.id)}
            aria-label={task.title}
            className="h-4 w-4 rounded border-stone-600 cursor-pointer"
            style={{ accentColor: "#C8922A" }}
          />
        </label>

        {isInlineEditing ? (
          <input
            value={inlineTitle}
            onChange={e => setInlineTitle(e.target.value)}
            onBlur={saveInline}
            onKeyDown={e => {
              if (e.key === "Enter") saveInline()
              if (e.key === "Escape") setIsInlineEditing(false)
            }}
            className="flex-1 text-sm border-b border-accent outline-none bg-transparent py-0.5 text-stone-100"
            autoFocus
          />
        ) : (
          <span
            onClick={openInline}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openInline() } }}
            role="button"
            tabIndex={task.completed ? -1 : 0}
            className={`flex-1 text-sm ${
              task.completed
                ? "line-through text-stone-400"
                : "cursor-pointer text-stone-200 hover:text-accent focus-visible:outline-none focus-visible:text-accent"
            }`}
          >
            {task.title}
          </span>
        )}

        {task.assignee && !isInlineEditing && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-400 shrink-0">
            {task.assignee.name}
          </span>
        )}

        {task.dueDate && !isInlineEditing && (
          <span className="text-xs text-stone-500 shrink-0">{formatDate(task.dueDate)}</span>
        )}

        {task.priority !== "medium" && !isInlineEditing && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
              PRIORITY_STYLES[task.priority as Priority] ?? PRIORITY_STYLES.low
            }`}
          >
            {task.priority}
          </span>
        )}

        {/* Bell with 44px touch target */}
        <button
          onClick={() => toggleReminder(task.id)}
          className={`flex items-center justify-center min-h-[44px] min-w-[44px] text-sm leading-none shrink-0 transition-colors ${
            task.reminderSet
              ? "text-accent"
              : "text-stone-500 group-hover:text-stone-300"
          }`}
          aria-label={task.reminderSet ? "Edit reminder" : "Add reminder"}
        >
          🔔
        </button>

        {/* Edit with 44px touch target */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] text-stone-500 text-sm leading-none shrink-0 group-hover:text-stone-300 transition-colors"
          aria-label="Edit task"
        >
          ✎
        </button>
      </div>

      {isModalOpen && createPortal(
        <TaskEditModal
          task={task}
          people={people}
          onClose={() => setIsModalOpen(false)}
        />,
        document.body
      )}
    </li>
  )
}
