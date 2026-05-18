# Home PM — Full Codebase Security Review
**Date:** 2026-05-17  
**Reviewer:** Claude (Cowork)  
**Scope:** Full codebase review — live site, security emphasis

---

## Verdict

**Request changes** — several issues require fixes before this is acceptably secure for a live, internet-facing site. None are catastrophic, but the upload endpoint and missing auth guards on mutation actions are real attack surface that needs to close.

---

## Must Fix

### 1. Upload endpoint has no file size limit
**File:** `app/api/upload/route.ts`

**Issue:** Any authenticated user can upload files of unlimited size. The entire file is loaded into memory (`arrayBuffer()`) before writing to disk. A 500MB upload would spike memory and potentially crash the process.

**Why it matters:** Denial of service from a single bad request (or an automated script from any authenticated household member). Neon/Vercel deployments often have low memory ceilings.

**Minimal fix:**
```ts
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 })
  }
  // ...
}
```
Check both `Content-Length` header (early rejection) and `file.size` after parsing (belt-and-suspenders, since Content-Length can be spoofed).

---

### 2. Upload endpoint: file extension not validated or allowlisted
**File:** `app/api/upload/route.ts`

**Issue:** The extension is taken directly from the user-supplied filename with `file.name.split(".").pop()`. No allowlist is applied. An authenticated user can upload a file with any extension — `.html`, `.svg`, `.php`, `.sh` — which gets stored in `public/uploads/` and is served statically.

**Why it matters:** SVG files can contain inline scripts and execute in a browser. HTML files served from the same origin can set cookies or run scripts. While `.php`/`.sh` won't be executed by Next.js static serving, `.html` and `.svg` are genuinely dangerous when served from the same origin.

**Minimal fix:**
```ts
const ALLOWED_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "gif", "webp",
  "txt", "md", "csv", "xlsx", "docx", "ics"
])

const rawExt = (file.name.split(".").pop() ?? "").toLowerCase()
if (!ALLOWED_EXTENSIONS.has(rawExt)) {
  return NextResponse.json({ error: "File type not allowed" }, { status: 415 })
}
const filename = `${randomUUID()}.${rawExt}`
```

---

### 3. Upload response stores client-provided `mimeType` and `size` in the DB
**Files:** `app/api/upload/route.ts`, `app/notes/actions.ts`

**Issue:** The upload handler returns `file.type` and `file.size` from the browser `File` object — both are client-controlled values. `notes/actions.ts` stores these directly in the DB. A user can claim any MIME type for any file.

**Why it matters:** The stored `mimeType` is used to describe files to users. If the app ever uses this field for conditional behavior (rendering previews, setting Content-Type on downloads), trusting it becomes an injection vector.

**Minimal fix:** After allowlisting the extension, derive mime type server-side from your own extension map rather than trusting `file.type`. Example:

```ts
const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg",
  jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
  txt: "text/plain", md: "text/markdown", csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ics: "text/calendar",
}
const mimeType = MIME_MAP[rawExt] ?? "application/octet-stream"
```

And get the actual file size from `buffer.byteLength`, not `file.size`.

---

### 4. Notes and Projects actions are missing auth guards
**Files:** `app/notes/actions.ts`, `app/projects/actions.ts`

**Issue:** Every mutation in these two files — `addNote`, `updateNote`, `deleteNote`, `deleteAttachment`, `addProject`, `updateProject`, `deleteProject` — has no `requireRole` call. The middleware protects against unauthenticated access, but any authenticated household member can create, edit, and **delete** notes and projects.

**Why it matters:** Accidental or deliberate destructive mutations by a non-admin member. Deletion especially — there is no recycle bin. Notes store things like warranties and account numbers.

**Decision to make:** Either:
- Add `await requireRole("admin")` to all destructive mutations (`delete*` functions) in both files — the safer default.
- Or consciously decide "members can create/edit, only admins can delete" and enforce that split explicitly.

Right now there's no stated or enforced policy. The inconsistency is also confusing: task actions and recurring task actions require admin for all mutations, but notes and projects require nothing.

---

### 5. `toggleTask` has no auth guard
**File:** `app/actions.ts`

**Issue:** `toggleTask` is the only task mutation without `requireRole`. Any authenticated member can check off tasks.

**Why it matters:** Likely intentional (household members marking their own tasks done), but it's undocumented and inconsistent with every other mutation in that file. If intentional, add a comment. If not, add `await requireRole("admin")`.

---

### 6. Unvalidated date strings passed to `new Date()`
**Files:** `app/actions.ts` (`addTask`), `app/recurring/actions.ts` (`addRecurringTask`)

**Issue:** `new Date(dueDateStr)` and `new Date(nextDueRaw)` are called without checking if the string is a valid date. Invalid strings produce `Invalid Date`, which Prisma throws on with an unhandled error — a bare 500 response.

**Why it matters:** A slightly malformed date string from a browser quirk or custom client causes a crash, not a graceful error.

**Minimal fix:**
```ts
function parseDate(raw: string): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}
```
Then use `dueDate: parseDate(dueDateStr)` and return early if a required date parses as null.

---

### 7. `Number()` without NaN guard on ID fields
**Files:** `app/actions.ts`, `app/recurring/actions.ts`

