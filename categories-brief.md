# Task Categories — Design Brief

## Context

Today every task in Otium is essentially the same shape: a title, an optional due date, a priority, and an assignee. There's no way to say "this is an errand" vs. "this is an admin thing" vs. "this is a kid-school item." The user's daily list ends up homogenous — a 30-line scroll of differently-shaped chores that all *look* the same.

We want a `category` field on every task, plus a way to set it when adding, plus a way to surface it on the home screen.

Categories are about the *kind* of thing a task is. They're orthogonal to the priority buckets already in design (see `today-bucketing-brief.md`). A task can be both "an errand" and "Must do today."

## The user pain, in one sentence

I open my task list and it's just a wall of words. I can't see at a glance which ones are errands I could batch on one drive vs. admin I should sit down for.

## What we're adding

Three connected pieces:

1. **A `category` field on Task.** Single-select from a fixed list. Optional (a task can have no category — it defaults to "Uncategorized" for filtering purposes).

2. **A chip selector in the add-task form.** Lives alongside the existing priority / assignee / due date / project / reminder controls.

3. **Category treatment in the today view.** This is the open one. See Question 3 below — there's a real product tension here that the design needs to resolve.

## The category list — to be decided

The original product vision lists ten: Home, Kids, School, Errands, Shopping, Cleaning, Admin, Finance/Legal, Maintenance, Personal.

Ten is too many for a chip row on a phone. The first design exercise is **trimming this to 5–7 categories that cover real life without overlapping.** Some have obvious overlaps (Home / Cleaning / Maintenance all describe "house stuff"; Finance/Legal sits awkwardly next to Admin). Bring back a proposed short list with reasoning.

## Questions for you to answer

1. **The list itself.** What 5–7 categories cover the real household-and-life surface area? Where are the overlaps? Are there any missing (e.g. "Health")? Optimize for *what the user wants to filter by*, not for taxonomic completeness.

2. **Chip vs. dropdown in the add-task form.** Priority is currently a chip row (low / med / high — three chips). Categories will be 5–7 chips, which may overflow the form on small screens. Options: horizontally scrolling chip row, two-row wrap, a select dropdown, or a sheet that opens on tap. Pick what's quick to use one-handed.

3. **Where categories live in the today view — this is the real question.** Today's priority bucketing brief (Must / Should / Can wait) already takes the *primary* grouping slot. Categories can't *also* be the primary grouping on the same screen — you can't bucket by urgency *and* category at the top level without making the screen unreadable. So categories need a second-tier treatment. Three candidates:

   - **Row metadata.** A small category label/icon on each task row. Visible but quiet.
   - **A filter chip row** alongside the person filter, so the user can scope the whole view to "Just errands."
   - **A category sub-header inside each priority bucket** ("Must do today → Errands (2), Kid (1)…"). Most information-dense; risk is visual noise.

   My instinct is **row metadata + filter chip** — that gives the user *visibility* and *control* without competing with the buckets. But you may see a layout I don't. Bring options.

4. **Visual treatment.** Categories are not priority and shouldn't fight for attention with the priority chip on each row. Color? Icon-only? A muted text label? Whatever you pick, it should read at a glance without dominating the row.

5. **The "Uncategorized" case.** Tasks added quickly often won't get a category. How does the filter chip handle this — is "Uncategorized" a filterable option, or do uncategorized tasks always show regardless of filter? (My lean: "Uncategorized" is filterable like any other category.)

## Constraints

- **Mobile-first, one-thumb.** Whatever the add-form looks like, setting a category should not require precision tapping.
- **Don't compete with buckets.** The priority buckets are the primary structure of the today view. Categories layer on; they don't replace.
- **The person filter chip stays.** Categories and person filtering need to coexist — filtering by both should narrow further, not break the layout.
- **Optional, always.** A user must be able to add a task in three taps without picking a category. Quick-add is sacred.
- **Accessibility.** Category labels need text, not just color or icon. Color-blind users and screen readers both depend on this.

## Out of scope

- **User-defined categories.** Fixed list for now. If users want custom categories later, we can revisit — but the smart-sorter work in a future phase relies on a known set.
- **Multiple categories per task.** Single-select. Multi-select adds disproportionate complexity (data model, UI, filtering logic) for a marginal gain.
- **Categories on recurring routines.** Routines already feel domain-specific (laundry, trash, medication). They don't need this axis. If we change our minds, it's a small additive change later.
- **Backlog screen design.** A separate screen organized *by* category is planned for a later phase. This brief is only about the today view treatment.
- **Smart sorter / category-aware suggestions.** Future phase. The brief is only about adding categories, not acting on them.

## Success looks like

A user opens Otium, sees their priority buckets, and at a glance can tell that three of their "Should do soon" items are errands they could batch tonight on the way home — without having to read the words.
