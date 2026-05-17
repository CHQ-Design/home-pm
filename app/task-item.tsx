"use client"

import { useState } from "react"
import type { Task } from "@prisma/client"
import { toggleTask, deleteTask, updateTask } from "./actions"

const PRIORITY_STYLES: Record<string, string> = {
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

type EditMode = "none" | "inline" | "expanded"

export default function TaskItem({ task }: { task: Task }) {
  const [editMode, setEditMode] = useState<EditMode>("none")
  const [inlineTitle, setInlineTitle] = useState("")
  const [form, setForm] = useState({ title: "", notes: "", dueDate: "", priority: "" })

  function openInline() {
    if (task.completed) return
    setInlineTitle(task.title)
    setEditMode("inline")
  }

  function openExpanded() {
    setForm({
      title: task.title,
      notes: task.notes ?? "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
      priority: task.priority,
    })
    setEditMode(m => (m === "expanded" ? "none" : "expanded"))
  }

  async function saveInline() {
    const trimmed = inlineTitle.trim()
    if (trimmed && trimmed !== task.title) {
      await updateTask(task.id, { title: trimmed })
    }
    setEditMode("none")
  }

  async function saveExpanded() {
    await updateTask(task.id, {
      title: form.title.trim() || task.title,
      notes: form.notes.trim() || null,
      dueDate: form.dueDate ? new Date(form.dueDate) : null,
      priority: form.priority,
    })
    setEditMode("none")
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

        {editMode === "inline" ? (
          <input
            value={inlineTitle}
            onChange={e => setInlineTitle(e.target.value)}
            onBlur={saveInline}
            onKeyDown={e => {
              if (e.key === "Enter") saveInline()
              if (e.key === "Escape") setEditMode("none")
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

        {task.dueDate && editMode !== "inline" && (
          <span className="text-xs text-slate-400 shrink-0">{formatDate(task.dueDate)}</span>
        )}

        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
            PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium
          }`}
        >
          {task.priority}
        </span>

        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={openExpanded}
            className="text-slate-400 hover:text-slate-700 text-sm leading-none"
            title="Edit all fields"
          >
            ✎
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            className="text-slate-400 hover:text-red-500 text-sm leading-none"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {editMode === "expanded" && (
        <div className="ml-7 mt-2 mb-1 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Title"
            className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
          />
          <textarea
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 resize-none"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="text-sm border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
            />
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="text-sm border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveExpanded}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditMode("none")}
              className="text-sm px-3 py-1 text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
