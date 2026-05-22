# Security Sweep — 2026-05-22

Scope: full repo screening of the live app (Next.js App Router 16, Prisma + Neon Postgres, Google OAuth via NextAuth, Vercel Blob attachments, web-push). Read every route handler, server action, middleware, auth helper, Prisma query, env file, and the service worker. Compared against findings in `security-review-2026-05-20.md` and `security-review-2026-05-21.md`.

## Verdict

**Approve with minor changes.**

The codebase is in solid shape for a personal household app shared with a few family members. Most of the substantive findings from the 5/20 review have been fixed — `updatePerson` now requires the email belong to a same-household `User`, `getSessionPersonId` scopes by `householdId`, member `addTask` / `addRecurringTask` runs `verifyBelongsToHousehold` on the auto-assigned person, push subscriptions are deleted on user removal, the `timingSafeEqual` byte-length comparison is now byte-correct, and the middleware matcher covers the new static asset paths.

What's left is one item that deserves a clear-eyed decision today (the `.env` situation), a small defense-in-depth tightening on attachments and the cron route, and a handful of low-priority hygiene items.

No exploitable issues from an outside attacker. No XSS, no injection, no IDOR, no auth bypass.

## Must Fix

### Issue: Treat the on-disk `.env` as a hot live secret

- **Issue:** `/Users/craigregister/Projects/home-pm/.env` contains what appear to be live production-grade values: a Neon `DATABASE_URL` (with password), `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, and `BLOB_READ_WRITE_TOKEN`. The file is correctly gitignored (`.gitignore:34` excludes `.env*`) and `git ls-files` confirms it's untracked, so it has not leaked to GitHub. The risk is anything with read access to this folder.
- **Why it matters:** The `DATABASE_URL` points at a Neon Postgres instance that, given there's no separate dev DB anywhere in the repo, is almost certainly your *production* database. Same likely true of the OAuth secret, VAPID key, and cron secret if Vercel uses the same values. That means:
  - Any process on your laptop with file access can read those values (this review session just did — read them via the `Read` tool a moment ago, and they are now in the conversation context).
  - Any backup, screen-share, IDE plugin, or AI agent with directory access trivially exfiltrates them.
  - If `vercel env pull` is what produced this file, it's also what will keep producing it — rotating in Vercel alone won't help if the file is regenerated.
- **Minimal fix:**
  1. Confirm whether the deployed Vercel app uses the same values as this `.env`. If yes, **rotate the lot** that have been read by this session: `NEXTAUTH_SECRET`, `CRON_SECRET`, `GOOGLE_CLIENT_SECRET` (Google Cloud Console → Credentials → reset), `VAPID_PRIVATE_KEY` (will invalidate existing push subscriptions — they'll re-subscribe), `BLOB_READ_WRITE_TOKEN`, and Neon DB password.
  2. Going forward, point local dev at a separate Neon branch with its own connection string. Neon's branching is free and Prisma-compatible. Use `.env.local` (which is also gitignored) for the dev values and keep production values only in Vercel.
  3. If you want to keep using `vercel env pull` for one-off prod debugging, do it into a temp location outside the repo and delete after.

This is the only finding I'd label "fix today." The rest are correctness/hygiene.

## Security

### Important

- **`/api/cron/notify` still routes by email without an explicit household join.** `prisma.user.findMany({ where: { email: { in: ... } } })` and `prisma.pushSubscription.findMany({ where: { userEmail: { in: ... } } })` are global lookups. The 5/20 cross-tenant pivot is now closed at the *write* side because `updatePerson` requires the email to be a same-household `User` — so in practice today the cron *can't* route household B's task to household A's user. But the cron is the second line of defense, and it doesn't enforce anything. If a future code path (manual SQL fix, a script, a new admin flow, or a regression in `updatePerson`) ever introduces a cross-tenant `Person.email`, the cron leaks immediately, silently, and via push notification — exactly the channel you'd notice last. **Minimal fix:** when assembling `byEmail`, look up each assignee's `Person.householdId` and only include them if it matches the task/routine `householdId`. Or move `PushSubscription` to a `userId` FK as the 5/20 review suggested, and key the join on that.

- **Attachment `filename` validator accepts any extension, not just the allowlist.** `app/notes/actions.ts:17` — `UUID_FILENAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/`. The legitimate upload path (`/api/upload`) enforces `ALLOWED_EXTENSIONS`, but an admin who calls the `addNote` server action directly (which is straightforward — they're already authed and can craft a fetch) can pass `{filename: "00000000-...-000000000000.exe", blobUrl: ...}`. The download route would then 200 with `application/octet-stream` and `Content-Disposition: attachment`, so the browser would just save the file — no script execution. Impact is therefore limited to "a household admin can record an attachment row pointing at an arbitrary extension," which is annoying rather than dangerous. **Minimal fix:** in `sanitizeAttachments`, also check `ALLOWED_EXTENSIONS.has(att.filename.split(".").pop()!)`. One line, closes the gap.

### Watch later

- **`completeRecurringTask` initial lookup is unscoped.** `app/recurring/actions.ts:95` — `prisma.recurringTask.findUnique({ where: { id } })` finds rows across all households. The subsequent `requireAssignedOrAdmin(task.assigneeId, task.householdId)` correctly rejects cross-household callers, so this isn't exploitable. But it loads another tenant's row into memory and gives the attacker a timing oracle for ID existence. Tighten to `findFirst({ where: { id, householdId: sessionUser.householdId } })` for consistency with every other action in the file.

- **`/api/uploads/[filename]` doesn't set `Cache-Control`.** Authenticated, private attachment content is being served without any cache directive, so a corporate proxy or shared CDN could cache it indistinguishably from a public asset. Add `Cache-Control: private, no-store` to the response headers. (Same finding as 5/20 — still open.)

- **Service worker treats `data.url` as trusted.** `public/sw.js:23` — `clients.openWindow(event.notification.data?.url ?? "/")`. The cron sends a hardcoded `"/"` today, so this is fine in practice. But the service worker has no schema validation on push payloads. If the cron route ever templates a URL from user-controlled content, or if a third party gains the VAPID private key (see the `.env` finding), this becomes an open-redirect-on-click. Constrain to same-origin paths starting with `/`: `const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/"`.

