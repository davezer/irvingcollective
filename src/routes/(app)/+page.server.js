// src/routes/(app)/+page.server.js
import { error } from '@sveltejs/kit';

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

export async function load({ platform, locals }) {
  const db = platform?.env?.DB;
  if (!db) throw error(500, 'Database not available');
  if (!locals.user) throw error(401, 'Not authorized');

  const now = nowSec();

  // Next events (prefer start_at if present, else lock_at)
  const evRes = await db
    .prepare(
      `
      SELECT
        id, slug, name, type,
        start_at, lock_at,
        manual_lock, manual_unlock
      FROM events
      ORDER BY COALESCE(start_at, lock_at) ASC
    `
    )
    .all();

  const eventsAll = (evRes.results ?? []).map((e) => ({
    id: e.id,
    slug: e.slug,
    name: e.name,
    type: e.type,
    start_at: e.start_at ? Number(e.start_at) : null,
    lock_at: Number(e.lock_at),
    manual_lock: Number(e.manual_lock || 0),
    manual_unlock: Number(e.manual_unlock || 0)
  }));

  const eventsUpcoming = eventsAll
    .filter((e) => (e.start_at ?? e.lock_at) >= now - 60 * 60 * 24)
    .slice(0, 3);

  const nextEvent = eventsUpcoming[0] || eventsAll[0] || null;

  // Bankroll: SUM(entry_scores.score_total) for user
  const bankrollRow = await db
    .prepare(`SELECT COALESCE(SUM(score_total), 0) AS total FROM entry_scores WHERE user_id = ?`)
    .bind(locals.user.id)
    .first();

  const bankroll = Number(bankrollRow?.total ?? 0);

  // Leaderboard top 5 (total points)
  const topRes = await db
    .prepare(
      `
      SELECT
        u.id AS user_id,
        u.display_name AS display_name,
        COALESCE(SUM(es.score_total), 0) AS total
      FROM users u
      LEFT JOIN entry_scores es ON es.user_id = u.id
      GROUP BY u.id
      ORDER BY total DESC, u.display_name ASC
      LIMIT 5
    `
    )
    .all();

  const top = (topRes.results ?? []).map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    displayName: r.display_name,
    total: Number(r.total ?? 0)
  }));

  // My rank (dense rank)
  const myRankRow = await db
    .prepare(
      `
      WITH totals AS (
        SELECT user_id, COALESCE(SUM(score_total), 0) AS total
        FROM entry_scores
        GROUP BY user_id
      ),
      ranked AS (
        SELECT
          user_id,
          total,
          DENSE_RANK() OVER (ORDER BY total DESC) AS r
        FROM totals
      )
      SELECT r AS rank
      FROM ranked
      WHERE user_id = ?
    `
    )
    .bind(locals.user.id)
    .first();

  const myRank = myRankRow?.rank ? Number(myRankRow.rank) : null;

  return {
    nextEvent,
    eventsUpcoming,
    bankroll,
    top,
    myRank,
    user: {
        display_name:
        locals.user?.display_name ??
        locals.user?.displayName ??
        locals.user?.name ??
        'Member'
    }
  };
}
