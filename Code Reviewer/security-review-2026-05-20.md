# Security Review — 2026-05-20

Scope: full repo screening of the live app (Next.js App Router + Prisma + Neon Postgres + Google OAuth, household-scoped multi-tenant).

## Verdict

**Approve with minor changes** — for a single-household, family-only deployment. **Request changes** if multi-household is actually live, because there is a real cross-tenant notification leak path through `Person.email`.

The foundation is in good shape: middleware gates everything except a small allowlist, server actions and API routes consistently re-derive role and household from the DB rather than trusting JWT claims, mutations are whitelisted instead of spread, attachments are proxied through the server with ownership checks, the cron route uses `timingSafeEqual` with a shared secret, CSP/headers are reasonable, and there is no `dangerouslySetInnerHTML` or raw HTML rendering. The findings below are mostly cross-tenant edge cases plus one cron-routing flaw.

## Must Fix

### Issue: `Person.email` is the cross-tenant pivot for notification routing, but it is admin-writable with no same-household check

- **Where:** `app/actions.ts` `updatePerson` (and indirectly `addPerson` if email is set later), combined with `app/api/cron/notify/route.ts` and `lib/require-auth.ts` `getSessionPersonId`.
- **Why it matters:** An admin in household B can set a `Person.email` to the email of a `User` who lives in household A (as long as no `Person` row has already claimed that email globally — `Person.email` is `@unique` but `User.email`/`Person.email` are independent). Two things then break:
  1. The cron groups push targets purely by email (`prisma.user.findMany({ where: { email: { in: ... } } })` and `prisma.pushSubscription.findMany({ where: { userEmail: { in: ... } } })`) with no household predicate. So a task created in household B with an assignee `Person` whose email is the household A user's email will deliver "household B's task title" as a push notification to household A's user. The title is attacker-controlled text.
  2. `getSessionPersonId()` does `prisma.person.findFirst({ where: { email } })` with no household filter. The victim user in household A logs in and their effective `sessionPersonId` is the foreign `Person` in household B. Their home page `assigneeFilter` and `addTask` member flow then operate against a `Person.id` that does not belong to their household.
- **Minimal fix (pick one, ideally both):**
  - In `updatePerson`/`addPerson`, when an email is set, require that a `User` with that lowercased email exists *in the same household* (`prisma.user.findFirst({ where: { email, householdId: sessionUser.householdId } })`). Reject otherwise.
  - In `getSessionPersonId`, scope the lookup: `findFirst({ where: { email, householdId: <sessionUser.householdId> } })`.
  - In `cron/notify`, after grouping by email, filter the user lookup by the *task/recurring task's* `householdId` (or store/lookup subscriptions by `userId`, not loose email). At minimum, when assembling `tzByEmail` and `byEmail`, intersect each task's household with the target user's household before sending.

If only one is feasible right now, fix `updatePerson`/`addPerson` first — it closes the write side and stops the abuse path entirely.

### Issue: Member `addTask` / `addRecurringTask` default `assigneeId` to `sessionPersonId` with no household check

- **Where:** `app/actions.ts` `addTask`, `app/recurring/actions.ts` `addRecurringTask`. The non-admin branch is `[assigneeId, projectId] = [sessionPersonId, null]`. There is no `verifyBelongsToHousehold("person", sessionPersonId, householdId)` on that branch.
- **Why it matters:** Because of the `getSessionPersonId` scoping issue above, a member's `sessionPersonId` can point at a `Person` in another household. The created `Task`/`RecurringTask` then has a `householdId` from the member's session and an `assigneeId` from a different household — a referential anomaly Prisma will happily persist. Anything downstream that assumes assignee.householdId == task.householdId is wrong. This is a direct corollary of the previous issue, but it deserves its own line because the same fix should be applied here as defense in depth: verify the person also.
- **Minimal fix:** Same `verifyBelongsToHousehold("person", sessionPersonId, householdId)` call you already use on the admin branch. If it returns null, treat the task as unassigned or reject.

## Security

### Important

- **PushSubscription has no `userId` / no household link.** The schema keys subscriptions by `userEmail` only. If a user is removed via `removeUser`, their `PushSubscription` rows are not deleted, so a future `Person.email` set to that address would resume delivery to the device of a now-removed user. Move to a `userId Int @relation(...)` foreign key and delete subscriptions when removing a user, or at least delete-by-email in `removeUser` and `removeHouseholdUser`.
- **`/api/cron/notify` `timingSafeEqual` can throw on a malicious Authorization header.** You compare string lengths before calling `timingSafeEqual`, but `Buffer.from(provided)` produces *byte* length, and a multi-byte UTF-8 character makes `provided.length === expected.length` true while the buffer byte counts differ. `timingSafeEqual` then throws and the route 500s with no body. Not exploitable, but it's fragile and makes uptime dashboards noisier than needed. Compare `Buffer.byteLength` or wrap in try/catch and return 401.

### Watch later

