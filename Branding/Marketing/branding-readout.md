# Home PM / "The Board" — Branding Readout & Naming Recommendations

_Prepared: 2026-05-19. Based on a review of the codebase at `~/Projects/home-pm` — `README.md`, `CLAUDE.md`, `HOUSEHOLDS.md`, `PROJECT_PLAN.md`, `package.json`, `public/manifest.json`, `app/layout.tsx`, `app/page.tsx`, `app/login/page.tsx`, `app/nav.tsx`, `app/bottom-nav.tsx`, `app/welcome-header.tsx`, `app/add-task-form.tsx`, `app/projects/page.tsx`, `app/notes/page.tsx`, `app/recurring/page.tsx`, and `app/globals.css`. No screenshots were provided, so visual claims are inferred from theme tokens, fonts, and copy._

## Brand Readout

The app is a **household-scale personal project manager** — a shared place for a family (Craig's household, plus his sister's household as a second tenant) to coordinate the four-quadrant model laid out in `CLAUDE.md`: one-off **Tasks**, **Projects with milestones**, **Recurring household items** (bills, maintenance, chores), and **Notes & reference info**. Auth is Google OAuth with admin/member roles; assignable "People" (including kids without logins) sit underneath users, with a dedicated kid mode that swaps the greeting, hides the add-task form, and rewards streaks. It is installed and used as a PWA — the manifest is wired up, `sw.js` ships, push notifications are live, and a mobile bottom-nav exists for Things / Routines / Projects / Notes.

The brand is **already in transition**. The manifest, `app/layout.tsx` metadata, login screen, and top-nav wordmark all say **"The Board"**. `package.json` still reads `home-pm-scaffold`, and the engineering docs (`CLAUDE.md`, `PROJECT_PLAN.md`) call it **"Home PM"**. So the rename has begun but hasn't propagated.

The strongest brand angle that emerges from the evidence: this is a **warm, household-coordination tool, not a productivity SaaS**. The Fraunces serif headlines, the cream/sage palette (`#F9F5EF` background, `#6B7A5A` accent, warm umber text), the home-page H1 of "Things" rather than "Tasks", the placeholders ("What needs doing around here?", "Something for Hudson to do?", "What would make tomorrow easier?"), the kid-mode greetings ("Almost bedtime 🌙"), and the existing empty state ("Nothing on the board yet") all aim at the same target: a family-shared, slightly analog, gently affectionate operating system for life at home. The tagline already in `metadata` — _"Personal project manager for home and family life"_ — captures the promise accurately.

**Unknowns / assumptions flagged**

- Audience is currently two households (Craig's and his sister's). No public/marketing positioning is in evidence — there are no marketing pages, landing routes, or `/about` content. I'm assuming Craig wants a name that _could_ generalise beyond these two households later, but the brand should not be re-shaped around a hypothetical commercial launch unless that is in fact the goal.
- I have not been given screenshots, so I am inferring visual identity from theme tokens and font choices. If the actual UI feels more clinical or more playful than the tokens suggest, the voice recommendations below should be re-weighted.
- I cannot assess domain or trademark availability — none were checked. Every name below requires screening before adoption.

## Naming Strategy

**Recommended direction: evocative / metaphorical, anchored in a household-place noun.** The product itself supplies the metaphor (a shared surface where what-needs-doing lives), and the existing visual identity — warm cream, sage, Fraunces — wants a name with texture, not a utility-first compound. "Home PM" is correct but inert; "The Board" reaches for the right metaphor but lands on a word too generic to own.

A strong name should do four things at once:

1. Evoke a **shared physical surface in a home** (pinboard, mantel, hearth, roost) — so the metaphor reinforces the four-quadrant model rather than fighting it.
2. Be **short and pronounceable in one beat** — the wordmark sits next to a 16-pixel settings icon in the top nav (`app/nav.tsx`), so it needs to read at small sizes.
3. Stay **family-warm without being precious** — kid mode exists, but the admin (Craig) is the primary user. A name that adults are happy to say out loud.
4. Be **brand-able / searchable**. "The Board" fails this badly — the SEO and trademark surface is already saturated.

