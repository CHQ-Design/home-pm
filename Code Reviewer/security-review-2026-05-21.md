# Security Review — 2026-05-21

Scope: 4 commits since `security-review-2026-05-20.md` — the Toft → Otium rename and the brand/asset/metadata rollout. Diff: `f51006e..HEAD`, ~180 LOC, mostly static assets.

Commits in scope:

- `a3d9d66` rename: Toft → Otium across all user-facing surfaces
- `97ebd76` brand: ship otium logo system (round 1)
- `9387f87` fix: point apple-touch-icon to pwa-icon API route
- `8de4422` brand: ship production raster assets and full metadata block

## Verdict

**Approve.** No security regressions. The diff is overwhelmingly static assets and string swaps. The few items below are functionality / hygiene, not vulnerabilities.

If the question is "did this batch introduce a vulnerability?" — no. If the question is "should I land a tiny follow-up before calling this done?" — yes, mostly to fix the middleware matcher so the new public assets actually serve to unauthenticated clients (PWA install, OG unfurls).

## Must Fix

None for security.

## Security

No meaningful security concerns found for this phase. Two minor information-disclosure notes worth knowing about, neither blocking:

- **Watch later — `robots: { index: true, follow: true }` in `app/layout.tsx`.** Every authed page is middleware-gated, so crawlers only see `/login`. That page is now actively inviting Google/Bing to index it, with the new branding, description, and OG card. Probably fine for a personal app, but if you'd rather not show up in search results for "Otium household app," flip this to `noindex, nofollow`. The PWA still installs either way.
- **Watch later — `authors: [{ name: "Craig Register" }]` in `app/layout.tsx`.** Embeds your real name in the HTML `<head>` on every page, including the unauthenticated `/login`. It's already public via git, so this isn't a leak in any meaningful sense — but it's now in the rendered DOM and OG metadata, so it'll show up in scrapers and link unfurls. Drop the `authors` field if you'd rather not, or leave it if you don't mind being attributed.

The new SVGs in `public/brand/` are plain shapes (`<rect>`, `<path>`, `<circle>`, `<text>`) — no `<script>`, no `<foreignObject>`, no remote `<use href>`, no `data:` URIs. Served as static files only, not inlined into the DOM, so even if they did contain something exotic the CSP `object-src 'none'` plus same-origin loading would contain it. Fine.

The `/api/pwa-icon` route still bounds `size` to `[16, 1024]` and renders no user-controlled content — the previous review's analysis still holds.

`Content-Security-Policy` is unchanged and still appropriate: all new icons / OG images / manifests are first-party (`img-src 'self'` covers them), and no new font origins or external scripts were introduced.

## Functionality bugs introduced by this batch (not security, but worth fixing now)

These don't expose data, but they break the very thing the metadata block was added to enable. Calling them out here because they sit at the auth boundary, which is where you'd otherwise notice them in a security review.

- **`middleware.ts` allowlist is stale relative to the new asset paths.** The matcher excludes `favicon.ico`, `icons`, `manifest.json`, `sw.js`, but the new commits added assets at root: `apple-touch-icon.png`, `favicon-16.png`, `favicon-32.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `og-image.png`, `og-image-dark.png`, and `manifest.webmanifest`. None of these match the lookahead, so `withAuth` runs on them and redirects unauthenticated requests to `/login`. Concretely that breaks:
  - **PWA install** on a logged-out first visit — the browser fetches `/manifest.webmanifest` before sign-in, gets a 307 to `/login`, no install prompt appears.
  - **Social unfurls** of the login URL — Slack/iMessage/Twitter fetch `/og-image.png` unauthenticated, get redirected, fall back to no preview.
  - **iOS home-screen icon** on a logged-out add-to-home-screen — `/apple-touch-icon.png` redirects, iOS uses a screenshot fallback.
  - **Browser tab favicon** on `/login` — `/favicon-16.png` and `/favicon-32.png` redirect; only `/favicon.ico` (the legacy one) actually serves.

  Minimal fix — extend the lookahead. One change in `middleware.ts`:

  ```ts
  matcher: [
    "/((?!api/auth|api/cron/notify|_next/static|_next/image|favicon|icons?|manifest\\.(json|webmanifest)|sw\\.js|apple-touch-icon|og-image|login).*)",
  ],
  ```

  `favicon` (no `.ico`) covers `favicon.ico` + `favicon-16.png` + `favicon-32.png`; `icons?` covers `/icon-192.png`, `/icon-512.png`, `/icon-512-maskable.png` and the legacy `/icons/` dir; `manifest\.(json|webmanifest)` covers both manifests; `apple-touch-icon` and `og-image` cover the rest. Verify in dev by curling each path unauthenticated and confirming a 200 instead of a 307.

- **Service worker icon path doesn't match the new asset layout.** `public/sw.js` line 6–7 references `/icons/icon-192.png`, but the new icon set lives at root (`/icon-192.png`). The notification still renders because you kept the legacy `public/icons/` dir, but the SW is now pointing at the *old* leaf-style icon, not the new Quiet Hour O. Push notifications will show the wrong logo until this is fixed. Swap both lines to `/icon-192.png`.

## Simplify

- **Two manifests in `public/`.** `public/manifest.json` is no longer linked from `<head>` (which now points at `/manifest.webmanifest`), but it's still served at `/manifest.json` and still in the middleware allowlist. Delete `public/manifest.json` — there's exactly one source of truth now and it's `manifest.webmanifest`. Then drop `manifest.json` from the middleware matcher (or replace per above with the combined regex).
- **Legacy `public/icons/` directory is now dead weight.** The new commits placed PNGs at the root (`/icon-192.png` etc.) and `manifest.webmanifest` points at those. The only remaining consumer of `/icons/` is `sw.js` — once that's repointed, `public/icons/` can go entirely. Less code, fewer "which icon is the real one" mistakes later.

## Best-Practice Notes

- The `/api/pwa-icon` route is now unused at runtime (apple-touch-icon was switched to the static PNG in `8de4422`, and the manifest points at static PNGs too). The route file and the now-orphaned `public/manifest.json` still reference it. Either delete the route or keep it deliberately as a fallback — but don't leave a third icon system silently around.
- `next.config.ts` `headers()` matches `/(.*)` and adds the CSP/security headers to every response, including the static PNGs and the manifest. That's fine, but worth knowing: any future caching layer in front of Vercel will be carrying these headers around with image responses too.

## Phase Alignment

Solidly in scope. This batch is pure branding/PWA polish on an app that's already live — no new tables, no new auth surface, no new endpoints (the one `/api/pwa-icon` change is a refactor inside an existing route). No speculative architecture, no new dependencies. Matches the "finish what's shipped" posture in `CLAUDE.md`.

## Final Recommendation

**Merge.** Then a single small follow-up commit:

1. Extend `middleware.ts` matcher to cover the new asset paths (regex above).
2. Fix `public/sw.js` icon paths to `/icon-192.png`.
3. Delete `public/manifest.json` and (optionally) `public/icons/` + `app/api/pwa-icon/route.tsx` if you're done with the dynamic icon experiment.

Verify the matcher fix by curling each of `/manifest.webmanifest`, `/og-image.png`, `/apple-touch-icon.png`, `/favicon-32.png`, `/icon-192.png` unauthenticated and confirming `200 OK` (not `307` to `/login`).
