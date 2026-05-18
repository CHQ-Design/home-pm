# Multi-Household Support — Implementation Brief

## Goal

Allow multiple isolated families to use the same app. Craig's household and his sister's household each see only their own data. No data leaks between households.

## Current state (what needs to change)

- Auth is controlled by an `ALLOWED_EMAILS` env var. No `User` table in the database.
- No ownership on any data model — all Tasks, Projects, Notes, RecurringTasks, and People are global.
- Role (admin/member) is determined by comparing the session email to `ADMIN_EMAIL` env var.
- `lib/require-auth.ts` resolves the current user's `Person` record by matching email to `person.email`.

---

## Phase 1 — Schema

### New models

Add to `prisma/schema.prisma`:

```prisma
model Household {
  id        Int       @id @default(autoincrement())
  name      String
  createdAt DateTime  @default(now())
  users     User[]
  people    Person[]
  tasks     Task[]
  projects  Project[]
  notes     Note[]
  recurringTasks RecurringTask[]
}

model User {
  id          Int       @id @default(autoincrement())
  email       String    @unique  // lowercase, matches Google account
  name        String?
  role        String    @default("member")  // "admin" | "member"
  householdId Int
  household   Household @relation(fields: [householdId], references: [id])
  createdAt   DateTime  @default(now())
}
```

### Add `householdId` to every existing model

Add the following field + relation to: `Task`, `Project`, `Note`, `RecurringTask`, `Person`.

Example (same pattern for all five):
```prisma
householdId Int
household   Household @relation(fields: [householdId], references: [id])
```

`Attachment` does not need `householdId` — it's always reached through `Note` which is already scoped.

`PushSubscription` already stores `userEmail`, which is sufficient to scope push notifications — leave it as-is for now.

### Apply the migration

```bash
npx prisma db push
```

Then run a one-time seed script (see Phase 4) before any app code goes live.

---

## Phase 2 — Auth

### Replace env var allowlist with database lookup

In `lib/auth.ts`, change the `signIn` callback to look up the user in the `User` table instead of checking `ALLOWED_EMAILS`:

```ts
async signIn({ user }) {
  const email = user.email?.toLowerCase()
  if (!email) return false
  const dbUser = await prisma.user.findUnique({ where: { email } })
  return dbUser !== null
},
```

### Thread `householdId` and `role` through the JWT and session

In `lib/auth.ts`, update the `jwt` and `session` callbacks to read role and householdId from the database, not from env vars:

```ts
async jwt({ token }) {
  const email = (token.email as string | undefined)?.toLowerCase()
  if (email) {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { role: true, householdId: true },
    })
    token.role = dbUser?.role ?? "member"
    token.householdId = dbUser?.householdId ?? null
  }
  return token
},
async session({ session, token }) {
  if (session.user) {
    session.user.role = token.role as string
    session.user.householdId = token.householdId as number | null
  }
  return session
},
```

Update `next-auth.d.ts` (or `types/next-auth.d.ts`) to extend the session types:

```ts
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      householdId?: number | null
    }
  }
}
```

### Update `lib/require-auth.ts`

Replace `getRole()` (which read from env vars) with a database lookup. Add a `getSessionHouseholdId()` helper that every server action will use:

```ts
export async function getSessionUser(): Promise<{ role: string; householdId: number } | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return null
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, householdId: true },
  })
  return user ?? null
}
```

Remove `ADMIN_EMAIL` env var usage from `lib/auth.ts`. The role now comes from the database.

---

## Phase 3 — Query updates

Every server action that reads or writes data must be scoped to the current household.

**Pattern for reads:**
```ts
const { householdId } = await getSessionUser()  // or throw if null
const tasks = await prisma.task.findMany({
  where: { householdId },
  // ...rest of query
})
```

**Pattern for creates:**
```ts
await prisma.task.create({
  data: {
    // ...existing fields
    householdId,
  },
})
```

### Files to update (all server actions and page-level queries):

- `app/actions.ts` — task CRUD
- `app/notes/actions.ts` — note CRUD
- `app/projects/actions.ts` — project CRUD
- `app/recurring/actions.ts` — recurring task CRUD
- `app/page.tsx` — main task list query
- `app/notes/page.tsx` — notes query
- `app/projects/page.tsx` — projects list query
- `app/projects/[id]/page.tsx` — single project query
- `app/recurring/page.tsx` — recurring tasks query
- `app/settings/page.tsx` — people query
- `app/api/calendar/route.ts` — calendar export query
- `app/api/cron/notify/route.ts` — cron job (see note below)

**Cron job note:** The notify cron runs across all users. It should continue to query all records globally (no householdId filter) — its job is to find anything due for a reminder and send a push. No change needed here unless you later want per-household cron logic.

**People manager note:** `people-manager.tsx` / the people-related actions should scope `Person` queries to `householdId`. A person in Craig's household is not visible to Craig's sister's household.

---

## Phase 4 — Migration seed script

Create `scripts/seed-household.ts`. Run it once after `prisma db push` to assign Craig's existing data to a new household.

```ts
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  // 1. Create Craig's household
  const household = await prisma.household.create({
    data: { name: "Craig's Family" },
  })

  // 2. Create User records for everyone currently in ALLOWED_EMAILS
  //    Set Craig's email as admin, rest as member
  //    Replace these emails with the real values
  const CRAIG_EMAIL = "craigregister@hey.com"
  const MEMBER_EMAILS: string[] = [
    // add kid emails here
  ]

  await prisma.user.create({
    data: { email: CRAIG_EMAIL, role: "admin", householdId: household.id },
  })
  for (const email of MEMBER_EMAILS) {
    await prisma.user.create({
      data: { email, role: "member", householdId: household.id },
    })
  }

  // 3. Assign all existing data to Craig's household
  const hid = household.id
  await prisma.task.updateMany({ data: { householdId: hid } })
  await prisma.project.updateMany({ data: { householdId: hid } })
  await prisma.note.updateMany({ data: { householdId: hid } })
  await prisma.recurringTask.updateMany({ data: { householdId: hid } })
  await prisma.person.updateMany({ data: { householdId: hid } })

  console.log("Seeded household:", household.id)
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

Run with:
```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-household.ts
```

---

## Phase 5 — Invite UI

Household admins need a way to add new users. Add this to `app/settings/page.tsx` (admin-only section).

**Invite form** — takes an email and role (admin/member), creates a `User` record in the admin's household. The invitee doesn't need to do anything special — next time they sign in with that Google account, the `signIn` callback finds their record and lets them in.

**Member list** — show all `User` records for the current household. Admin can remove members (deletes the `User` record; does not delete their assigned tasks).

No email sending needed. Just tell Craig out-of-band: "I've added you, sign in with your Google account."

---

## Sequence of work

Do these in order. Don't move to the next step until the current one works.

1. **Schema** — add models, run `prisma db push`, verify Prisma Studio shows the new tables
2. **Seed** — run seed script, verify all existing data has a `householdId`
3. **Auth** — update `lib/auth.ts` and `lib/require-auth.ts`, test that Craig can still sign in
4. **Queries** — update all server actions and page queries, test each section of the app
5. **Invite UI** — add member management to settings

## What not to change

- Don't merge `User` and `Person` — keep them separate. A `Person` is an assignable name; a `User` is a login. They can share an email but serve different purposes.
- Don't add per-household settings or customization — that's out of scope.
- Don't change the cron notify route to be household-aware unless a specific bug requires it.
- Don't remove `ALLOWED_EMAILS` env var until the seed is confirmed and auth is working from the database.
