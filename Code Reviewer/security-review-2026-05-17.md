# Security Review — home-pm
**Date:** 2026-05-17  
**Reviewer:** Penetration tester pass  
**Verdict:** Request changes

---

## Summary

The codebase has solid bones — auth is wired up, most mutations are gated, file uploads have extension allowlisting and size checks. But there are three distinct issues worth fixing, one of which is a genuine unauthenticated data exposure.

---

## 🔴 Critical

### `/api/calendar` — fully unauthenticated

`app/api/calendar/route.ts` has no session check. It dumps every incomplete task that has a due date: titles, notes, assignee names, and priorities. No token, no cookie, nothing required. Any unauthenticated visitor who guesses or discovers the URL gets your entire task list.

**Fix** — add a session check at the top of the `GET` handler:

```ts
// app/api/calendar/route.ts
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  // ...rest of handler unchanged
}
```

**Note:** This will break calendar subscriptions in clients like Apple Calendar that don't pass cookies. The standard approach for those is a long, secret, user-specific token in the URL (e.g. `/api/calendar?token=<secret>`). For now, add the auth check — token support can come later when needed.

---

## 🟡 Important

### `/api/subscribe` — no input validation on the JSON body

`app/api/subscribe/route.ts` does `const sub = await request.json()` and immediately accesses `sub.endpoint`, `sub.keys.p256dh`, and `sub.keys.auth` with no shape check. A malformed body causes a runtime crash (500) or garbage written to the DB. An authenticated user can POST `{}` and get an unhandled exception.

**Fix:**

```ts
const sub = await request.json()
if (
  typeof sub?.endpoint !== "string" ||
  typeof sub?.keys?.p256dh !== "string" ||
  typeof sub?.keys?.auth !== "string"
) {
  return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
}
```

---

### File download route — no ownership check

`app/api/uploads/[filename]/route.ts` verifies a session exists but not whether the requesting user has access to the attachment. Any authenticated user who knows a UUID filename can download any file — including attachments on notes they weren't involved with. Right now everyone is either an admin or a member with limited write access, so the blast radius is small. But as users are added, this becomes a real lateral read.

**Fix** — verify the attachment exists in the DB before serving it:

```ts
const att = await prisma.attachment.findFirst({
  where: { filename },
  select: { id: true },
})
if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 })
// then serve the file
```

This is a single query. Worth doing now before the data grows.

---

## 🔵 Watch (acceptable now, fix before adding users)

### `addNote` trusts client-provided attachment metadata

The `AttachmentInput` type (`filename`, `originalName`, `mimeType`, `size`) comes from the client. The `filename` ends up in the DB and later in the download URL. A crafty authenticated user could call the server action with a crafted filename. The download endpoint's `..` check and UUID-only naming on upload limit the damage, but the server action itself never cross-references the filename against actually-uploaded files.

---

### Live credentials in `.env`

`.env` is gitignored and not in git history (confirmed). But it contains a live Neon PostgreSQL connection string, Google OAuth client secret, `NEXTAUTH_SECRET`, VAPID private key, and `CRON_SECRET`. If this file has ever been shared, pasted into a chat, or screen-shared, rotate those values.

High-value targets specifically:
- `NEXTAUTH_SECRET` — controls session forgery
- `GOOGLE_CLIENT_SECRET` — controls OAuth
- `DATABASE_URL` — direct database access

---

### `updateRecurringTask` — `intervalValue` not validated as a positive integer

The `intervalValue` from the caller is passed directly to Prisma without a `> 0` integer check. An admin passing `0` or `-1` would break `computeNextDue` and create a stuck recurring task.

**Fix:** Add before the update:

```ts
if (data.intervalValue !== undefined &&
    (!Number.isInteger(data.intervalValue) || data.intervalValue < 1)) return
```

---

## Schema / Documentation Drift

`CLAUDE.md` describes the stack as SQLite. The actual `schema.prisma` uses `postgresql` pointing to a live Neon instance. Not a security issue, but it means anyone reading `CLAUDE.md` — including future Claude sessions — has wrong context. Update it.

---

## Priority Order

| # | Issue | File | Urgency |
|---|-------|------|---------|
| 1 | Unauthenticated calendar endpoint | `app/api/calendar/route.ts` | Fix now |
| 2 | No body validation on push subscribe | `app/api/subscribe/route.ts` | Fix now |
| 3 | No ownership check on file downloads | `app/api/uploads/[filename]/route.ts` | Fix before adding users |
| 4 | Attachment metadata trusted from client | `app/notes/actions.ts` | Fix before adding users |
| 5 | `intervalValue` not validated as positive int | `app/recurring/actions.ts` | Low urgency |
| 6 | Rotate credentials if `.env` was ever shared | — | Operational |
| 7 | Update CLAUDE.md to reflect PostgreSQL | `CLAUDE.md` | Housekeeping |
