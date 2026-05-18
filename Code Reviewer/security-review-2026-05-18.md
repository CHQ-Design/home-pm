# Security Review — Home PM
**Date:** 2026-05-18
**Scope:** Full codebase review with focus on security and pen testing. Changes since last review include: file uploads/attachments, push notifications + cron, calendar feed, role system (admin/member), streak tracking, projects/notes/recurring tasks.

---

## Verdict: Request Changes

Two fixable issues before this is clean. The auth architecture is solid — server actions uniformly call `requireRole` or `requireAssignedOrAdmin` before touching data, the upload pipeline is well-defended. Most findings are one critical bypass, one authorization gap, and a handful of watch-later items.

---

## Must Fix

### 1. CRON_SECRET Undefined Bypass

**File:** `app/api/cron/notify/route.ts`

**Issue:** The cron endpoint checks:
```ts
request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
```
If `CRON_SECRET` is missing from the environment, `process.env.CRON_SECRET` is `undefined`, and the comparison becomes `header !== "Bearer undefined"`. Anyone who sends `Authorization: Bearer undefined` passes the check and triggers a push to every subscriber.

**Why it matters:** This is a public endpoint with no other protection. It fires push notifications to all users, exposes task/routine titles in the notification body, and could be used to spam or probe your subscriber list.

**Minimal fix:**
```ts
const secret = process.env.CRON_SECRET
if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

---

### 2. Calendar Endpoint Returns All Tasks to Any Authenticated User

**File:** `app/api/calendar/route.ts`

**Issue:** The handler checks that you're logged in, but not whether you're an admin:
```ts
const session = await getServerSession(authOptions)
if (!session) return new NextResponse("Unauthorized", { status: 401 })

const tasks = await prisma.task.findMany({
  where: { dueDate: { not: null }, completed: false },
  include: { assignee: true },
  ...
})
```
Any member (non-admin) who subscribes their calendar app to `/api/calendar` gets every task in the database — including tasks assigned to other people, their names, notes, and due dates.

**Why it matters:** The rest of the app carefully scopes member views. This endpoint silently bypasses that. Even if members currently trust each other, this is an authorization inconsistency that should be explicit.

**Minimal fix — restrict to admin only:**
```ts
const role = getRole(session.user?.email)
if (role !== "admin") return new NextResponse("Forbidden", { status: 403 })
```
Or filter by the caller's assigned tasks (same pattern used in the cron notify handler). Pick whichever matches your intent — but the current behavior of "any member sees everything" is almost certainly not intentional.

---

## Security Findings

### Critical
- **CRON_SECRET undefined bypass** — see Must Fix #1

### Important
- **Calendar endpoint authorization gap** — see Must Fix #2

### Watch Later
- **JWT role is stale until token expiry.** The `jwt` callback bakes `role` into the token at sign-in time. If you change `ADMIN_EMAIL` or remove someone from `ALLOWED_EMAILS`, their existing session still carries the old role until it expires (NextAuth default: 30 days). Not a problem today, but note it for the day you need to revoke access quickly.

- **No HTTP security headers.** `next.config.ts` has no `headers()` export. Consider adding `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a basic CSP before sharing or deploying more broadly. Low effort, meaningful on a family-shared app.

- **`pwa-icon` route has no size bounds.** `Number(req.nextUrl.searchParams.get("size") ?? "512")` — a request with `?size=99999` will try to allocate a very large ImageResponse. Clamp it:
  ```ts
  const size = Math.min(Math.max(Number(req.nextUrl.searchParams.get("size") ?? "512") || 512, 16), 1024)
  ```

---

## Best-Practice Notes

- **`updatePerson` doesn't lowercase email before storing it.** `getSessionPersonId` and `requireAssignedOrAdmin` both lowercase the session email before querying. If an admin stores `"Craig@Gmail.com"`, the lookup for `"craig@gmail.com"` won't find that person, and they'll hit "Your account isn't linked to a person yet" permanently. Normalize on write in `updatePerson`.

- **`addProject` doesn't guard against a null form field.** In `projects/actions.ts`:
  ```ts
  const name = (formData.get("name") as string).trim()  // throws TypeError if null
  ```
  Compare to the safer pattern in `app/actions.ts`:
  ```ts
  const title = ((formData.get("title") as string) ?? "").trim()
  ```
  Not a security issue, but a malformed request would 500 instead of silently return.

- **Attachment metadata isn't verified against disk.** When `addNote` receives `AttachmentInput[]` from the client, it validates the UUID filename format and field types but doesn't confirm the file actually exists or that the claimed `size` matches the file on disk. Risk is cosmetic (wrong metadata stored), not a security hole.

- **`allowedDevOrigins` has a local IP committed.** `next.config.ts` has `allowedDevOrigins: ["192.168.4.56"]`. Fine for dev, but if this repo ever goes public or gets shared, that internal IP leaks. Worth cleaning up.

---

## Simplify

Nothing meaningful to remove. `sanitizeAttachments` UUID regex is the right level of rigor. The role/session helpers in `lib/require-auth.ts` are clean and well-factored. No scope creep visible.

---

## Phase Alignment

Solid. Tasks, projects, recurring, notes, auth, and notifications all match the roadmap. No speculation or premature architecture visible.

---

## Final Recommendation

Fix the CRON_SECRET guard and the calendar authorization first — both are one-liners. Fix the email normalization on write in `updatePerson` in the same pass, since it would cause real user confusion. Everything else is watch-later for a personal app at this stage.
