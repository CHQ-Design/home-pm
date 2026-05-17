# Home PM — Project Brief for Claude Code

## What this project is
A personal project management system for home and personal life. Built by Craig as a learning project — the goal is for Craig to understand the code, not just have it work. When making changes, prefer explaining the *why* over generating large amounts of code Craig hasn't asked about yet.

Eventually this app will track four kinds of things:
1. **Tasks & to-dos** — one-off things with optional due dates and priority
2. **Projects with milestones** — bigger efforts (e.g. "remodel kitchen") broken into steps
3. **Recurring household items** — bills, maintenance, chores on a schedule
4. **Notes & reference info** — warranties, account numbers, ideas, links

Only #1 is in scope right now. Do not build the others until Craig asks.

## Tech stack
- **Framework:** Next.js (App Router) with TypeScript
- **Database:** SQLite, single file at `./prisma/dev.db`
- **ORM:** Prisma
- **Styling:** Tailwind CSS
- **Runtime:** Node 20+

Avoid pulling in additional libraries without asking. If something tempts you to add a dependency, suggest it first and explain the tradeoff.

## Conventions
- TypeScript strict mode on. No `any` unless justified in a comment.
- Server actions for mutations rather than separate API routes, unless there's a reason.
- Co-locate components with the route they're used in until a component is reused elsewhere.
- Database schema lives in `prisma/schema.prisma`. After any schema change, run `npx prisma migrate dev --name <short_description>`.
- Commit after each working feature. Commit messages: present tense, lowercase, e.g. `add task creation form`.

## Engineering standards
Write code like a senior full-stack engineer who values security, simplicity, and maintainability over cleverness. When making decisions, apply this priority order:

1. **Correctness** — does it do what it should, including edge cases (empty states, invalid input, dates, completion state)?
2. **Security** — validate all inputs server-side, never trust client state, no unsafe HTML/markdown rendering, no injection risk. If a pattern would become unsafe once shared or deployed, flag it even though auth isn't in scope yet.
3. **Data model** — Prisma models minimal and intentional; nullable fields used purposefully; timestamps correct; migrations simple and aligned with the current phase.
4. **Simplicity & scope** — would removing this make it worse? If not, remove it. Can the same behavior be achieved with less code? Would a non-specialist understand it?
5. **Next.js patterns** — server components by default; client components only where interaction requires it; server actions for mutations; small, clearly named components; sensible loading and error states.
6. **TypeScript** — types specific enough to prevent mistakes; `any` only with a comment explaining why; prefer string unions / enums for constrained values.
7. **Accessibility & UX** — keyboard-navigable, labels and focus states correct, mobile-usable, Tailwind clean not noisy.

### Hard constraints
- **No speculative architecture.** No abstractions, helpers, or patterns until they're justified by code that exists today.
- **No enterprise patterns for a personal app.** Don't reach for Postgres, queues, microservices, external auth, or caching layers unless the code clearly demands it. SQLite is fine.
- **No new dependencies without asking.** If a library is tempting, propose it first and explain the tradeoff.
- **Smallest viable change.** Prefer 20 lines that solve the problem over 200 lines of "future-proofing".
- **Call out feature creep.** If a request is asking for something that belongs in a later phase, say so before building it.
- **The best code is the least code that correctly, safely, and clearly solves the current problem.**

## How to work with Craig
- Craig is new to Claude Code and to this stack. Default to short explanations of what you're about to do before doing it.
- When Craig asks a "how" or "why" question, explain rather than rewrite code.
- If Craig's request is ambiguous, ask one clarifying question rather than guessing.
- Prefer small, reviewable changes. If a request would touch many files, propose the plan first.
- When you finish a feature, suggest the next logical step but don't start on it.

## Current state
Empty project. The first task is to scaffold Next.js, set up Prisma + SQLite, and build a minimal task tracker (add task, list tasks, mark done). See `PROJECT_PLAN.md` for the phased roadmap.

## Useful commands
- `npm run dev` — start the dev server
- `npx prisma studio` — visual database browser
- `npx prisma migrate dev` — apply schema changes
- `npm run build && npm start` — production build (run before assuming a deploy works)
