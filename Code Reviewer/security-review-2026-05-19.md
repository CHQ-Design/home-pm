# Security Review — Home PM
**Date:** 2026-05-19  
**Scope:** Full codebase (~40 commits, including notes/attachments, push notifications, calendar export, superadmin, and all recent UI/UX changes)  
**Verdict:** Approve with minor changes

---

## Summary

The codebase has a genuinely solid security foundation. Auth is enforced correctly across middleware, signIn callbacks, and server actions. Authorization uses server-side DB re-fetches rather than trusting token claims. Household scoping is applied consistently to all mutations. No dangerouslySetInnerHTML, no secrets leaking to client, no SQL injection via raw queries.

Two actionable issues below are real but small. The rest are watch-later items, not blockers.

---

## Must Fix

### 1. `updateUserRole` — no runtime role validation

**File:** `app/settings/actions.ts`, line 52  
**Issue:** The `role` parameter is typed as `"admin" | "member"` in TypeScript, but server actions can be invoked with arbitrary values at runtime. There is no check before the `prisma.user.update` call that `role` is actually one of those two strings.

**Why it matters:** An attacker with household-admin access could call `updateUserRole` with a crafted role string (e.g. `"superadmin"`) and store it in the DB. Downstream role checks that do strict equality (`role === "admin"`) would not match, but it could produce unexpected behavior in current or future code.

**Minimal fix:** Add the same guard used in `addHouseholdUser`:

```ts
if (role !== "admin" && role !== "member") return { error: "Invalid role" }
```

Place it immediately after the `sessionUser` check.

---

### 2. `updatePerson` — no email format validation

**File:** `app/actions.ts`, line 146  
**Issue:** When an admin updates a person's email, the value is lowercased and stored without any format check. Every other action that accepts an email (settings, superadmin) validates with `EMAIL_RE`.

**Why it matters:** A malformed email stored on a `Person` record would cause the `getSessionPersonId` lookup (`prisma.person.findFirst({ where: { email } })`) to silently fail for that person. That person would lose the ability to toggle their own tasks or complete routines.

**Minimal fix:**

```ts
export async function updatePerson(id: number, data: { email?: string | null; isKid?: boolean }) {
  const sessionUser = await getSessionUser()
  if (sessionUser?.role !== "admin") throw new Error("Not authorized")
  
  let email = typeof data.email === "string" ? (data.email.toLowerCase() || null) : data.email
  if (email && !EMAIL_RE.test(email)) return { error: "Invalid email address" }
  
  await prisma.person.update({ where: { id, householdId: sessionUser.householdId }, data: { ...data, email } })
  revalidatePath("/", "layout")
}
```

Import `EMAIL_RE` from a shared location or re-declare it — it's already defined in `settings/actions.ts` and `superadmin/actions.ts`, so this is also a good candidate to extract to `lib/parse.ts`.

---

## Security

### Critical

None.

---

### Important

The two "must fix" items above. Both are admin-only actions, which significantly limits exploitability, but they should be tightened for consistency and correctness.

---

### Watch Later (acceptable now, revisit before wider deployment)

**a. `api/uploads/[filename]` trusts session token's `householdId` without DB re-fetch**

`app/api/uploads/[filename]/route.ts` reads `householdId` from `session.user.householdId` (which comes from the JWT token, not a live DB query) and uses it to scope the attachment lookup. Every server action re-fetches from DB. This route doesn't. If a user's `householdId` ever changed (e.g. moved between households in superadmin), they could retain stale access to attachments until their token expired.

For the current single-household-per-user model this is very low risk, but it's inconsistent with your own established pattern. A simple fix would be to call `getSessionUser()` instead.

**b. `sanitizeAttachments` accepts arbitrary `mimeType` and `blobUrl` from the client**

`app/notes/actions.ts` receives `AttachmentInput` from the client and stores `mimeType` and `blobUrl` without validation. The serve route correctly ignores the stored `mimeType` (it re-derives it from the file extension), so there's no content-type sniffing risk there. But an admin who crafts a direct server action call could store an arbitrary `blobUrl`. On note/attachment deletion, that URL is passed to Vercel's `del()` — which would only affect your own Vercel Blob store, not an arbitrary URL, but it's still unexpected behavior.

