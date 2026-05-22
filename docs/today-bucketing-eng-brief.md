# Today Screen — Priority Bucketing (Engineering Brief)

## Goal

Replace the single flat task list on the Things tab with three priority buckets so the user can see what matters today at a glance, without having to sort the list in their head.

## Success criteria

A user opens Otium in the morning, looks at the top of the screen for ~2 seconds, and knows what has to happen today. The rest of the list exists but does not demand attention.

## Bucket logic (fixed — derived from existing fields)

| Bucket      | Inclusion rule                                                                 |
| ----------- | ------------------------------------------------------------------------------ |
| Today       | `dueDate <= today AND priority = high`, OR `dueDate < today` (overdue), OR routine instance due today |
| This week   | `dueDate` within the next 3 calendar days (excluding today), OR `priority = high` with no `dueDate` |
| Later       | Everything else: future-dated tasks beyond 3 days, or undated non-high-priority tasks |

Bucket assignment is a pure function of the task/routine record and "today" (in the user's local date). No schema change. No new persisted state.

## UX decisions (resolved)

- **Labels:** `Today`, `This week`, `Later`.
- **Default expansion:** Today and This week expanded. Later collapsed, with a row count next to the header (e.g. `Later (12)`).
- **Routines:** Folded into the bucket list. Routines due today appear in Today. The standalone Routines section above the list is removed.
- **Person filter:** Behavior unchanged. Filtering by person narrows rows *within* each bucket. Bucket counts reflect the active filter.
- **Completed tasks:** Single combined "Completed" section below all three buckets, collapsed by default. No per-bucket completed groups.
- **Empty states:**
  - Today empty: section renders with the line `Nothing critical today.` No icon, animation, or emoji.
  - This week empty: section is hidden entirely.
  - Later empty: section is hidden entirely.
  - All three buckets empty: single `No tasks.` line; Completed section still renders if there is completed work.
- **Promotion / demotion:** Out of scope for v1. Priority and due date edits continue through the existing task edit modal. No drag, no swipe-to-promote.

## Visual treatment

- Bucket headers use the existing serif heading face. Suggested scale step-down: H2-equivalent for Today, H3 for This week, H4 for Later (final values to confirm against the live type scale during design QA).
- Single warm linen-tone divider between buckets; no full-bleed bars, no colored fills.
- No bucket-level color coding (no red/amber/green). Hierarchy comes from type scale and vertical spacing.
- Generous vertical spacing between buckets; standard row spacing within each bucket.
- Task and routine row visuals are **not** redesigned in this work. Existing components ship as-is into the new bucket containers.

## Implementation notes

### Data layer
- No Prisma schema changes.
- Server-side fetch returns incomplete tasks and routine instances for the active user, scoped by the active person filter if one is set.
- Bucket key is derived in TypeScript by a pure function: `bucketFor(item, today): 'today' | 'thisWeek' | 'later'`.
- Routines are normalized to the same shape as tasks before bucketing, so the renderer does not branch on model type.

### Date handling
- "Today" is computed in the user's local timezone, not UTC. If a stored TZ is not yet available on the user record, compute the bucket key on the client from `new Date()` to avoid off-by-one-day drift around midnight.
- "Within the next 3 days" is inclusive of the next 3 calendar days, exclusive of today (Today bucket already covers today).

### Rendering
- One scrollable view. No tabs, no carousels, no swipeable bucket panels.
- Each bucket is a `<section>` with an `<h2>` header and a list of rows.
- `Later` collapse state lives in local component state only — no `localStorage`, no DB persistence.
- Reuse existing task row and routine row components. Do not introduce a new row variant.

### Person filter
- Filter applies before bucketing.
- Bucket counts and visibility (hide-when-empty) reflect the post-filter set.

### Performance
- Personal-scale data (hundreds of rows at most). No list virtualization. No new caching layer.

## Accessibility

- Bucket headers are real `<h2>` elements so screen readers expose them as landmarks.
- The collapsed "Later" header is a `<button>` with `aria-expanded` and `aria-controls`, not a clickable `<div>`.
- Empty-state copy is part of the document flow, not announced via `aria-live` (it is ambient state, not a notification).
- Tap targets on rows are unchanged; bucket headers have at least a 44px tap region.
- Focus order: Today header → Today rows → This week header → This week rows → Later header → (rows when expanded) → Completed header.

## Edge cases

- High-priority task with a past due date: lands in Today (overdue rule wins).
- Task becomes overdue while the screen is open: re-bucketed on the next data refresh, not in real time.
- Routine completed today: moves to Completed section; does not re-render in Today.
- Person filter active and Today empty: shows `Nothing critical today for [Name].`
- Person filter active and a bucket is empty: same hide-when-empty rules apply to filtered set.
- Editing a task's priority or due date in the modal: on save, re-bucket and re-render. No animated reflow needed.

## QA checklist

- Bucket assignment is correct for every combination of `priority` × `dueDate` × overdue × routine.
- Routines due today appear inside Today; routines due later appear in This week / Later.
- Completing any task or routine moves it to the single Completed section.
- Person filter narrows each bucket and updates the count badge on Later.
- Later defaults collapsed; tapping the header expands it; tapping again collapses it.
- Empty Today renders the quiet line; empty This week and Later hide entirely.
- Editing priority or due date in the modal re-buckets the task on save.
- Keyboard focus reaches the Later toggle and toggles with Enter/Space.
- No layout shift when Later expands (header position is stable).
- Local-midnight boundary: a task due "tomorrow" at 11:59pm local does not appear in Today.

## Out of scope (do not build now)

- Categories / tags
- Custody mode
- A fourth "Tomorrow prep" bucket
- Calendar view
- Drag/swipe promotion between buckets
- User-configurable bucket rules or custom buckets
- Per-bucket completed sections
- Persisting the Later collapse state across sessions

## Release recommendation

**Status:** Ready for development after a short design pass to confirm header sizes against the live type scale and to confirm the divider treatment.

**Reason:** No schema change, no new dependencies, no new interaction patterns. Bucket logic is fully specified, row components are reused, and the only new interactive surface is a single collapse toggle on the Later header. Risk is low; scope is contained.

## Open questions (only the ones that materially affect build)

- Confirm the user's timezone is available on the session/user record. If not, the bucket function runs client-side and the server returns an unbucketed list.
- Confirm the existing serif heading sizes so the three bucket header steps land on real scale tokens rather than ad-hoc px values.
