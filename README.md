# Irving Collective — Offseason Lounge 🥃

A premium, lounge-themed fantasy + gambling-adjacent mini-league hub where GMs pick, sweat, and talk reckless (respectfully).
Built on **SvelteKit + Cloudflare Workers + D1**, with an admin suite for locks, publishing official results, and recomputing scoring.

> Velvet-rope access. Picks. Points. Prestige.

---

## ✨ Features

### Player-facing
- **Events hub**: upcoming + active games, lock times, and status pills
- **Game pages per event type** (Daytona, Madness, Masters, Derby, World Cup, etc.)
- **Entry saving + validation** (client UX + server actions)
- **Rules modal per game** (consistent “Rules” UX across all games)
- **Leaderboard** with scoring breakdown support (where implemented)

### Admin suite
- **Admin → Events** management UI
- **Lock overrides** per event:
  - Auto / Manual Lock / Manual Unlock
- **Publish results + recompute scores**
- **Unpublish results** (clears computed scores for that event, entries remain)
- **Seed sync** where relevant (game-specific)
- **Event-type handlers** via a shared admin results controller pattern

---

## 🧱 Tech Stack

- **SvelteKit** (App router + server actions)
- **Cloudflare Workers** (deployment/runtime)
- **Cloudflare D1** (SQLite-backed DB)
- **Wrangler** (local dev + migrations)
- A very intentional **dark lounge UI** (gold accents, glass blur, soft shadows)

---

## 🗂️ Project Structure (high level)

```txt
src/
  lib/
    games/
      adminResults.server.js         # shared admin actions + routing to handlers
      daytona/...
      madness/...
      masters/...
      kentucky-derby/...
      worldcup/...
    server/
      db/                            # D1 query helpers (events, entries, results, scores)
      scoring/                       # recompute + scoring logic
    ui/                              # reusable UI components (SectionHeader, pills, etc.)
    components/                      # Rules modal, admin widgets
  routes/
    (app)/
      admin/
        events/
          [slug]/results/            # per-event admin results pages
🚀 Getting Started
1) Install
npm install
2) Local dev (Workers + D1)
npm run dev
If you use Wrangler directly:

wrangler dev
3) D1 database
You’ll need a D1 database configured in wrangler.toml.

Common commands:

wrangler d1 migrations apply DB --local
wrangler d1 migrations apply DB
If you need to run a quick query:

wrangler d1 execute DB --command "SELECT * FROM events;"
🔐 Auth + Roles
App uses session-based auth (/api/auth/*)

locals.user determines access

Admin routes check locals.user and/or locals.user.role === 'admin'

🎮 Games & Scoring
Each event has a type (ex: daytona, madness, masters, derby, worldcup) and a handler module.

Publishing results (admin)
When an admin publishes:

Game-specific handler validates + stores results payload

Server recomputes scores for all entries in that event

Event gets marked results_published_at = unixepoch()

Unpublishing results (admin)
When an admin unpublishes:

events.results_published_at is set to NULL

all entry_scores for that event are deleted

entries remain intact

This is intentional: unpublish removes computed scoring, not picks.

🧰 Admin: Locks
Events support auto locks with manual override flags:

manual_lock = 1 forces locked

manual_unlock = 1 forces open

default is auto behavior using lock_at

Admin UI exposes:

Lock / Unlock / Auto buttons (segmented control style)

🧾 Rules Modal
All game pages can pass a rules object to SectionHeader to display a consistent modal.

Rules live per game (ex: src/lib/games/<game>/rules.js) and are passed in like:

<SectionHead rules={DAYTONA_RULES} />
🧪 Testing Notes
“Published” state is driven by events.results_published_at

Always verify both:

Admin results page state

Admin events list “Published” pill

If something seems “stuck,” check D1 rows for:

events.results_published_at

existing entry_scores for the event

🧨 Common Fixes / Gotchas
“Unpublish button does nothing / 500 error”
Check the server action is wired: actions.unpublish

Confirm actionUnpublish({ db, event }) is called correctly

Confirm D1 schema includes events.results_published_at

“Published pill still showing after unpublish”
Ensure the UI reads from event.results_published_at

Confirm you’re not caching old event data in load

Hard refresh the route after action completes (or return updated data)

“Mobile UI overflow”
Make sure lists/buttons use fixed sizing + flex-shrink: 0

Prefer position: fixed + proper z-index layering for mobile drawers/modals

🌐 Deployment
wrangler deploy
Make sure:

wrangler.toml bindings include DB

production migrations are applied

secrets/env are configured (auth keys, etc.)

🧠 Roadmap Ideas (aka “Next Drinks”)
Admin “Delete/Deactivate user” (soft-delete) + orphan cleanup safeguards

Global reusable “Confirm Danger” modal for destructive actions

Enhanced leaderboard: click player → expand per-event score breakdown

Per-game rules editing in admin (stored in DB)

Audit log for admin actions (publish/unpublish/locks)