- **CSP `script-src 'self' 'unsafe-inline'` in all environments.** Same as prior reviews — acceptable for App Router today, move to nonces when convenient.

- **No rate limiting.** No throttling on `/api/subscribe`, `/api/upload`, server actions, or the cron route (the cron is gated by a secret, so volumetric risk is moot). Low priority for an allowlisted personal app.

- **Single Vercel Blob store across households.** All households share one `BLOB_READ_WRITE_TOKEN` and therefore one blob store namespace. Attachment ownership is enforced at the DB layer (`/api/uploads/[filename]` joins `note.householdId` against the session). That's the right enforcement point and it holds. But if two households ever ended up on this instance and an admin in one of them learned a UUID from the other (which requires *some* leak channel — UUIDv4 is otherwise unguessable), the cross-household admin could record that blob as their own attachment. Practically blocked by 122 bits of entropy; mention here only to note the trust boundary.

- **PII in logs.** `app/api/cron/notify/route.ts:155` still logs `sub.userEmail` on push failure. Switch to `sub.id` if you ever audit Vercel logs in a non-private context.

### No issues found in this sweep

- No `dangerouslySetInnerHTML` anywhere. `react-markdown` used in `app/task-item.tsx` without `rehype-raw` — HTML in task notes is escaped, `javascript:` / `data:` URLs are stripped by the default URL transform.
- No raw SQL or `$queryRaw` in the app code (only in a prior review file as a textual reference).
- No `eval` / `new Function` / `innerHTML` / `outerHTML` anywhere in the app.
- Server actions consistently re-derive `role` and `householdId` from the DB on every call — a tampered JWT cannot elevate.
- Every admin-only mutation uses `prisma.<model>.update({ where: { id, householdId } })` so cross-household ID guessing is blocked at the query layer.
- Mutation payloads are whitelisted into an explicit `update` object, never spread from `formData`/client.
- `/api/upload` checks both `Content-Length` and `file.size`; extension is checked against `ALLOWED_EXTENSIONS`; MIME type is server-derived from extension (not trusted from client); stored filename is a server-generated UUID.
- `/api/uploads/[filename]` path-traversal-checks the filename (rejects `..` and `/`), joins by `(filename, note.householdId)`, sets `Content-Disposition: attachment` with both ASCII fallback and RFC5987 UTF-8 encoding, and derives `Content-Type` from the stored extension.
- `/api/calendar` ICS escaping handles `\`, `;`, `,`, and newlines per RFC 5545, and folds long lines correctly.
- `/api/cron/notify` uses `timingSafeEqual` with byte-length equality (correct after the 5/20 fix). The cron path is properly excluded from `withAuth` so the secret is the sole auth.
- `/api/subscribe` validates the subscription structure and refuses to silently overwrite another user's endpoint claim.
- NextAuth `signIn` callback enforces the allowlist via a DB lookup; the `jwt` callback re-fetches role and household on every refresh.
- Middleware matcher covers all the new static-asset paths from the 5/21 brand rollout.
- Headers in `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, sensible CSP including `frame-ancestors 'none'` and `object-src 'none'`.
- `scripts/seed-household.ts` is a one-time bootstrap script and not exposed at runtime. Worth noting it does a global `updateMany` that retroactively assigns *all* existing rows to the new household — fine for a one-off seed, dangerous if accidentally re-run on a populated multi-household instance. Not a security finding; just don't `npx tsx scripts/seed-household.ts` casually.

