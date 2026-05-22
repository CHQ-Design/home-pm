# Today Screen — Priority Bucketing (Engineering Brief)

## Goal

Replace the single flat task list on the Things tab with three priority buckets so the user can see what matters today at a glance, without having to sort the list in their head.

## Success criteria

A user opens Otium in the morning, looks at the top of the screen for ~2 seconds, and knows what has to happen today. The rest of the list exists but does not demand attention.

## Bucket logic (fixed)

Rules are evaluated **top-down, first match wins**. Each item appears in exactly one bucket.

| Bucket      | Inclusion rule                                                                 |
| ----------- | ------------------------------------------------------------------------------ |
| Today       | Task `dueDate` is today or earlier (overdue), OR routine `nextDue` is today or earlier |
| This week   | Task `dueDate` falls between tomorrow and end of current calendar week (Sunday 23:59:59 in user TZ), OR routine `nextDue` falls in that same range, OR task `priority = high` with `dueDate IS NULL` |
| Later       | Everything else: future-dated items beyond this week, or undated non-high-priority tasks |

### Truth table — tasks

| `priority`   | `dueDate`                       | Bucket    |
| ------------ | ------------------------------- | --------- |
| any          | < today (overdue)               | Today     |
| any          | = today                         | Today     |
| any          | tomorrow → end of current week  | This week |
| high         | NULL                            | This week |
| any          | > end of current week           | Later     |
| medium / low | NULL                            | Later     |

### Truth table — routines

| `nextDue`                       | Bucket    |
| ------------------------------- | --------- |
| <= today                        | Today     |
| tomorrow → end of current week  | This week |
| > end of current week           | Later     |

### Calendar-week definition

- "End of current week" is **Sunday 23:59:59.999 in the user's local timezone** (ISO week — Monday start, Sunday end).
- On Sunday, "This week" contains only items still classed under high-priority-undated rule (since no calendar days remain). On Monday morning, "This week" expands to cover the next 6 days through Sunday.

No schema change. No new persisted state.

## UX decisions (resolved)

- **Labels:** `Today`, `This week`, `Later`.
- **Default expansion:** Today and This week expanded. Later collapsed, with a row count next to the header (e.g. `Later (12)`).
- **Routines:** Folded into the bucket list. The standalone Routines section above the list is removed.
- **Person filter:** Behavior unchanged. Filtering by person narrows rows within each bucket. Bucket counts reflect the active filter.
- **Completed tasks:** Single combined "Completed" section below all three buckets, collapsed by default. Tasks only — routines do not appear here (see Routine completion below).
- **Promotion / demotion:** Out of scope for v1. Priority and due date edits continue through the existing task edit modal. No drag, no swipe-to-promote.

## Empty-state copy (exact strings)

- Today with no items: `Nothing critical today.`
- Today with no items and person filter active: `Nothing critical today for [Name].`
- This week with no items: section is not rendered.
- Later with no items: section is not rendered.
- All three buckets empty: `No tasks.` (or `No tasks for [Name].` with person filter active).

No icons, animations, or emoji on empty states.

## Visual treatment

- Bucket headers use the existing serif heading face. Suggested scale step-down: H2-equivalent for Today, H3 for This week, H4 for Later (confirm against live type scale during design QA).
- Single warm linen-tone divider between buckets; no full-bleed bars, no colored fills.
- No bucket-level color coding (no red/amber/green). Hierarchy comes from type scale and vertical spacing.
- Generous vertical spacing between buckets; standard row spacing within each bucket.
- Task and routine row visuals are **not** redesigned in this work. Existing components ship as-is into the new bucket containers.

## Sort order within each bucket

1. Overdue items first (task `dueDate < today` or routine `nextDue < today`), oldest first.
2. Then dated items by `dueDate` / `nextDue` ascending.
3. Within the same date, by `time` ascending (items with no `time` come after timed items for that day).
4. Then by `priority` descending (high → medium → low).
5. Tiebreaker: `createdAt` ascending.
6. Undated items (only present in This week via the high-priority-undated rule, or in Later) come after dated items within the same bucket.

## Implementation notes

### Data layer
- No Prisma schema changes.
- Server-side query returns incomplete tasks and routines for the active household, scoped by the active person filter if one is set.
- Bucket key is derived in TypeScript by a pure function: `bucketFor(item, today, endOfWeek): 'today' | 'thisWeek' | 'later'`.
- Routines are normalized to the same shape as tasks before bucketing so the renderer does not branch on model type. Normalized fields: `id`, `kind: 'task' | 'routine'`, `title`, `priority` (routines treated as `medium` for sort purposes unless we add a priority later), `dueOrNextDue: Date | null`, `time`, `assigneeId`.

### Date handling
- `User.timezone` already exists on the schema — use it to compute "today" and "end of current week."
- Bucket comparisons use the **date portion** of `dueDate` / `nextDue`, not the time. `time` affects sort order within a bucket, not bucket assignment.
- Compute boundaries on the server.

### Routine completion behavior
- Routines do not have a `completed` flag. Completing a routine sets `lastCompleted = now()` and advances `nextDue` to the next occurrence based on `intervalValue` / `intervalUnit`.
- Consequence: a completed routine disappears from its current bucket on the next render. It does **not** appear in the Completed section.
- The Completed section contains tasks only.