Minimum hardening: validate `blobUrl` starts with `https://` and your Vercel Blob hostname if it's a known constant.

**c. CSP uses `script-src 'unsafe-inline'`**

`next.config.ts` includes `'unsafe-inline'` in `script-src` for all environments (only `'unsafe-eval'` is dev-only). This is common for Next.js App Router, but it means CSP won't block inline XSS payloads if one ever existed. Since you have no `dangerouslySetInnerHTML` anywhere in the codebase and all user content is rendered as text nodes, the practical risk is very low. Next.js supports nonce-based CSP if you ever want to remove `'unsafe-inline'`.

Also missing: `object-src 'none'` — prevents plugin-based XSS (Flash, etc.). Low-stakes in 2026 but a one-liner.

**d. `api/cron` middleware exclusion is route-family-wide**

`middleware.ts` excludes all routes matching `api/cron*` from session auth. The `notify` route correctly self-validates with a bearer token and fails closed if `CRON_SECRET` is unset. But any future route added under `/api/cron/` would also bypass middleware, relying on the author to remember to add their own auth check. Consider tightening the exclusion to `api/cron/notify` specifically.

**e. No length caps on free-text fields**

`title`, `body`, `notes`, and `tags` fields in server actions have no maximum-length validation. An admin could submit very large strings. PostgreSQL handles this gracefully, but it's worth adding a reasonable cap (e.g. `title.length > 500`) to prevent accidental or malicious oversized payloads.

---

## What's Working Well

These are worth calling out because they're often done wrong.

**Auth & authorization:**
- `signIn` callback checks DB allowlist on every sign-in attempt. Users deleted from the DB cannot authenticate with a cached token.
- The `jwt` callback re-fetches `role` and `householdId` from DB on every token refresh. Role changes take effect promptly.
- `getSessionUser()` and `getSessionHouseholdId()` re-query the DB rather than trusting token claims. The pattern is consistent across all ~15 server actions.
- `requireAssignedOrAdmin()` correctly checks both the household boundary for admins and email-to-person linkage for members. No trust in client-supplied identity.

**Household scoping:**
- Every mutation that touches a record includes `householdId: sessionUser.householdId` in its `where` clause. Cross-household data access via ID manipulation is blocked at the Prisma layer.
- `verifyBelongsToHousehold` is used for all foreign-key relationships (assigneeId, projectId) before they're written. Cross-household reference injection is blocked.

**File uploads:**
- Extensions validated against an explicit allowlist before upload is accepted.
- Filenames are UUID-randomized server-side. Original names are stored separately and sanitized (`"`, `\r`, `\n` stripped) before use in `Content-Disposition`.
- Files are stored in Vercel Blob with `access: "private"`. The serve route proxies with a server-side token — browser never gets a direct blob URL.
- The serve route checks attachment ownership (`note.householdId !== householdId`) before proxying.
- Path traversal is blocked in the serve route (`filename.includes("..") || filename.includes("/")`).

**Push notifications:**
- `CRON_SECRET` is required and the route fails closed (401) if the env var is missing.
- Push subscription endpoint is typed (not just shape-validated) before storage.
- Expired subscriptions (410/404) are cleaned up automatically.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` exposure is correct — VAPID public keys are designed to be public and are required by the browser push API.

**Content security:**
- No `dangerouslySetInnerHTML` anywhere in the codebase.
- All user content (titles, notes, bodies, tags, names) is rendered as React text nodes — no HTML injection risk.
- iCal route properly escapes user content with `escapeText()` before embedding in the `.ics` output.
- Security headers present on all routes: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a functional CSP.
- `.env` is gitignored.

---

## Recommended Next Steps

1. **Fix `updateUserRole` runtime validation** — 2 lines, zero risk.
2. **Fix `updatePerson` email validation** — and extract `EMAIL_RE` to `lib/parse.ts` to share it across the three action files that currently duplicate it.
3. When you have time: tighten the middleware `api/cron` exclusion, add `object-src 'none'` to the CSP, and add length caps to free-text fields.

The attachment/blobUrl watch-later item is worth a small hardening pass before the app is shared with more users or made more broadly accessible.
