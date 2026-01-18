// src/routes/(app)/leaderboard/+page.server.js
import { error } from '@sveltejs/kit';

function safeJsonParse(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

export async function load({ platform }) {
  const db = platform?.env?.DB;
  if (!db) throw error(500, 'Database not available');

  // Overall totals
  const totalsRes = await db
    .prepare(
      `
      SELECT
        u.id AS user_id,
        u.display_name,
        COALESCE(SUM(es.score_total), 0) AS points
      FROM users u
      LEFT JOIN entry_scores es ON es.user_id = u.id
      GROUP BY u.id
      ORDER BY points DESC, u.display_name ASC
    `
    )
    .all();

  const totals = (totalsRes.results ?? []).map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    display_name: r.display_name,
    points: Number(r.points ?? 0)
  }));

  // Per-event breakdown per user
  const breakdownRes = await db
    .prepare(
      `
      SELECT
        es.user_id,
        es.event_id,
        e.name AS event_name,
        e.start_at,
        es.score_total,
        es.breakdown_json
      FROM entry_scores es
      JOIN events e ON e.id = es.event_id
      ORDER BY es.user_id, e.start_at ASC
    `
    )
    .all();

  const byUser = {};
  for (const r of breakdownRes.results ?? []) {
    const uid = r.user_id;
    if (!byUser[uid]) byUser[uid] = [];

    const breakdown = safeJsonParse(r.breakdown_json);
    const totals = breakdown?.totals ?? null;

    byUser[uid].push({
      event_id: r.event_id,
      event_name: r.event_name,
      start_at: r.start_at,
      points: Number(r.score_total ?? 0),
      breakdown,
      totals
    });
  }

  return { totals, byUser };
}