### Rendering
- One scrollable view. No tabs, no carousels, no swipeable bucket panels.
- Bucket order top to bottom: **Today → This week → Later → Completed**.
- Each bucket is a `<section>` with an `<h2>` header and a list of rows.
- `Later` collapse state lives in local component state only — not persisted to `localStorage` or DB.
- Reuse the existing task row and routine row components. Do not introduce a new row variant.

### Person filter
- Filter applies before bucketing.
- Bucket counts, hide-when-empty rules, and Later's `(n)` badge all reflect the post-filter set.

### Performance
- Personal-scale data. No list virtualization. No new caching layer.

## Accessibility

- Bucket headers are real `<h2>` elements so screen readers expose them as landmarks.
- The Later header is a `<button>` with `aria-expanded` and `aria-controls`, not a clickable `<div>`.
- Empty-state copy is part of the document flow, not announced via `aria-live`.
- Tap targets on rows are unchanged; bucket headers have at least a 44px tap region.
- Focus order: Today header → Today rows → This week header → This week rows → Later header → Later rows (when expanded) → Completed header.

## Acceptance criteria

### Bucket assignment
- Each task lands in exactly one bucket, matching the task truth table.
- Each routine lands in exactly one bucket, matching the routine truth table.
- Rules are evaluated top-down (Today → This week → Later); first match wins. No item appears in two buckets.
- A task with `dueDate = today` and `priority = medium` appears in Today.
- A task with `dueDate < today` (any priority) appears in Today as overdue.
- A task with `priority = high` and `dueDate = NULL` appears in This week.
- A task with `dueDate` after end of current week appears in Later regardless of priority.
- A routine with `nextDue <= today` appears in Today.

### Calendar-week behavior
- "End of current week" is Sunday 23:59:59.999 in the user's timezone.
- On a Sunday with no high-priority-undated items, This week is empty and the section hides.
- On a Monday morning, This week shows all items dated through the upcoming Sunday.
- Bucket assignment uses the date portion of `dueDate` / `nextDue` only; `time` does not change bucket placement.

### Sort order
- Within each bucket, items are sorted using the rules in the "Sort order within each bucket" section above.
- Within Today, overdue items (oldest first) precede today-dated items.

### Routines
- Completing a routine advances `nextDue`; the routine disappears from its current bucket on next render and does **not** appear in the Completed section.
- The standalone Routines section above the task list is removed.

### Bucket headers and order
- On-screen order is Today → This week → Later → Completed.
- Each bucket header is a real `<h2>` element.
- The Later header renders as `Later (n)` where `n` is the count of incomplete items (tasks + routines) currently in the Later bucket, after the active person filter.
- The Later header is a `<button>` with `aria-expanded` reflecting open/closed state.

### Default expansion
- Today and This week are expanded by default.
- Later is collapsed by default.
- The Later collapse state is not persisted across sessions or page reloads.

### Empty states
- Today with no items renders the literal copy `Nothing critical today.` (or `Nothing critical today for [Name].` with person filter).
- This week with no items is not rendered.
- Later with no items is not rendered.
- All three buckets empty renders the literal copy `No tasks.` (or `No tasks for [Name].` with filter).

### Person filter
- Filter applies before bucketing.
- Bucket counts and hide-when-empty rules reflect the filtered set.

### Completed section
- Tasks marked complete move into a single combined Completed section below the three buckets.
- The Completed section is collapsed by default.
- Routines never appear in the Completed section.

### Edits via the modal
- Saving a priority or `dueDate` change in the task edit modal re-buckets the task on next render.
- No animated reflow required.

### Keyboard
- The Later collapse toggle is reachable in tab order and toggles with Enter or Space.

## Edge cases (verify in QA)

- High-priority overdue task: lands in Today via the overdue rule, not double-listed.
- Task becomes overdue while screen is open: re-bucketed on the next data refresh, not in real time.
- Person filter active + Today empty: shows `Nothing critical today for [Name].`
- Local-midnight boundary: a task with `dueDate` set to tomorrow does not appear in Today regardless of its `time` value.
- Sunday boundary: a task with `dueDate` set to next Monday does not appear in This week on Sunday — it lands in Later until the week rolls over.
- Routine with `nextDue` past due (skipped a cycle): appears in Today via the overdue rule.

## Out of scope (do not build now)

- Categories / tags
- Custody mode
- A fourth "Tomorrow prep" bucket
- Calendar view
- Drag/swipe promotion between buckets
- User-configurable bucket rules, week-start preference, or custom buckets
- Persisting the Later collapse state across sessions
- Per-bucket Completed sections

## Release recommendation

**Status:** Ready for development after a short design pass to confirm header sizes against the live type scale and to confirm the divider treatment.

**Reason:** No schema change, no new dependencies, no new interaction patterns. Bucket logic is fully specified with truth tables, row components are reused, and the only new interactive surface is a single collapse toggle on the Later header. Risk is low; scope is contained.

## Open questions

- Confirm the existing serif heading sizes so the three bucket header steps land on real scale tokens rather than ad-hoc px values.
