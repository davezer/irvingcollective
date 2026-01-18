// src/lib/server/scoring/recompute.js
import { getResultsForEvent } from "../db/results.js";
import { upsertEntryScore } from "../db/scores.js";
import { scoreEntryByEventType } from "./index.js";

// recompute all entry_scores for a single event
export async function recomputeScoresForEvent(db, event) {
  const results = await getResultsForEvent(db, event.id);
  if (!results?.payload) {
    return { ok: false, error: "No results published for this event yet." };
  }

  // Load entries for this event
  const entriesRes = await db
    .prepare(`SELECT user_id, payload_json FROM entries WHERE event_id = ?`)
    .bind(event.id)
    .all();

  const entries = entriesRes?.results ?? [];

  for (const row of entries) {
    let payload = null;
    try {
      payload = row.payload_json ? JSON.parse(row.payload_json) : null;
    } catch {
      payload = null;
    }

    const scored = scoreEntryByEventType(event.type, payload, results.payload);
    await upsertEntryScore(db, event.id, row.user_id, scored.total, scored.breakdown);
  }

  return { ok: true, count: entries.length };
}