## Simplify

- The `requireAssignedOrAdmin` helper in `lib/require-auth.ts` is now used in exactly one place (`completeRecurringTask`). Once that callsite is scoped to `findFirst({ id, householdId })` per the Watch-later above, you can inline the assignee/admin check there and delete the helper. One fewer auth helper to audit.

- `getDbUser` is still called 2–3 times per server-action invocation (`getSessionUser` + `getSessionPersonId` + sometimes `requireAssignedOrAdmin`). The 5/20 review flagged this; the consolidation into a single `{ role, householdId, personId }` helper would shrink the surface where "did I scope this?" can go wrong. Real benefit is auditability, not perf.

## Best-Practice Notes

- **Composite FK for assignee/household.** Postgres-side enforcement that `Task.assigneeId` and `Task.householdId` reference a `Person` in the same household removes the cross-household assignee class of bug structurally. Add a composite unique index on `Person(id, householdId)` and a composite FK on `Task(assigneeId, householdId) → Person(id, householdId)`. Same treatment for `RecurringTask`. This is a one-time migration, not an ongoing tax.

- **Role-change audit trail.** `updateUserRole` and `updateProject`/`deleteProject` (and the superadmin household-creation actions) are destructive and undetectable in retrospect. A `Activity` model with `(actorEmail, action, targetType, targetId, at)` rows would be 20 lines and makes "who promoted Hudson to admin last week" answerable. Genuinely later — only relevant if this app ever expands beyond your family.

- **Same-origin URL whitelist on the SW.** Per the Watch-later above, defending the service worker's `openWindow` against a future bad push payload is a one-line change that's worth doing prophylactically given the SW runs outside the page CSP.

## Phase Alignment

The app is well past the "tasks MVP" described in `CLAUDE.md` and `PROJECT_PLAN.md` — projects, notes, attachments, household tenancy, push notifications, calendar feed, superadmin, reminders, and brand/PWA polish are all live. This sweep treats it as a deployed production app, which it is. No feature creep introduced by this review; the only structural recommendation (composite FK) is hardening of existing schema, not new scope.

## Final Recommendation

1. **Today:** Decide on the `.env` rotation. If the values are shared with production, rotate everything in that file. Move local dev to a separate Neon branch.
2. **Small follow-up commit:** Tighten `sanitizeAttachments` to enforce `ALLOWED_EXTENSIONS`, scope `completeRecurringTask`'s `findUnique` to household, add `Cache-Control: private, no-store` to the attachment download response, and constrain `sw.js`'s `openWindow` to same-origin paths.
3. **Defer until needed:** Cron-route household join, composite FK migration, audit trail, CSP nonces, rate limiting.

The substantive security work from the 5/20 review has landed and held. Good shape.
