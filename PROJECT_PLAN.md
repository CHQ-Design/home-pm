# Home PM — Project Plan

A phased roadmap. Finish each phase end-to-end (data, backend, UI, polish) before starting the next. The point is to keep the surface area small enough that you understand every line.

---

## Phase 0 — Setup (one session)
**Goal:** A running Next.js app with SQLite wired in and Tailwind working.

- [ ] Scaffold Next.js with TypeScript + Tailwind (`npx create-next-app@latest`)
- [ ] Add Prisma + SQLite (`npm i -D prisma && npx prisma init --datasource-provider sqlite`)
- [ ] Add a trivial `Hello` model, migrate, query it from the homepage to prove the stack works
- [ ] Initialize git, first commit
- [ ] Drop `CLAUDE.md` and `PROJECT_PLAN.md` into the repo root

**Done when:** `npm run dev` shows data fetched from SQLite on `localhost:3000`.

---

## Phase 1 — Tasks MVP (1–2 sessions)
**Goal:** A working personal task list you'd actually use.

- [ ] `Task` model: `id`, `title`, `notes` (optional), `dueDate` (optional), `priority` (low/med/high), `completed` (bool), `createdAt`, `completedAt` (optional)
- [ ] Page at `/` showing open tasks, grouped by overdue / today / upcoming / no date
- [ ] Form to add a task (title required, everything else optional)
- [ ] Checkbox to mark done; completed tasks hide by default with a "show completed" toggle
- [ ] Edit and delete a task
- [ ] Keyboard: pressing Enter in the title field adds the task

**Done when:** You've used it for a few days and noticed what's missing. Resist adding features before you have real friction.

---

## Phase 2 — Projects with milestones
**Goal:** Group related tasks under a parent project with progress visible at a glance.

- [ ] `Project` model: `id`, `name`, `description`, `status` (active/paused/done), `createdAt`
- [ ] Tasks gain an optional `projectId`
- [ ] `/projects` index page; `/projects/[id]` detail page showing tasks under it
- [ ] Progress indicator (e.g. "4 of 11 done")
- [ ] Sidebar or top nav linking Tasks ↔ Projects

---

## Phase 3 — Recurring household items
**Goal:** Bills, maintenance, chores that repeat. The trick is generating the next instance when one is completed.

- [ ] `RecurringTask` model: `id`, `title`, `cadence` (e.g. "monthly", "every 3 months", or a cron-like expression), `nextDue`, `lastCompleted`
- [ ] When you mark one complete, the next instance's `nextDue` is computed automatically
- [ ] These appear in the main task list alongside one-offs but visually distinct
- [ ] Page at `/recurring` to manage the templates themselves

---

## Phase 4 — Notes & reference info
**Goal:** A place for the boring-but-important stuff (warranties, account numbers, links).

- [ ] `Note` model: `id`, `title`, `body` (markdown), `tags` (string array or join table), `createdAt`, `updatedAt`
- [ ] `/notes` index with search
- [ ] `/notes/[id]` view; edit in place
- [ ] Decide whether notes attach to projects (probably yes — a project's notes live with it)

---

## Phase 5+ — Quality of life (pick as you feel friction)
- Mobile-friendly layout (you'll want this on your phone)
- Authentication if anyone else in the household uses it
- Backups (a nightly copy of `dev.db` somewhere)
- Deploy somewhere (Fly.io or a Raspberry Pi on your network)
- Notifications for due/overdue items (email or push)
- Import/export to CSV

---

## Working principles
- **Use it before you extend it.** Each phase only earns the next if you've actually used what you just built.
- **One feature per branch / commit.** Easier to revert; easier for Claude Code to reason about.
- **Ask Claude to explain, not just write.** The goal is for you to understand the code by the end.
- **Don't optimize early.** SQLite + Next.js will handle thousands of tasks fine. Don't worry about scale.