**Issue:** `Number(assigneeIdStr)` and `Number(projectIdStr)` return `NaN` for non-numeric strings. Prisma receives `{ assigneeId: NaN }` and throws an unhandled error.

**Minimal fix:**
```ts
function parseId(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return isNaN(n) || n <= 0 ? null : n
}
```

---

## Security

### Critical
None found. The middleware correctly uses Next.js 16's `proxy.ts` convention with `export const proxy`, so all routes including `/api/upload`, `/api/calendar`, and static files under `/uploads/` are protected behind Google OAuth. This is working as intended — confirmed by checking the Next.js 16 build internals.

### Important

- **Upload: file type and size** — see Must Fix items 1–3 above. An authenticated user abusing the upload endpoint is the most realistic attack surface on this site.
- **Notes/Projects auth gap** — see Must Fix item 4. A member-role user has full write access to notes and projects today with no guards at all.

### Watch Later

- **`/api/calendar` exposes all task titles, notes, and assignee names** — currently protected by auth (✓), but there's no per-user scoping. Any authenticated user gets the full calendar feed. Fine for a household app; just document the intent.
- **`public/uploads/` files accessible to all authenticated users** — any authenticated user can access any uploaded file if they know the UUID filename. UUIDs are non-guessable but are visible in the DB and in note attachment links. If notes are visible to all users, their attachments are too. Intentional, but worth being conscious of for sensitive attachments.
- **`removeFile` uses DB-sourced filename in `path.join`** — safe in practice because the filename is a server-set UUID. But `path.join` doesn't prevent traversal if a malicious value ever reached this from user input. For future-proofing, add a prefix check: `if (!resolvedPath.startsWith(uploadDir)) throw new Error("invalid path")`.

---

## Simplify

- **`auth.ts` jwt/session callbacks are identity functions** — both callbacks just return the token/session unchanged. They can be removed entirely; next-auth does this by default. Dead code.

- **`app/api/upload/route.ts` runs `mkdir` on every request** — `mkdir` with `recursive: true` is a filesystem syscall on every upload. Create the directory once at deploy time (or in a startup hook) instead.

- **`PERSON_COLORS` hardcoded by DB ID** in `task-item.tsx` — IDs 1, 2, 3 are hardcoded. If a person is deleted and recreated, their color silently changes. Consider a `color` field on the `Person` model, or derive from a stable hash of the name. Low priority but will eventually cause confusion.

---

## Best-Practice Notes

- **`parsePriority`, `parseStatus`, `VALID_UNITS` patterns** are clean and consistent across all files that use them. The notes/projects files should adopt the same approach for any constrained fields once auth guards are added.
- **`toggleTask` completedAt** — correctly sets `completedAt: new Date()` on completion and `null` on un-completion. Good.
- **`normalizeTags`** — correctly lowercases and deduplicates. Clean.
- **`prisma.ts` global singleton** — the standard Next.js hot-reload pattern is correct. ✓
- **`requireRole` error ordering** — correctly throws "Not authenticated" before "Not authorized". These are meaningfully different for debugging. ✓
- **`TaskEditModal` focus trap** — Escape is handled correctly. Tab focus is not trapped within the modal overlay (users can tab behind it). Acceptable for a personal app, but worth noting for accessibility.

---

## Data Model

The schema has matured well. A few observations:

- **`status`, `priority`, `intervalUnit` are untyped strings in the Prisma schema** — validated correctly at the application layer, but Prisma/PostgreSQL won't reject invalid values from a direct DB write. Worth converting to Prisma enums in a future migration when convenient.
- **`CLAUDE.md` still says SQLite** — the project is now on Neon PostgreSQL. Update the docs.
- **No soft deletes** — notes, tasks, and projects all hard-delete with no recovery path. For a notes store containing warranties and account numbers, a `deletedAt` timestamp on `Note` would add meaningful safety with minimal schema change. Not urgent, but worth considering.

---

## Phase Alignment

The codebase has grown well beyond the original "task tracker MVP" in `CLAUDE.md` — it now has projects, recurring tasks, notes with attachments, people management, a calendar feed, file uploads, and Google Auth. All of it is clearly in use and none looks speculative. The code quality reflects genuine maturity: consistent patterns, clean components, working auth.

The main gap is that the security posture hasn't fully kept pace with the scope expansion — specifically the notes/projects auth and upload safety. These are easy to fix, just need to happen.

---

## Final Recommendation

Two focused PRs close the meaningful risk:

**PR 1 — `harden upload endpoint`**
- File size limit (content-length check + file.size check)
- Extension allowlist
- Server-derived mime type and byte count

**PR 2 — `auth guards and input validation`**
- `requireRole` on destructive mutations in `notes/actions.ts` and `projects/actions.ts`
- `parseDate` helper replacing bare `new Date(raw)`
- `parseId` helper replacing bare `Number(raw)` on ID fields
- Comment or enforce intent on `toggleTask`

**Also:** Rotate the Google OAuth client secret and NEXTAUTH_SECRET if the `.env` file has ever been in a shared context (cloud environment variables, clipboard, screen share, etc.). Both are currently in plaintext in the local `.env`.
