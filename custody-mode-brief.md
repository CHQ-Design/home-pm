# Custody Mode — Design Brief

## Context

Otium is used by single parents (and dual-parent households where custody is shared). A "kids-here" day and a "kids-not-here" day are fundamentally different days. On a with-kids day the user is making dinner, packing bags, and doing the bedtime routine; on a without-kids day they're doing the deep-clean and admin they can't touch when the kids are around.

Today Otium shows the same routine list regardless. The user mentally filters it every time. This burns a small amount of attention every morning and trains them to ignore routines that aren't relevant *today.*

**This is opt-in.** Most households don't have custody dynamics. The feature lives behind a settings toggle so households that don't need it never see it.

## The user pain, in one sentence

My day looks completely different depending on whether the kids are with me, but the app shows me the same routine list either way — so I scroll past half of it.

## What we're adding

Five connected pieces:

1. **A settings toggle to enable the feature.** Off by default. Household-level (not per-user) — either the whole household uses custody mode or none of it does. Toggle copy needs to make sense to a user who has never heard the term "custody mode."

2. **A current-mode field per user.** Each user (parent) sets their own current mode independently. The kid users never see mode UI.

3. **A modes field on each recurring routine.** Tags which mode(s) the routine applies to. A routine with no tag = "show always" (default state for existing routines after the feature is enabled).

4. **A mode chip in the home screen header.** Quick switch between modes. Shows the current mode at a glance; tap to change.

5. **Routine filtering.** When mode is set, only routines tagged for the current mode (plus untagged routines) appear. Other routines are hidden.

## The modes

Two modes: **With kids** and **Without kids**. That's it.

A binary state simplifies everything downstream — the data model, the chip design, and the user's mental load. We are deliberately *not* shipping a school-day / no-school-day axis in this version, and *not* shipping a separate "handoff" mode (see Out of Scope).

## Questions for you to answer

1. **The settings toggle copy.** What does this called in Settings? "Use custody mode"? "Day modes"? "Custody-aware routines"? Avoid jargon — this needs to read to someone who has never used a similar feature. Also: what's the helper text below the toggle that explains what enabling it does?

2. **The mode chip in the header — two states.** With only two modes, the design options open up: a binary toggle/switch, a segmented control of two, a single chip that flips on tap, or two chips where the active one is highlighted. Pick what reads the current state instantly *and* is a one-tap flip. Which works one-handed on a phone?

3. **Mode persistence across days.** Once set, mode stays until the user changes it. Does the app prompt on first open of a new day ("Still with kids today?") to reduce stale-mode risk, or does that feel naggy? My instinct: a quiet header hint after midnight, not a modal. You decide.

4. **Visual treatment for hidden routines.** When mode filters hide six routines, does the user know that's happening? A small "6 routines hidden by mode" footer? An icon? Or do they just disappear? Disappearing is cleanest but breaks trust if the user is wondering "where's the dishwasher routine?"

5. **The mode chip's relationship to the person filter.** The header today has a person filter chip. Adding a mode chip puts two header-level controls next to each other. How do they coexist visually without making the header feel like a control panel?

## Constraints

- **Off by default.** The feature must not impose itself on households that don't have custody dynamics. A user who never enables the toggle should never see mode UI anywhere.
- **Per-user mode, household-wide enable.** The enable flag is shared (admins control); each user's current mode is their own.
- **Routines only.** Tasks are not mode-filtered in this version. (Future: probably yes, but keep this brief focused.)
- **Manual only.** No auto-detection from calendar, location, or any external source. The user toggles.
- **Mobile-first, one thumb.** Toggling mode is the morning's first interaction. It needs to be a one-tap operation.
- **Kid users see no mode UI.** Mode is a parent concept. The kid view stays simple.

## Out of scope

- **A separate "Handoff" mode.** Transition days (kids arriving or leaving mid-day) are handled by toggling the chip manually when the handoff happens. No data-model complexity, no third state to design around.
- **School-day / no-school-day axis.** Useful but adds a second filter dimension. Defer — most school/no-school distinction is just weekday vs. weekend, which we can read from the date if needed later.
- **Repeating mode patterns.** ("Every other Sunday I have the kids.") V1 is fully manual. We'll learn whether anyone wants automation before we build it.
- **Task filtering by mode.** Routines only for now.
- **Calendar integration.** Otium is not becoming a calendar.
- **Smart sorting / suggesting backlog items based on mode.** Future phase.

## Success looks like

A single parent opens Otium on a Tuesday morning their kids aren't with them. The header shows "Without kids." Their routine list shows four things — laundry, deep-clean the bathroom, mail run, oil change — instead of the fourteen routines they'd see on a with-kids day. They handle the four, close the app, and don't feel buried.
