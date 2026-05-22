# Custody Mode Review — 2026-05-22

Scope: commit `9e57552 add custody mode: per-user day mode chip with routine filtering` against `custody-mode-brief.md`. Reviewed the schema additions, the settings toggle, the home chip, the routine edit form selector, and the filtering/hidden-routine logic.

## Verdict

**Approve with minor changes.** The implementation tracks the brief faithfully and the security posture is solid. Two real correctness issues to fix before declaring done; otherwise the feature is shippable.

## Must Fix

### 1. Optimistic chip state has no rollback on failure

`app/custody-mode-chip.tsx:43` — `startTransition(() => setUserCustodyMode(next))`. No `.catch`. If the server action throws (network blip, auth expired), the local state stays on the new mode and the DB stays on the old. Next page revalidation silently reverts the chip, with no signal to the user. They'll think they toggled, the routines won't change, and they'll blame the feature.

Compare to `app/settings/custody-setting-toggle.tsx:14`, which does this correctly:

```ts
updateHouseholdCustodyModeEnabled(next).catch(() => setEnabled(!next))
```

**Fix:** apply the same `.catch(() => setMode(mode))` revert pattern in `CustodyModeChip.handleTap`. Three-line change.

### 2. CSV format for a single-select field is over-engineered

`RecurringTask.custodyModes String?` is named plural and parsed as a CSV in `updateRecurringTask` (`actions.ts:269-273`), but the UI is single-select (`recurring-task-item.tsx:237-241` — three options, only one ever set). The schema comment likewise lists only single values: `"with_kids" | "without_kids"`.

This is speculative architecture. Either:
- **Commit to multi-mode** — but then build the multi-select UI, which the brief explicitly didn't ask for, or
- **Simplify to a single nullable string** — rename to `custodyMode`, drop the split/filter/join logic in `updateRecurringTask`, align with `User.custodyMode`.

**Practical impact:** today a malformed update or a future code path that drops the CSV separator could land "with_kidswithout_kids" in the column and quietly fail the filter check. The validation only catches values that survive the split — it doesn't reject the whole string.

**Recommended fix:** singular field. The brief says two modes, single-select. Match it.

## Security

### Watch later

- **`addRecurringTask` doesn't accept `custodyModes`.** Not a vulnerability — by omission, new routines are created with null `custodyModes` (always-shown), which is the safe default. But it's an asymmetry between create and update, and it forces admins through a two-step ritual ("add routine, then edit it to tag the day mode"). Flagged under Phase alignment too.
- **`setUserCustodyMode` validates the enum.** `actions.ts:104` rejects anything that isn't `with_kids`, `without_kids`, or `null`. ✓
- **`updateHouseholdCustodyModeEnabled` admin-gated and household-scoped.** ✓
- **The chip is gated on `!isKid` in `BucketedTaskList`.** ✓ Brief said no mode UI for kid users.
- **`updateRecurringTask` still admin-only and `verifyBelongsToHousehold` is still called for assignee/project.** ✓
- **No new write paths bypass household scoping.** ✓

No meaningful security concerns for this phase.

## Simplify

- **The CSV-for-one-value thing above is the headline simplification.**
- **`(sessionUser.custodyMode as "with_kids" | "without_kids" | null)`** in `app/page.tsx:37` — this cast hides a typing gap. If `getSessionUser` returns a typed User from the DB row, the field's type is already correct and the cast is dead weight. If it doesn't, the cast is silently papering over a real type-system blind spot. Either way it should go.
- **`hiddenByModeCount` recomputes from `recurringTasks` (unfiltered)** while `filteredRoutines` filters from the same source. That's two passes over the same array. Tiny. Combine if you're refactoring; don't refactor for it alone.

## Best-Practice Notes

- **`User.custodyMode` is singular; `RecurringTask.custodyModes` is plural.** Pick one. Future-you greps for "custody" and gets two patterns. Renaming the latter to match (singular) is one migration line.
- **`localStorage.getItem(STORAGE_KEY)` has no try/catch.** Safari private mode and aggressive privacy extensions can throw on localStorage access. One `try { ... } catch {}` around the useEffect body and you're safe. Low likelihood for your users, but free defense.
- **Stale-dot detection is per-device.** Toggling on phone won't clear the dot on laptop next morning. Probably fine — both devices show "stale, please confirm" the first time after midnight, which is the intent. Worth knowing.
- **The `isStale` initial render flicker:** `useEffect` sets the dot after mount, so the very first paint shows no dot, then it appears. React handles this but a sharp-eyed user on a slow connection sees the dot pop in. Low priority.
- **Aria label on the chip is good** (`actions.ts:51-55` — full readout including current mode, the action it'll take, and the target mode). ✓

## Phase Alignment

On phase. The feature is exactly what was briefed:
- Settings toggle (admin-only, off by default, household-wide) ✓
- Per-user current mode ✓
- Routine filtering ✓
- Header chip with stale dot ✓
- Hidden-routines hint at bottom ✓
- Edit-form selector (gated on feature enabled) ✓

**One scope gap worth deciding on:** `add-recurring-form.tsx` doesn't expose the Day mode selector. The brief said "the edit form gains a Day mode selector" — strictly true. But the add form has analogous toggles for Notes / Time / Reminder / Assignee / Project, and Day mode is missing. Two paths:
- **Add it to the create form behind the same `custodyModeEnabled` gate.** Symmetrical with edit. Tiny addition.
- **Leave it out and document the two-step ritual.** Smaller diff but worse UX.

I'd add it. About 25 lines including the show/hide toggle button.

## Patch (optimistic-state rollback)

```tsx
// app/custody-mode-chip.tsx — handleTap
function handleTap() {
  const previous = mode
  const next: CustodyMode = mode ? OTHER[mode] : "with_kids"
  setMode(next)
  setIsStale(false)
  onModeChange(next)
  try { localStorage.setItem(STORAGE_KEY, new Date().toLocaleDateString("en-CA")) } catch {}
  startTransition(() => {
    setUserCustodyMode(next).catch(() => {
      setMode(previous)
      onModeChange(previous)
    })
  })
}
```

## Final Recommendation

**Fix specific items, then merge.**

Two real fixes:
1. Chip rollback on server-action failure (patch above).
2. Decide singular vs. plural for `custodyModes` and align schema + parsing.

One judgement call:
3. Add the Day mode selector to the create form to match the edit form.

Everything else is watch-later. Ship.