**Directions to avoid**

- **Utility-first compounds** (HomeOps, FamilyTasks, HouseHQ, ChoreHub). They describe the feature set and ignore the tone the UI has already chosen.
- **Cute kid-mode-first names** (Hudson's House, Sticker Tower, etc.). Kid mode is one mode, not the product.
- **Overly clever portmanteaus** (Familio, Domesti.ly). They age badly and add cognitive load at every brand mention.
- **Productivity-tool tropes** (Tasq, Listr, Doit). The product is deliberately not Things-for-Mac-but-cheaper; the name shouldn't position it there.
- **"The Board"** specifically. See below — it deserves its own slot in the candidate list, but as a brand it's a placeholder, not a destination.

## Top App Name Recommendations

### Hearth
**Why it works:** The single warmest one-word metaphor for "the centre of household life". Lines up perfectly with the existing palette and typography. Tagline practically writes itself ("Everything around the Hearth").
**Tone:** Warm, literary, calm.
**URL ideas:** `hearth.app`, `gethearth.com`, `usehearth.com`, `hearth.family`.
**Risks:** **Heavy collision risk.** "Hearth" is one of the most-used names in the family-tech and home-services space (a well-known family-display product uses it, plus several home-services and ecommerce brands). Trademark and SEO surface is crowded. Pronunciation is easy in English but slightly less so for non-native speakers ("th" cluster).

### Mantel
**Why it works:** Same metaphorical neighbourhood as Hearth but materially less crowded. A mantel is literally the surface in a home where family notices, photos, and reminders accumulate — a near-perfect match for the four-quadrant model.
**Tone:** Warm, slightly more particular than Hearth.
**URL ideas:** `mantel.app`, `getmantel.com`, `mantelhq.com`, `themantel.app`.
**Risks:** Spelling confusion with "mantle" (earth science / cloak) is real and recurring; users will mistype the domain. Several small SaaS products and a podcast platform use "Mantel" already — screen carefully.

### Roost
**Why it works:** Short, punchy, single syllable. "Coming home to roost" + the family-as-flock connotation matches a multi-person household app without being saccharine. Easier to build a visual identity around than Hearth (the bird/nest mark is right there).
**Tone:** Modern, warm, slightly playful.
**URL ideas:** `roost.app`, `roost.family`, `useroost.com`, `goroost.com`.
**Risks:** "Roost" is in active use — a smart-home/security brand and several real-estate products own significant search surface. Possible US trademark conflicts in adjacent classes.

### Stead
**Why it works:** Short, uncommon, and means exactly the thing the product is about — _a place where someone lives, the running of a household_. "Homestead" without the corny. Easier to own than Hearth or Roost because the namespace is much less crowded.
**Tone:** Quiet, grounded, slightly old-fashioned.
**URL ideas:** `stead.app`, `getstead.com`, `stead.house`, `usestead.com`.
**Risks:** Less self-explanatory than Hearth — needs a tagline to land ("Stead — what's needed around the house"). Some users will pronounce it correctly only after hearing it.

### Tally
**Why it works:** Captures the gentle list-keeping spirit of the product without sounding like a productivity tool. Reads warm next to Fraunces. Single syllable, friendly. Fits all four content types (you tally things, projects, routines, and notes).
**Tone:** Friendly, list-keeper, soft.
**URL ideas:** `tally.house`, `tally.family`, `gettally.app`, `tallyhq.com`.
**Risks:** Tally.so (form builder) is a well-known product in adjacent SaaS space and dominates "tally" search. Significant risk of being mistaken for it.

### Roster
**Why it works:** The most utility-honest option on this list. The product literally maintains a roster of household members and assigns work to them. It connects to a real, observable feature (assignable People in `people-manager.tsx`) rather than a metaphor.
**Tone:** Practical, slightly sporty, grown-up.
**URL ideas:** `roster.house`, `roster.family`, `getroster.app`, `householdroster.com`.
**Risks:** Some HR/scheduling tools own this word in B2B. Less emotionally evocative than the metaphorical options — leans away from the existing warmth.

### Nook
**Why it works:** Cozy, memorable, three letters from being trademarkable as a logo. Conveys "small, shared, ours". Plays well with kid mode without being defined by it.
**Tone:** Cozy, intimate, slightly twee.
**URL ideas:** `nook.house`, `nook.family`, `getnook.app`.
**Risks:** Strong association with Barnes & Noble's Nook e-reader; multiple existing community/note apps use Nook. May read too "small" for a tool that wants to hold projects + recurring infrastructure.

### Folio
**Why it works:** Literary, warm, and gestures at all four content types — a folio is a bound collection. Reads beautifully in Fraunces. Distinctive enough to brand around.
**Tone:** Literary, considered, calm.
**URL ideas:** `folio.house`, `folio.family`, `getfolio.app`.
**Risks:** "Folio" is heavily used in financial/portfolio products and in publishing tools — namespace collision. Less obviously a "household" word, so the tagline has to do more work.

### Around Here
**Why it works:** Pulled directly from the app's own voice — "What needs doing around here?" is already a placeholder in `add-task-form.tsx`. Using it as a name doubles down on the conversational, gently-domestic tone the product already has.
**Tone:** Conversational, slightly cheeky, warm.
**URL ideas:** `aroundhere.app`, `around.house`, `getaroundhere.com`.
**Risks:** Two words is a real cost — harder to say in a wordmark, harder for users to type. Possible search confusion with "Around Town" / "Around" location apps.

### Kindling
**Why it works:** In the Hearth metaphorical neighbourhood but more distinctive. Kindling is the small stuff that keeps a household running — a strong match for the "what needs doing around here" framing. Memorable and brand-able.
**Tone:** Warm, slightly poetic.
**URL ideas:** `kindling.app`, `kindling.house`, `usekindling.com`.
**Risks:** Possible confusion with Amazon Kindle. Some users may read "kindling" as fire-starting / aggression in unrelated contexts — the metaphor needs the tagline to make it explicit.

### Tend
**Why it works:** A warm verb for exactly what households do — _tending_ to people, to plants, to bills. Short, memorable, defensible. Fits a multi-person product because every member is tending to something.
**Tone:** Warm, gentle, active.
**URL ideas:** `tend.house`, `tend.family`, `gettend.app`, `usetend.com`.
**Risks:** "Tend" is used by a dental-care chain and some plant/garden products — search surface partially claimed.

### The Board (current)
**Why it works:** It's the right metaphor — a shared pinboard in the kitchen — and Craig has already partially shipped it. "Nothing on the board yet" makes the metaphor explicit in copy.
**Tone:** Familiar, plainspoken.
**URL ideas:** `theboard.app`, `theboard.family`, `useboard.com`. (All almost certainly contested.)
**Risks:** **The strongest argument against keeping it.** "Board" is one of the most generic possible names in SaaS — it collides directly with corporate-board software, Trello-style kanban tools, dev hiring boards, message-board software, and a dozen others. SEO is essentially impossible. The trademark surface is hostile. Pronunciation/spelling are fine, but searchability and ownability are not. As a placeholder, it has served its purpose. As a real brand, it is the weakest name on this list.

## Best 3 Recommendations

1. **Stead** — the most strategically defensible name on the list. The metaphor is exactly right ("the running of a household"), the namespace is genuinely uncrowded, the wordmark is short enough for the top nav, and it doesn't trade on a metaphor that's already saturated in family-tech (Hearth, Roost). It needs a tagline to do explanatory work, but that's an acceptable cost in exchange for ownability. The most likely name to survive a trademark / domain screen intact.

2. **Mantel** — the strongest emotional fit if Hearth is unavailable. The "mantel" as the physical surface where family notices accumulate is a tight match for what the app does, and the warmth lands without being preciously child-coded. Trade-off is real: the mantel/mantle spelling collision will cost some users a typed URL. Recommend only if a `mantel.app` or `mantel.family` domain is available and trademark screening comes back clean.

3. **Roost** — the most distinctive brand identity opportunity. Easiest to build a visual mark around (nest, bird, flock) and easiest for two households to introduce to other families ("come to the roost"). The downside is namespace collision risk; trademark and domain screening is essential before commitment.

Of the three, **Stead is the safest bet, Mantel is the warmest, Roost is the most brand-able.** I'd default to Stead unless trademark screening surprises us.

## URL / Domain Recommendations

The product is PWA-first, so a `.app` TLD is a defensible primary. Suggested patterns to screen, in priority order:

- Exact match `.app`: `stead.app`, `mantel.app`, `roost.app`.
- Exact match `.family` / `.house`: `stead.family`, `mantel.house`, `roost.family`. These TLDs are cheap, available more often, and reinforce the household positioning.
- `get` / `use` + name `.com`: `getstead.com`, `usemantel.com`, `getroost.com`. Standard SaaS pattern, useful as a redirect target if the bare `.app` is unavailable.
- `[name]hq.com`: `steadhq.com`, `mantelhq.com`. Reasonable fallback.
- Verb + name pattern: `liveatstead.com`, `aroundthe mantel.com`. Use only if the exact-match options are claimed.

**Do not assume availability for any of these.** Each candidate requires a domain WHOIS check and a trademark screen (USPTO TESS + Common Law search) before adoption. None of the above are claimed-available — they are patterns to screen.

## In-App Copy Recommendations

The current copy is already most of the way there — it's specific, gently conversational, and matches the visual identity. The recommendations below are refinements, not rewrites, written assuming a rename to **Stead** (substitute the chosen name as needed).

- **App title / wordmark:** `Stead` (single word, Fraunces, no tagline beside it in the top nav; the existing pattern at `app/nav.tsx:16` is correct — just swap the string).
- **Tagline (used on login, install prompt, share previews):** `What's needed around the house.` — declarative, plainspoken, mirrors the placeholder voice that already exists.
- **Home / onboarding headline:** Keep `Things` as the H1 for the admin view; it's distinctive. For new-user empty state (no tasks yet), introduce: _"Nothing on the board yet. Add the first thing — a chore, a bill, whatever's on your mind."_
- **Primary CTA on the add-task form:** Keep the placeholder rotation. Consider adding one new line: `"What's needed around here?"` (matches tagline). The current set in `app/add-task-form.tsx:18-24` is good — don't shrink it.
- **Empty states:**
  - Tasks (admin): _"You're caught up. Nothing on the board."_
  - Tasks (kid mode): _"All done for now ✨"_ (current voice — keep)
  - Projects: _"No projects yet. A project is anything bigger than one task — a remodel, a holiday, a birthday."_ (Currently: "Nothing on the board yet. Add a project above." — slightly stronger as above.)
  - Notes: _"No notes yet. Use this for the boring-but-important — warranties, account numbers, links you'll want later."_
  - Routines: _"No routines yet. Bills, chores, anything that comes around again."_
- **Navigation labels:** Keep `Things` / `Routines` / `Projects` / `Notes`. They're already strong — distinctive, plainspoken, and consistent with each other. Do not rename to "Tasks" or "Inbox".
- **PWA install prompt copy:** _"Add Stead to your home screen. It works like an app — and goes wherever you do."_
- **Sign-in screen:** Replace `Sign in to continue` with: _"Sign in to your household."_ (Reinforces the multi-household model from `HOUSEHOLDS.md` and feels more grounded than the generic placeholder.)
- **Access-denied message:** The current text — _"Your account hasn't been added yet. Ask Craig to add your email."_ — is great for a private app but will not generalise. If the app stays private to Craig + sister, leave it. If it ever opens up: _"This household hasn't added you yet. Ask the admin to invite you."_
- **Sign-out tooltip:** Keep `Sign out`. (Currently correct.)
- **Streak text:** `🔥 {n}-day streak` — good. Keep.
- **Push notification body copy:** Recommend a consistent voice: `"Tomorrow: {task title}"`, `"Around the house today: {task title}"`. Avoid corporate-feeling phrasing like `"Reminder: ..."`.

## Metadata / PWA Recommendations

Concrete file-level changes once a name is chosen (using **Stead** as the worked example):

- **`package.json`** — update `name` from `home-pm-scaffold` to `stead`. The repo identity is still scaffold-era; fix it.
- **`public/manifest.json`** —
  - `name`: `"Stead"`
  - `short_name`: `"Stead"` (already short enough; no truncation needed)
  - Add `"description": "What's needed around the house — tasks, routines, projects, and notes for your household."`
  - Add `"categories": ["productivity", "lifestyle"]`
  - Keep `theme_color: "#6B7A5A"` and `background_color: "#F9F5EF"` — they match the brand.
- **`app/layout.tsx`** (metadata block, lines 31–39) —
  - `title: "Stead"`
  - `description: "Your household's shared place for tasks, routines, projects, and notes."`
  - `appleWebApp.title: "Stead"`
  - Consider adding `openGraph` and `twitter` metadata blocks if any link previews matter (e.g., when sharing the install URL with a household member).
- **`app/login/page.tsx`** (line 14) — replace `The Board` with `Stead`.
- **`app/nav.tsx`** (line 16) — replace `The Board` with `Stead`.
- **`README.md`** and **`CLAUDE.md`** — both refer to "Home PM". Update to `Stead` so the docs match the product. Project name in `PROJECT_PLAN.md` and `HOUSEHOLDS.md` should be aligned too.
- **PWA icon (`/api/pwa-icon`)** — currently dynamic. Consider committing a single distinctive wordmark or monogram icon in the chosen brand colour. A single Fraunces "S" on the sage `#6B7A5A` background would be consistent with the existing identity.

If a different name wins, the same file list applies; just substitute. No code changes are needed beyond the strings listed.

## Brand Voice Guidance

- **Sound like a thoughtful housemate, not a productivity coach.** Plainspoken, slightly old-fashioned, gentle. The kind of voice that says _"what's needed around the house"_, not _"optimise your day"_.
- **Use household nouns over productivity nouns.** _Things_ over _tasks_. _Routines_ over _habits_. _The board_ over _the dashboard_. _Around here_ over _your workspace_. The current UI is already doing this; protect it.
- **Be specific, not motivational.** Empty states should describe what to put in the slot, not encourage the user ("Add a chore, a bill, whatever's on your mind" > "Get started!").
- **Avoid emojis in admin-facing copy, allow them in kid-mode.** The existing split in `welcome-header.tsx` (admin gets clean greetings, kid gets ☀️🌤🌙) is correct — keep it.
- **Example sentence the brand should be willing to say:** _"You're caught up. Nothing on the board."_ — declarative, warm, no exclamation point.

## Final Recommendation

**Primary recommendation:** Rename from `The Board` (current shipping name) to **Stead**, with **Mantel** as the alternative if `Stead` doesn't survive trademark or domain screening. Both keep the metaphorical, household-warm positioning the UI has already chosen; both are more defensible than "The Board" or "Home PM". Keep "The Board" only as a fallback if both alternatives fail screening — at that point the metaphor is doing more work than the name itself.

**First practical next steps**

1. **Pick two finalists** from this list (recommend: Stead + Mantel) and run domain WHOIS + USPTO TESS searches on each. Don't commit until at least one passes both.
2. **Choose between `.app` and `.family` / `.house`** based on what's available. The `.app` TLD aligns with the PWA-first positioning; `.family` is cheaper and on-message.
3. **Fix the half-renamed state regardless of the outcome.** `package.json` and the engineering docs should agree with the manifest. Even if Craig keeps "The Board" for now, that drift is worth resolving in the next commit.
4. **Audit user-facing strings against the voice guidance above** in a single PR — most of the changes are one-line string swaps in the files listed under _Metadata / PWA Recommendations_.
5. **Before any public/commercial step**, get a proper trademark screen done — the screens above are necessary but not sufficient.

The product is already 80% on-brand. The remaining 20% is mostly choosing a name that is both true to what the app feels like and ownable.

---

## Live UI Addendum — Observations from `localhost:3000`

After writing the readout, I reviewed the running app at `localhost:3000` (Things, Routines, Projects, and Notes views, signed in as admin). The live UI is more strongly aligned with the editorial / household-warmth direction than the theme tokens alone suggested. A few specifics worth feeding back into the recommendation:

**Typography is doing more brand work than I assumed.** Fraunces in the wordmark, the page-level H1 ("Things", "Routines", "Projects", "Notes"), and the "Coming up" section heading reads almost like a small-press household journal — closer to a Field Notes or a Kinfolk masthead than to a productivity app. Any name chosen needs to look right in that wordmark. **Stead, Mantel, Folio, and Tally** all set well in Fraunces; **Roost** and **Kindling** would also work but read more "blog-from-2014" in that face.

**The voice is even gentler than the placeholder rotation implied.** Beyond `What needs doing around here?`, I noticed in the live UI:

- The completed-tasks toggle reads **"6 things handled"** — _handled_ is exactly the right word for this brand. It's warm, completed-but-not-clinical, and doesn't sound like a help desk. Recommend keeping this everywhere and using it in the Voice Guidance section above.
- The recurring-task input placeholder is **"What recurs? (e.g. Pay electricity bill)"** — interrogative, plainspoken.
- The Notes empty state is **"Nothing saved yet. Add a thought above."** — _add a thought_ is excellent. It treats Notes like a commonplace book, not a database. Stronger than the empty state I proposed above. Recommend keeping this verbatim.
- Progressive disclosure on forms uses **`+ Body  + Attach  + Project`** style chips — feels like marginalia rather than form-fill, and reinforces the analog feel. This is a real piece of brand personality; protect it.

**People chips are part of the identity.** The colored monogram circles (Craig in sage, Hudson in umber, Quinn in mauve) plus the streak-fire emoji (`🔥2`) when active create a small, warm "family-bulletin" effect at the top of every page. This is one of the strongest pieces of brand expression in the app and should survive any rename intact. A name like **Roost** or **Mantel** would lean into this further (each person is a roost-mate / a name on the mantel); **Stead** would too (stead-mates).

**The wordmark currently fights itself.** "The Board" set in Fraunces reads beautifully — but its meaning is so generic that the typography is dressing up a placeholder. A name with more specificity (Stead, Mantel, Folio) lets the typography do real work rather than gilding a non-specific noun.

**Refined ranking after seeing the live UI:**

1. **Stead** — unchanged. Still the most defensible. Sets beautifully in Fraunces.
2. **Mantel** — unchanged. The "family bulletin" identity on the home page makes this even more on-brand than I gave it credit for.
3. **Folio** — promoted from the lower half of the list. The editorial typography, the four-content-type model, and the way the app already feels like a bound collection rather than a list of tasks make Folio surprisingly native here. Worth screening alongside Stead and Mantel.

**One updated copy recommendation:** In _In-App Copy Recommendations_ above, my proposed empty state for Notes (_"No notes yet. Use this for the boring-but-important..."_) is **worse than what is already shipping** (_"Nothing saved yet. Add a thought above."_). Keep the existing copy. The rest of the empty-state recommendations stand.

The overall recommendation does not change. If anything, the live UI strengthens the case: the brand identity already exists in the typography, palette, and voice — the name is the only piece that hasn't caught up.
