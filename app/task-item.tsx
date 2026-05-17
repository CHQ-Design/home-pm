"use client"

import { useState } from "react"
import type { Person, Prisma } from "@prisma/client"
import { toggleTask, toggleReminder, updateTask } from "./actions"
import TaskEditModal from "./task-edit-modal"

type Task = Prisma.TaskGetPayload<{ include: { assignee: true } }>

type Priority = "high" | "medium" | "low"

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-500",
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
    setIsInlineEditing(false) // set first so onBlur after Enter is a no-op
    const trimmed = inlineTitle.trim()
    if (trimmed && trimmed !== task.title) {
      await updateTask(task.id, { title: trimmed })
    }
  }

  return (
    <li className="group py-2">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => toggleTask(task.id)}
          className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 cursor-pointer"
        />

        {isInlineEditing ? (
          <input
            value={inlineTitle}
            onChange={e => setInlineTitle(e.target.value)}
            onBlur={saveInline}
            onKeyDown={e => {
              if (e.key === "Enter") saveInline()
              if (e.key === "Escape") setIsInlineEditing(false)
            }}
            className="flex-1 text-sm border-b border-blue-400 outline-none bg-transparent py-0.5"
            autoFocus
          />
        ) : (
          <span
            onClick={openInline}
            className={`flex-1 text-sm ${
              task.completed
                ? "line-through text-slate-400"
                : "cursor-pointer hover:text-blue-600"
            }`}
          >
            {task.title}
          </span>
        )}

        {task.assignee && !isInlineEditing && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
            {task.assignee.name}
          </span>
        )}

        {task.dueDate && !isInlineEditing && (
          <span className="text-xs text-slate-400 shrink-0">{formatDate(task.dueDate)}</span>
        )}

        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
            PRIORITY_STYLES[task.priority as Priority] ?? PRIORITY_STYLES.medium
          }`}
        >
          {task.priority}
        </span>

        <button
          onClick={() => toggleReminder(task.id)}
          className={`text-sm leading-none shrink-0 transition-opacity ${
            task.reminderSet
              ? "opacity-100 text-amber-500"
              : "opacity-0 group-hover:opacity-40 hover:!opacity-100"
          }`}
          title={task.reminderSet ? "Remove reminder" : "Set reminder"}
        >
          🔔
        </button>

        <button
          onClick={() => setIsModalOpen(true)}
          className="text-slate-400 text-sm leading-none shrink-0 opacity-30 group-hover:opacity-100 transition-opacity hover:text-slate-200"
          title="Edit task"
        >
          ✎
        </button>
      </div>

      {isModalOpen && (
        <TaskEditModal
          task={task}
          people={people}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </li>
  )
}
