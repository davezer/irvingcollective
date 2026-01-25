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

Getting Started
1) Install
npm install
2) Local dev (Workers + D1)
npm run dev


🧠 Roadmap Ideas (aka “Next Drinks”)
Admin “Delete/Deactivate user” (soft-delete) + orphan cleanup safeguards

Global reusable “Confirm Danger” modal for destructive actions

Enhanced leaderboard: click player → expand per-event score breakdown

Per-game rules editing in admin (stored in DB)

Audit log for admin actions (publish/unpublish/locks)