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

Run `npx prisma db push` after schema changes (no migration needed for this project's workflow).

---

## Cron logic changes (`/api/cron/notify/route.ts`)

The current logic notifies about everything due today. Replace it with time-window logic:

1. Calculate the window: `[now - 1 hour, now]` (matches the hourly cron cadence)
2. For each task with `reminderMinutesBefore` set, compute `notifyAt = dueDate+time - reminderMinutesBefore`
3. Notify if `notifyAt` falls within the window AND `notifiedAt` is null
4. After sending, set `notifiedAt = now` on the record

For recurring routines, `nextDue` already stores the next occurrence date. Combine with `time` field (stored as `"HH:MM"`) to get the exact notify datetime.

### Edge cases to handle

- Task or routine has no `time` set: treat as midnight (00:00) for that day, so "1 day before" still works but "1 hour before" would fire at 11pm the prior night — acceptable
- Routine is completed and `nextDue` advances: clear `notifiedAt` in the completion action so the next occurrence notifies correctly
- Subscription is stale (410/404 from push service): existing cleanup logic already handles this — no change needed

---

## UI changes

Add a "Remind me" select field to the task creation/edit form and the recurring routine form.

Suggested options:
- No reminder *(default)*
- At the time
- 30 minutes before
- 1 hour before
- 1 day before

Only show this field if the item has a due date/time set. A reminder without a time to anchor to is meaningless.

Store the selected value as minutes (0, 30, 60, 1440) or null.

---

## What to do when `nextDue` advances on a routine

In the recurring task completion action (wherever `nextDue` is recalculated), add:

```ts
notifiedAt: null
```

to the update payload so the next occurrence starts fresh.

---

## Out of scope

- Per-user reminder preferences (everyone sets per-item for now)
- Email notifications (push only)
- Snooze or repeat notifications
- Reminders on items without a due date
