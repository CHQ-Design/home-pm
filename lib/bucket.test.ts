import { describe, it, expect } from "vitest"
import { bucketForTask, bucketForRoutine } from "./bucket"

// Fixed reference: Wednesday 2026-05-20, week ends Sunday 2026-05-24
const TODAY = "2026-05-20"
const END_OF_WEEK = "2026-05-24"

describe("bucketForTask", () => {
  it("puts an overdue task in Today (any priority)", () => {
    expect(bucketForTask("2026-05-19", "low", TODAY, END_OF_WEEK)).toBe("today")
    expect(bucketForTask("2026-05-01", "medium", TODAY, END_OF_WEEK)).toBe("today")
  })

  it("puts a due-today task in Today regardless of priority", () => {
    expect(bucketForTask("2026-05-20", "high",   TODAY, END_OF_WEEK)).toBe("today")
    expect(bucketForTask("2026-05-20", "medium", TODAY, END_OF_WEEK)).toBe("today")
    expect(bucketForTask("2026-05-20", "low",    TODAY, END_OF_WEEK)).toBe("today")
  })

  it("puts a task due within the week in This week", () => {
    expect(bucketForTask("2026-05-21", "low",  TODAY, END_OF_WEEK)).toBe("thisWeek") // Thu
    expect(bucketForTask("2026-05-24", "high", TODAY, END_OF_WEEK)).toBe("thisWeek") // Sun (end of week inclusive)
  })

  it("puts a task due after Sunday in Later", () => {
    expect(bucketForTask("2026-05-25", "high",   TODAY, END_OF_WEEK)).toBe("later") // Mon next week
    expect(bucketForTask("2026-06-01", "medium", TODAY, END_OF_WEEK)).toBe("later")
  })

  it("puts an undated high-priority task in This week", () => {
    expect(bucketForTask(null,      "high", TODAY, END_OF_WEEK)).toBe("thisWeek")
    expect(bucketForTask(undefined, "high", TODAY, END_OF_WEEK)).toBe("thisWeek")
  })

  it("puts undated medium/low tasks in Later", () => {
    expect(bucketForTask(null, "medium", TODAY, END_OF_WEEK)).toBe("later")
    expect(bucketForTask(null, "low",    TODAY, END_OF_WEEK)).toBe("later")
  })
})

describe("bucketForRoutine", () => {
  it("puts a routine due today in Today", () => {
    expect(bucketForRoutine("2026-05-20", TODAY, END_OF_WEEK)).toBe("today")
  })

  it("puts an overdue routine in Today", () => {
    expect(bucketForRoutine("2026-05-15", TODAY, END_OF_WEEK)).toBe("today")
  })

  it("puts a routine due within the week in This week", () => {
    expect(bucketForRoutine("2026-05-21", TODAY, END_OF_WEEK)).toBe("thisWeek") // Thu
    expect(bucketForRoutine("2026-05-24", TODAY, END_OF_WEEK)).toBe("thisWeek") // Sun
  })

  it("puts a routine due after Sunday in Later", () => {
    expect(bucketForRoutine("2026-05-25", TODAY, END_OF_WEEK)).toBe("later")
  })
})
