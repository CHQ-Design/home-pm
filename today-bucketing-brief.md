# Today Screen — Priority Bucketing Design Brief

## Context

Otium's home screen (the "Things" tab) is where the user lands every time they open the app. Today it shows:

- A "Routines" section at the top — recurring household items due today or overdue
- A single flat list of tasks below — all of the user's tasks, in `createdAt` order, with no grouping
- A person filter chip to scope by household member

Tasks have a `priority` field (low / medium / high) and an optional `dueDate`, but neither is currently used to *group* the list. Priority is shown as a small pill on each row; due date is shown as text. The user does the visual sort in their head, every single time.

## The user pain, in one sentence

I open the app and see everything I *might* do — but not what I *should* do right now.

## What we're changing

Replace the single flat task list with three priority buckets:

**Must do today** — `dueDate <= today AND priority = high`, plus any overdue task or routine.
This is the "the day fails if I don't do this" bucket.

**Should do soon** — `dueDate within next 3 days`, OR `priority = high` with no date.
This is the "if I have bandwidth, this is next" bucket.

**Can wait** — everything else with a date in the future, or no date at all.
This is the "exists, but not today's problem" bucket. Most tasks live here.

Bucket logic is fixed (it's tied to the data model). What's open is the *visual* design of how the buckets are presented, named, and made navigable.

## Questions for you to answer

1. **Naming.** "Must / Should / Can wait" are working titles, not commandments. They risk feeling judgmental ("must"), or vague ("soon"). What works better? Options: time-based ("Today / This week / Later"), action-based ("Do now / Up next / Backlog"), warmer ("Today's focus / On deck / Someday"). Pick a voice that matches Otium.

2. **Visual hierarchy between buckets.** All three buckets sit on one scrollable screen. How do you make "Must do today" feel materially heavier than "Can wait" without making the screen shouty? Size? Density? Color? An expand/collapse default state for the lower buckets?

3. **How recurring routines fit in.** Today, routines live in their own section above tasks. Two options to consider:
   - **Fold them in.** Routines due today appear inside "Must do today" alongside one-off tasks. One unified daily view.
   - **Keep them separate.** Routines stay above; the three buckets are tasks only.
   I lean toward folding them in (the user doesn't care that internally they're different models), but you decide.

4. **Empty states per bucket.** What does "no must-do items today" look like? Celebratory? Quiet? Hidden? Each bucket may need a different empty-state voice.

5. **Promotion / demotion between buckets.** A task moves buckets when its `dueDate` or `priority` changes. Today, both edits happen in the task edit modal — which is a two-tap journey. Is that fine, or does the bucket layout invite a quicker affordance (drag between buckets, swipe-up to promote, etc.)? My instinct says no — keep edits in the modal for now — but the design might suggest otherwise.

6. **Completed tasks.** Today, completed tasks collapse into a "Completed" section at the bottom. With buckets, do they collapse per-bucket, or stay in one combined section at the bottom?

## Constraints

- **Mobile-first.** Used primarily on iPhones, one thumb, often distracted.
- **Don't redesign the task row.** Design the bucket headers, the spacing, and the transitions between buckets — not the row content.
- **The person filter chip stays.** Buckets coexist with the existing person filter. Filtering by person should filter *within* each bucket, not collapse to one list.
- **One scroll.** All three buckets live on one scrollable screen. No tabs, no swipeable bucket views. The whole point is *one glance* at the day.

## Out of scope

- **Categories.** Tagging tasks as "errand / appointment / kid" is a separate phase. Don't design around them yet.
- **Custody mode.** "Show only kid-related things on a kid day" depends on a feature that doesn't exist yet.
- **Tomorrow prep as its own bucket.** It can live inside "Should do soon" for now. Don't carve out a fourth bucket.
- **Calendar view.** Otium is not becoming a calendar.

## Success looks like

A user opens Otium in the morning, looks at the top of the screen for two seconds, and knows the three things that have to happen today. The rest of the list exists, but doesn't demand attention.