- **CSP includes `'unsafe-inline'` in `script-src` in all environments.** Acceptable for App Router today and noted in the 2026-05-19 review. Move to nonces when you're ready to harden — Next.js supports it via middleware.
- **No revocation of side-state on user removal.** Beyond push subscriptions, `Person.email` rows referencing a removed user remain. Consider clearing `Person.email` when the matching `User` is deleted from the household.
- **`/api/uploads/[filename]` does not set `Cache-Control: private`.** Authenticated, private blob content should not be cacheable by intermediaries. Add `Cache-Control: private, no-store` (or `private, max-age=0`) to the response headers.
- **`/api/calendar` requires NextAuth session cookies.** Calendar clients (Google Calendar, iCal, Outlook) do not carry those, so the feed is unsubscribable from real calendar apps. If/when you want subscriptions to work, add a per-user signed token URL (separate from the session cookie path) rather than relaxing auth on the route.
- **`/api/pwa-icon` is behind `withAuth`.** Browsers fetching manifest icons typically do *not* send credentials. Unauthenticated PWA install flows will 401. Add `/api/pwa-icon` to the middleware matcher's exclusion list — this is a functional fix that also removes one auth-protected endpoint from the attack surface.
- **No rate limiting on auth or write endpoints.** For an allowlisted personal app, low priority. Worth a thought before opening this to families beyond your own.
- **PII in logs.** `console.error("Push notification failed for", sub.userEmail, ...)` writes user email to Vercel logs. Switch to a stable ID or hash if you ever review logs in a shared context.
- **`Person.email` global `@unique`.** Two households cannot both have the same email as a `Person`. This is the constraint that *limits* the severity of the cross-tenant issue above, but it also means an attacker who claims an email blocks it for everyone else. Worth being aware of when you tighten the same-household check.

### No issues found

- No raw HTML rendering, no `dangerouslySetInnerHTML`. `react-markdown` is used without `rehype-raw`, and the default URL transform strips `javascript:` / `data:` link schemes.
- No raw SQL or `$queryRaw` — Prisma is used throughout.
- Server actions consistently re-derive `role` and `householdId` from the DB (`getDbUser` in `lib/require-auth.ts`), so a tampered JWT can't elevate to admin.
- Mutations are whitelisted into an explicit `update` object (good — no `data: {...formData}` spreads anywhere).
- Attachment serve route correctly path-traversal-checks `filename`, looks up by `(filename, note.householdId)`, proxies through the server with `BLOB_READ_WRITE_TOKEN`, and sanitises `Content-Disposition` filenames.
- ICS escaping in `/api/calendar` correctly handles `\`, `;`, `,`, and newlines.
- `getSessionUser` calls in admin-only actions correctly enforce `role !== "admin"` *and* scope the Prisma `where` by `householdId`, so admin in household A cannot touch household B's rows even with a guessed `id`.
- Superadmin gated by `SUPERADMIN_EMAIL` env at every action and at the page redirect.

## Simplify

Not really a security ask, but related to the fixes above:

- `getDbUser` is invoked 2–3 times per server-action call (`getSessionUser`, then `getSessionPersonId` re-fetches the session and a separate `Person` lookup, then sometimes `requireAssignedOrAdmin` re-fetches again). Combining `getSessionUser` and `getSessionPersonId` into a single helper that returns `{ role, householdId, personId }` from one DB round-trip would shrink the surface area where household-scoping can go wrong and remove a real source of "did I check this?" cognitive load. This is the kind of small refactor where the *security* benefit (one place to audit scoping) is larger than the perf benefit.

## Best-Practice Notes

- Consider adding a Prisma DB-level constraint that `Task.assigneeId` references a `Person` in the same household. Postgres can enforce this with a composite FK on `(assigneeId, householdId) → Person(id, householdId)` after you add a corresponding composite unique index on `Person`. That makes the cross-household assignee bug structurally impossible.
- `addPerson` accepts only `name`. The email-set path is only `updatePerson`. Consider funneling all writes through one helper so the "must be a same-household User" check has one home.
- The Vercel cron schedule isn't in `vercel.json` (it's empty `{}`). If the cron isn't firing on schedule, that's why. (Not a security finding — but worth confirming, since "the cron never ran" looks identical to "the cron ran and found nothing.")

## Phase Alignment

The codebase has grown well past the "tasks MVP" the PROJECT_PLAN.md / CLAUDE.md describe as the phase scope — projects, notes, attachments, household tenancy, push notifications, calendar feed, superadmin, and reminders are all live. That's fine for an app already in production, and this review treats it as such. The findings above are appropriate for that deployed state, not for an MVP. No feature creep introduced in *this* review.

## Patch

Sketch of the two minimum-viable fixes. Drop these into `app/actions.ts` and `lib/require-auth.ts` respectively.

```ts
// lib/require-auth.ts — scope sessionPersonId to the session user's household
export async function getSessionPersonId(): Promise<number | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return null
  const user = await prisma.user.findUnique({
    where: { email },
    select: { householdId: true },
  })
  if (!user) return null
  const person = await prisma.person.findFirst({
    where: { email, householdId: user.householdId },
    select: { id: true },
  })
  return person?.id ?? null
}
```

```ts
// app/actions.ts — require Person.email to match a same-household User
export async function updatePerson(id: number, data: { email?: string | null; isKid?: boolean }) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  const update: { email?: string | null; isKid?: boolean } = {}
  if (data.isKid !== undefined) update.isKid = !!data.isKid
  if (data.email !== undefined) {
    const email = typeof data.email === "string" ? (data.email.toLowerCase() || null) : data.email
    if (email) {
      if (!EMAIL_RE.test(email)) return { error: "Invalid email address" }
      const matching = await prisma.user.findFirst({
        where: { email, householdId: sessionUser.householdId },
        select: { id: true },
      })
      if (!matching) return { error: "That email isn't a member of this household yet — invite them first." }
    }
    update.email = email
  }
  await prisma.person.update({
    where: { id, householdId: sessionUser.householdId },
    data: update,
  })
  revalidatePath("/", "layout")
}
```

The member-flow `addTask` / `addRecurringTask` change is a one-liner each: wrap the non-admin branch in `verifyBelongsToHousehold("person", sessionPersonId, householdId)` and fall back to `null` if it returns null.

## Final Recommendation

Fix the `Person.email` scoping + member-flow assignee verification first — those are the two changes that actually close a cross-tenant path. Then clean up the `PushSubscription` linkage and the `timingSafeEqual` robustness in a follow-up. Everything else is "watch later." Don't pause shipping on the rest.
