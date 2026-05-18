# Code Review — The Board
**Date:** 2026-05-17
**Scope:** Full codebase audit (no open PRs — reviewed against latest commits)

---

## Verdict

**Approve with minor changes**

The app has matured significantly and is in solid shape overall. Patterns are consistent, the server/client boundary is handled well, and the auth model is clean. There are two real issues that need fixing before any broader access: an unprotected upload endpoint, and a null-safety ordering bug in `completeRecurringTask`. Beyond those, the main recurring theme is duplication — several small utilities and style constants are copy-pasted across files that should share them.

---

## Must Fix

### 1. `/api/upload` has no authentication

**Issue:** `app/api/upload/route.ts` has no session check.

**Why it matters:** Anyone who can reach the server can POST arbitrary files to `public/uploads`. Files uploaded this way are served publicly from the Next.js static directory with no access control.

**Minimal fix:** Add a session check at the top of the handler, exactly like `/api/subscribe` does:

```ts
const session = await getServerSession(authOptions)
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
```

---

### 2. Null check ordering bug in `completeRecurringTask`

**Issue:** In `recurring/actions.ts`, `requireAssignedOrAdmin` is called before the null check on `task`:

```ts
const task = await prisma.recurringTask.findUnique({ where: { id } })
await requireAssignedOrAdmin(task?.assigneeId ?? null)  // called with null if task doesn't exist
if (!task) return  // too late
```

**Why it matters:** If `id` doesn't match a row, an admin silently passes the auth check and exits on the null guard — succeeding on a phantom task. A non-admin throws an auth error rather than a clean "not found" response.

**Minimal fix:**

```ts
const task = await prisma.recurringTask.findUnique({ where: { id } })
if (!task) return
await requireAssignedOrAdmin(task.assigneeId)
```

---

### 3. `updateTask` doesn't validate `title` server-side

**Issue:** The `updateTask` action in `app/actions.ts` does not check that `title` is non-empty.

**Why it matters:** `TaskEditModal` guards this client-side with `form.title.trim() || task.title`, but server actions must not trust client input. A direct call to the action could persist an empty title string.

**Minimal fix:**

```ts
if (data.title !== undefined) {
  data.title = data.title.trim()
  if (!data.title) delete data.title
}
```

---

## Security

**Critical — Upload endpoint has no auth:** Covered above. Fix before anyone else has server access.

**Important — Upload trusts client-supplied extension:** The upload route uses the filename extension to determine MIME type and storage name without validating actual file content (magic bytes). For a Node/Next.js server the risk is limited — uploaded files won't be executed. However, storing `.html` or `.svg` files in `public/uploads/` and rendering them in an `<img>` or `<iframe>` could enable stored XSS. Consider adding `html`, `htm`, and `svg` to a deny-list, or serving uploads from a non-public path with an explicit `Content-Disposition: attachment` header.

**Watch later — VAPID env var assertions:** `lib/web-push.ts` uses `!` non-null assertions on all three VAPID env vars. If any are missing at startup, the error won't surface until the first push attempt. A startup validation check (throw with a clear message if any are undefined) would surface misconfigurations earlier.

No other meaningful security concerns for this phase.

---

## Simplify

**Duplicated `PERSON_COLORS`:** The full colors record is copy-pasted identically in `task-item.tsx` and `task-list.tsx`. Extract it to `lib/person-colors.ts` and import it in both places.

**Duplicated `urlBase64ToUint8Array`:** Identical function in `auto-subscribe.tsx` and `push-manager.tsx`. Move it to `lib/push-utils.ts` and import from both.

**Date string utilities duplicated:** `localDateStr`, `utcDateStr`, `todayUTC`, and "days diff" logic appear in at least five files — `task-item.tsx`, `task-list.tsx`, `recurring-task-list.tsx`, `recurring-task-item.tsx`, and `recurring-section.tsx`. This is the highest-friction duplication in the codebase because timezone-bug fixes have had to be applied in multiple places. Extract a `lib/dates.ts` with three exports:

```ts
export function todayLocal(): string   // YYYY-MM-DD in local time
export function todayUTC(): string     // YYYY-MM-DD in UTC
export function daysDiff(date: Date | string, todayStr: string): number
```

**Duplicated `inputClass`/`labelClass`:** The same Tailwind class string for form inputs is copy-pasted across `add-task-form.tsx`, `task-edit-modal.tsx`, `recurring-task-item.tsx`, and `recurring/add-recurring-form.tsx`. One shared constant would make a future style change a one-liner.

**Hardcoded person IDs in `PERSON_COLORS`:** `{ 1: "Craig", 2: "Hudson", 3: "Quinn" }` is coupled to the specific auto-increment IDs that exist in the database today. If anyone is deleted and re-added, their ID changes and they silently get the fallback color. Consider driving color assignment from a `colorIndex` field on `Person`, or round-robining from a palette by array position when rendering.

**Placeholder names in `AddTaskForm`:** The `PLACEHOLDERS` array contains hardcoded family member names (`"Something for Hudson to do?"`, `"Quinn's turn to help?"`). Charming, but couples the UI to a specific roster. Fine as-is, just worth knowing when the people list changes.

---

## Best-Practice Notes

**Enum fields in the schema:** Now that the app is on Postgres, `priority` on `Task`, `intervalUnit` on `RecurringTask`, and `status` on `Project` could all be native Prisma enums rather than unvalidated `String` fields. The server-side validation in actions is solid, but a schema-level enum gives a migration-enforced contract and better TypeScript inference from Prisma. Not urgent, but worth a quick migration pass.

**Home page fetches all tasks, then filters in JS:** `page.tsx` loads every task in the database, then narrows by `assigneeId` for member views. For a family with a few hundred tasks this is fine. If the task count ever grows significantly, push the filter into the Prisma query (`where: { assigneeId: sessionPersonId }`).

**`addTaskShowMore` uses `sessionStorage`:** This means the "more options" toggle resets on every new tab and browser restart. `localStorage` would be more persistent if you want the preference to stick.

**Duplicate "Done" button logic in `recurring-section.tsx`:** The home page section imports `completeRecurringTask` directly and reimplements its own `DoneButton`. If you add optimistic updates or a confirmation step to `RecurringTaskItem`'s done button later, you'd need to update `recurring-section.tsx` separately. Worth noting, not worth changing today.

---

## Phase Alignment

The app has grown well past the original single-phase MVP scope into a fully functional multi-person household PM tool with projects, notes, recurring tasks, push notifications, and role-based access. That's fine — the codebase has stayed disciplined throughout. No premature abstractions crept in, components stayed small, and each feature built naturally on the previous one. The main debt from this growth is the date utility and style constant duplication noted above.

---

## Final Recommendation

**Fix the blockers first** (upload auth, `completeRecurringTask` null ordering, `updateTask` title validation), then tackle the duplication as a small dedicated cleanup commit:

1. Extract `lib/dates.ts`
2. Extract `lib/person-colors.ts`
3. Extract a shared `inputClass` constant (or a small `lib/styles.ts`)
4. Extract `lib/push-utils.ts`

Those four changes together will remove the highest-friction parts of the codebase and make the next round of timezone or style fixes a single-file edit instead of a five-file hunt.
