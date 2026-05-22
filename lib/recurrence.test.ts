import { describe, it, expect } from "vitest"
import { computeEffectiveStreak, computeNextDue, computePrevDue } from "./recurrence"

// Fixed reference point for deterministic tests
const NOW   = new Date("2026-01-15T12:00:00.000Z")
const TODAY = new Date("2026-01-15T00:00:00.000Z")

describe("computeEffectiveStreak", () => {
  it("preserves streak when user acted within the current cycle (snooze-across-boundary case)", () => {
    // Daily routine due today. User snoozed yesterday — which is exactly prevCycleStart.
    // lastActionAt >= prevCycleStart → streak must NOT reset.
    const task = {
      streak: 5,
      nextDue: TODAY,                                   // due today (overdue as of NOW)
      lastActionAt: new Date("2026-01-14T10:00:00.000Z"), // yesterday — within the cycle
      intervalValue: 1,
      intervalUnit: "day",
    }
    expect(computeEffectiveStreak(task, NOW)).toBe(5)
  })

  it("returns 0 unchanged when streak is already 0 (skip-on-zero case)", () => {
    const task = {
      streak: 0,
      nextDue: new Date("2026-01-10T00:00:00.000Z"), // overdue
      lastActionAt: null,
      intervalValue: 1,
      intervalUnit: "week",
    }
    expect(computeEffectiveStreak(task, NOW)).toBe(0)
  })

  it("returns the pre-snooze streak so Done-after-snooze increments correctly", () => {
    // Weekly routine snoozed last week, due today.
    // prevCycleStart = today - 1 week = 2026-01-08.
    // lastActionAt = 2026-01-12 (within the cycle) → streak preserved at 7.
    // completeRecurringTask will do effectiveStreak + 1 = 8.
    const task = {
      streak: 7,
      nextDue: TODAY,
      lastActionAt: new Date("2026-01-12T09:00:00.000Z"),
      intervalValue: 1,
      intervalUnit: "week",
    }
    const effective = computeEffectiveStreak(task, NOW)
    expect(effective).toBe(7)
    expect(effective + 1).toBe(8) // what completeRecurringTask writes
  })

  it("resets streak to 0 when a full cycle elapsed with no user action", () => {
    // Weekly routine 5 days overdue, never touched.
    // prevCycleStart = nextDue - 1 week = 2026-01-03.
    // lastActionAt = null → reset.
    const task = {
      streak: 4,
      nextDue: new Date("2026-01-10T00:00:00.000Z"),
      lastActionAt: null,
      intervalValue: 1,
      intervalUnit: "week",
    }
    expect(computeEffectiveStreak(task, NOW)).toBe(0)
  })

  it("does not reset streak when routine is not yet past due", () => {
    const task = {
      streak: 3,
      nextDue: new Date("2026-01-20T00:00:00.000Z"), // future
      lastActionAt: null,
      intervalValue: 1,
      intervalUnit: "day",
    }
    expect(computeEffectiveStreak(task, NOW)).toBe(3)
  })

  it("resets streak to 0 after multiple missed cycles (never goes negative)", () => {
    const task = {
      streak: 10,
      nextDue: new Date("2025-12-01T00:00:00.000Z"), // 45 days overdue
      lastActionAt: null,
      intervalValue: 1,
      intervalUnit: "week",
    }
    expect(computeEffectiveStreak(task, NOW)).toBe(0)
  })
})

describe("computeNextDue", () => {
  // NOTE: computeNextDue uses local-time methods (setDate/getDate) internally.
  // Tests use getTime() equality against an identically-computed expected value so
  // they pass in any timezone, rather than asserting a specific UTC date string.

  it("advances by days", () => {
    const from = new Date("2026-01-15T00:00:00.000Z")
    const expected = new Date(from)
    expected.setDate(expected.getDate() + 1)
    expect(computeNextDue(from, 1, "day").getTime()).toBe(expected.getTime())
  })

  it("advances by weeks", () => {
    const from = new Date("2026-01-15T00:00:00.000Z")
    const expected = new Date(from)
    expected.setDate(expected.getDate() + 14)
    expect(computeNextDue(from, 2, "week").getTime()).toBe(expected.getTime())
  })

  it("advances weekday and result is never a Saturday or Sunday", () => {
    // Test from a Tuesday so no timezone can accidentally land on a weekend.
    // 2026-01-13T12:00:00Z is Tuesday in UTC and in any offset from UTC-12 to UTC+14.
    const from = new Date("2026-01-13T12:00:00.000Z")
    const result = computeNextDue(from, 1, "weekday")
    expect(result.getDay()).not.toBe(0) // not Sunday
    expect(result.getDay()).not.toBe(6) // not Saturday
  })

  it("clamps month-end dates correctly", () => {
    // Use a noon UTC time so the local date is the same as UTC in any common timezone.
    // Jan 31 noon + 1 month: if Feb has fewer days, result should be clamped to last day of Feb.
    const from = new Date("2026-01-31T12:00:00.000Z")
    const result = computeNextDue(from, 1, "month")
    // Compute expected the same way the function does, so we test behavior not a hardcoded string.
    const expected = new Date(from)
    const day = expected.getDate() // 31 in any timezone for noon UTC
    expected.setDate(1)
    expected.setMonth(expected.getMonth() + 1)
    expected.setDate(Math.min(day, new Date(expected.getFullYear(), expected.getMonth() + 1, 0).getDate()))
    expect(result.getTime()).toBe(expected.getTime())
    // Verify the result is in February (month 1) — that the clamping fired
    expect(result.getMonth()).toBe(1) // February
  })
})

describe("computePrevDue", () => {
  it("is the inverse of computeNextDue for day cadence", () => {
    const base = new Date("2026-01-15T00:00:00.000Z")
    const next = computeNextDue(base, 3, "day")
    const prev = computePrevDue(next, 3, "day")
    expect(prev.toISOString().slice(0, 10)).toBe("2026-01-15")
  })

  it("is the inverse of computeNextDue for week cadence", () => {
    const base = new Date("2026-01-15T00:00:00.000Z")
    const next = computeNextDue(base, 1, "week")
    const prev = computePrevDue(next, 1, "week")
    expect(prev.toISOString().slice(0, 10)).toBe("2026-01-15")
  })
})
