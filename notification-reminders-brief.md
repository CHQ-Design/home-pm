# Notification Reminders — Engineering Brief

## Goal

Allow users to set a reminder interval on tasks and recurring routines so they receive a push notification at a specific lead time before the item is due (e.g., at the time, 30 min before, 1 hour before, 1 day before). Primary use case: medication reminders on recurring routines.

## Cron setup (already done)

cron-job.org is configured to hit `/api/cron/notify` hourly with `Authorization: Bearer <CRON_SECRET>`. The Vercel-managed cron in `vercel.json` has been removed. No further infrastructure work needed.

---

## Schema changes

### Task

- Remove `reminderSet Boolean @default(false)` — unused boolean, replacing it entirely
- Add `reminderMinutesBefore Int?` — null means no reminder; 0 = at the time, 30 = 30 min before, 60 = 1 hour, 1440 = 1 day
- Add `notifiedAt DateTime?` — set after a notification is sent; prevents double-firing on subsequent cron runs

### RecurringTask

- Add `reminderMinutesBefore Int?` — same semantics as above
- Add `notifiedAt DateTime?` — for recurring tasks, reset this to null when the routine is marked complete and `nextDue` advances, so the next occurrence gets notified fresh

### User

- Add `timezone String @default("America/Los_Angeles")` — IANA timezone string. Default applies to existing users via the seed; new users get the default at creation time. A settings field will let users override it later (out of scope for this brief).

Run `npx prisma db push` after schema changes (no migration needed for this project's workflow).

---

## Cron logic changes (`/api/cron/notify/route.ts`)

The current logic treats "HH:MM" as UTC, which is wrong for users in PT/ET. Replace the time computation with a timezone-aware version that resolves the assignee's timezone before subtracting the lead time.

### Steps

1. Calculate the window: `[now - 1 hour, now]` (matches the hourly cron cadence).
2. For each task or routine with `reminderMinutesBefore` set, look up the assignee's `User.timezone` (by joining `assignee.email` → `User.email`). Default to `"America/Los_Angeles"` if not found.
3. Compute `notifyAt` by interpreting `dueDate + time` in the user's timezone, converting to UTC, then subtracting `reminderMinutesBefore` minutes.
4. Notify if `notifyAt` falls within the window AND `notifiedAt` is null.
5. **Mark `notifiedAt = now` only after a successful push send.** Log non-410/404 errors so transient failures are observable. (Previous "mark before send" approach silently dropped med reminders on any push failure.)

### Timezone conversion

Use a small helper. Either `date-fns-tz` (already a small dep, propose before adding) or hand-rolled with `Intl.DateTimeFormat` parts. Example signature:

```ts
function computeNotifyAt(dueDate: Date, time: string | null, minutesBefore: number, tz: string): Date {
  // Interpret dueDate's calendar date + time as a wall-clock time in `tz`,
  // convert to UTC, subtract minutesBefore.
}
```

If `date-fns-tz` is approved, the body is roughly `zonedTimeToUtc(\`${yyyy-mm-dd} ${HH:MM}\`, tz)` minus `minutesBefore`.

### Edge cases to handle

- **No `time` set:** treat as midnight (00:00) in the user's timezone, so "1 day before" still works but "1 hour before" would fire at 11pm the prior night local time — acceptable.
- **Routine completed, `nextDue` advances:** clear `notifiedAt` in the completion action so the next occurrence notifies correctly.
- **`reminderMinutesBefore` edited on an existing item:** reset `notifiedAt = null` in the edit action so the new lead time gets evaluated against the upcoming due date.
- **Push subscription stale (410/404):** existing cleanup logic already handles this — no change needed.
- **Push failure other than 410/404:** do not mark `notifiedAt`. Log the error. The next cron run will retry. (Accept that a permanently-broken sub will retry every hour until 410/404 surfaces or it's cleaned up manually.)
- **Unassigned items:** the cron skips items with no assignee email (no push target). The UI should also disallow setting a reminder on unassigned items — see UI section.

---

## UI changes

Add a "Remind me" select field to the task creation/edit form and the recurring routine form.

Suggested options:
- No reminder *(default)*
- At the time
- 30 minutes before
- 1 hour before
- 1 day before

Only show this field if the item has **both** a due date/time AND an assignee. A reminder needs a time to anchor to and a person to notify.

Store the selected value as minutes (0, 30, 60, 1440) or null.

When the user changes `reminderMinutesBefore` on an existing item, the edit action must also set `notifiedAt = null` so the new lead time fires.

---

## What to do when `nextDue` advances on a routine

In the recurring task completion action (wherever `nextDue` is recalculated), add:

```ts
notifiedAt: null
```

to the update payload so the next occurrence starts fresh.

---

## Out of scope

- Per-user timezone *editing UI* (the field exists and defaults to LA; settings UI is a separate task)
- First-sign-in timezone auto-detection via `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Per-user reminder preferences (everyone sets per-item for now)
- Email notifications (push only)
- Snooze or repeat notifications
- Reminders on items without a due date or without an assignee
