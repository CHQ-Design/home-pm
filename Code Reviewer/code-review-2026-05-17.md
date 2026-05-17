# Full Codebase Review — Home PM
**Date:** 2026-05-17

---

## Verdict: Approve with minor changes

This is genuinely good work for a personal app at this stage. The server/client boundary is used correctly throughout, actions are clean, the UI is polished without being bloated, and the data model is minimal. There are a few correctness and type hygiene issues worth fixing, and one meaningful simplification to consider.

---

## Must Fix

### 1. Null crash in `addTask`

`app/actions.ts`, line 14:

```ts
const title = (formData.get("title") as string).trim()
```

If the `title` field is missing from the form (malformed submission), `formData.get("title")` returns `null`. Casting `null as string` doesn't prevent the runtime `.trim()` call — it throws. The same pattern exists on line 78 (`addPerson`).

**Minimal fix:**

```ts
const title = ((formData.get("title") as string) ?? "").trim()
if (!title) return
```

---

### 2. `sessionStorage` read in `useState` initializer — hydration mismatch

`app/add-task-form.tsx`, lines 21–23:

```ts
const [showMore, setShowMore] = useState(() =>
  typeof window !== "undefined" && sessionStorage.getItem("addTaskShowMore") === "true"
)
```

"use client" components are still server-rendered for initial HTML. The server evaluates this as `false` (window undefined). On the client during hydration, React re-runs the initializer and may get `true` from sessionStorage — React will log a hydration mismatch warning or silently misfire.

**Minimal fix:** Move the sessionStorage read to a `useEffect`:

```ts
const [showMore, setShowMore] = useState(false)

useEffect(() => {
  setShowMore(sessionStorage.getItem("addTaskShowMore") === "true")
}, [])
```

This means the panel starts collapsed on page load even if you had it open before, but there's no flicker or hydration warning.

---

## Security

**Watch later — `/api/calendar` is a public, unauthenticated endpoint.**

The iCal feed at `/api/calendar` returns all incomplete tasks with their titles, notes, assignees, and due dates. Right now it's fine (local dev, personal app). But once this is deployed anywhere — even just on your home network — anyone who finds the URL gets a full data export. No auth is in scope yet, but put a note somewhere so you don't forget to protect this before sharing the app.

**Watch later — `updateTask` and `updateProject` don't validate foreign keys.**

Passing `assigneeId: 99999` to `updateTask` will throw a Prisma foreign key error, not return a clean validation message. Fine for solo use, but worth knowing.

---

## Simplify

### `reminderSet` is dead state

The schema has `reminderSet Boolean @default(false)`. The `toggleReminder` action toggles it. The bell renders in the UI. But nothing actually uses it — not the iCal feed, not any notification mechanism. You're tracking a preference with no effect.

Options: either remove `reminderSet` from the schema now and re-add it when you actually build reminder functionality, or at least add a `// TODO: wire this to actual notifications` comment so it doesn't look like finished work. Carrying dead state in the schema creates confusion later.

### `date-picker.tsx` is 159 lines for a feature `<input type="date">` already provides

The add-task form uses a native date input (simple, works great). The edit modal uses the custom `DatePicker` component with `react-day-picker`. The calendar picker does look nicer and has better cross-browser consistency, but it's a significant chunk of complexity to maintain. Worth being intentional about whether the UX improvement is worth the code cost. `react-day-picker` is already installed so this is done — just flagging for awareness.

---

## Best-Practice Notes

**`updateProject` uses `string` where it should use `Status`.**

In `app/projects/actions.ts`, the function signature accepts `status?: string` instead of `status?: Status`. The local `Status` type is already defined but not applied here. Compare to `updateTask` in `actions.ts` which correctly uses `Priority`. One-line fix:

```ts
data: { name?: string; description?: string | null; status?: Status }
```

---

**`PersonWithCount` type definition in `people-manager.tsx` doesn't match the query.**

The component defines:

```ts
type PersonWithCount = Prisma.PersonGetPayload<{
  include: { _count: { select: { tasks: true } } }
}>
```

But `page.tsx` queries with `{ where: { completed: false } }` on the count, so the runtime data is "count of incomplete tasks." The TypeScript type says "count of all tasks." They both produce a number so no crash, but if you later use that count for logic elsewhere you'll get surprised. Fix the type in `people-manager.tsx` to match what's actually fetched.

---

**`ProjectStatusSelect` has no error handling.**

If `updateProject` throws, `isPending` resets to false, the select snaps back to the old UI value, and the user has no idea what happened. For a personal app this is acceptable, but a `try/catch` with a basic console message would help during development:

```ts
try {
  await updateProject(projectId, { status: value })
} catch (err) {
  console.error("Failed to update status", err)
} finally {
  setIsPending(false)
}
```

---

**Inline `inputClass` is duplicated across 4 files.**

`add-task-form.tsx`, `task-edit-modal.tsx`, `people-manager.tsx`, and `add-project-form.tsx` each define a nearly identical `inputClass` constant. Not worth abstracting yet — the values have small intentional differences — but once a fifth consumer appears, pull it into a shared `lib/styles.ts` or a CSS class.

---

## Phase Alignment

The core task and project features are solid and phase-appropriate. The iCal calendar export is ahead of schedule but harmless and genuinely useful. `reminderSet` is the one item that's premature — it implies there's a working reminder system when there isn't. Everything else maps cleanly to what the roadmap describes for Phase 2.

---

## Final Recommendation

Fix the two **Must Fix** items (the null crash in `addTask`/`addPerson` and the sessionStorage hydration issue), clean up the `Status` type in `updateProject`, and decide what to do with `reminderSet`. Everything else can be addressed opportunistically. Good shape to continue building on.
