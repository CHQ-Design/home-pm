# Recurring Routines — Verb Set Design Brief

## Context

Otium's "Routines" section handles recurring household tasks — laundry, trash, bathroom cleaning, medication reminders. Each routine has a cadence (every N days/weeks/months) and a `nextDue` date.

Today the only thing a user can do with a routine is mark it **Done**. That advances `nextDue` by the cadence. The problem: real life doesn't always allow Done. The routine is due today, the user is consciously not doing it today, and the current UX has no answer for that. So:

- Overdue routines pile up and the list becomes wallpaper you stop reading
- Users feel guilt-tripped by routines they've actively decided to defer
- The only escape valves are "ignore it" or "delete it" — both bad

## The user pain, in one sentence

The routine is due. I am consciously not doing it. The app should know the difference between *ignored* and *actively deferred*.

## What we're adding

Three new verbs, alongside Done.

**Snooze** — "I will do this, just not right now."
Pushes `nextDue` forward by a small amount (likely 1 day, TBD with you). Does not affect the long-term cadence. The routine remains "owed."

**Skip** — "This cycle is a write-off. Pick it back up next time."
Advances `nextDue` by the full cadence interval (same math as Done). Does *not* stamp completion. Effect on streak is an open question — see below.

**Move to today** — "This was scheduled for a later day. I want to do it now."
Sets `nextDue = today`. Most useful for routines not yet overdue. Effectively the inverse of Snooze.

## Questions for you to answer

I want options back on these, not prescriptions from me:

1. **How are the verbs surfaced?** Swipe gestures? Long-press menu? Overflow `⋯` button? Tap-to-expand-row? The routine row today is compact — the verbs need somewhere to live without bloating it.

2. **Confirmation vs. instant action.** None of these are destructive. Should any of them show a brief undo toast? My instinct says yes for Skip, no for Snooze or Move-to-today — but you tell me.

3. **Snooze duration.** Single fixed duration (e.g. "snooze 1 day")? Small picker (1 hour / tomorrow / 3 days)? Default should err toward simple — first-time users get paralyzed by choice.

4. **Visual + motion treatment.** Done currently triggers a sound and a small celebration. Snooze / Skip / Move-to-today are *not* completions. Make that obvious without being heavy. Don't celebrate a Skip.

5. **Does Skip break a streak?** Streaks today only advance on Done. If Skip breaks streaks, users will avoid using it and we're back to the pileup problem. If Skip is fully streak-neutral, streaks lose meaning for routines a user skips often. Worth talking through — there may be a middle path (e.g. streak pauses but doesn't reset).

## Constraints

- **Mobile-first.** Used primarily on iPhones at the kitchen counter, one thumb, often distracted.
- **Don't redesign the row.** Design how the verbs *attach* to the existing routine row, not the row itself.
- **Accessibility.** Every verb reachable via keyboard and screen reader. No verb lives *only* inside a swipe gesture.
- **Tone.** Forgiving and quiet. The point of this feature is to *reduce* guilt and pileup. No exclamation marks, no "Are you sure?" friction.

## Out of scope

- Marking a routine paused or inactive — different problem, not a verb.
- Editing cadence inline — already lives in the edit modal.
- "Move to next non-kid day" — depends on a custody-mode feature that doesn't exist yet.
- Bulk multi-select. Defer until we know whether people use these one-at-a-time first.

## Success looks like

A user opens Routines, sees five overdue items, and in ten seconds has snoozed two, skipped one, moved one to today, and left one for later — without feeling judged by any of it.
