// src/lib/server/scoring/recompute.js
import { getResultsForEvent } from "$lib/server/db/results.js";
import { scoreDaytonaEntry } from "$lib/scoring/daytona.js";
import { scoreMarchMadnessEntry } from "$lib/scoring/march_madness.js";
import { scoreMastersEntry } from '$lib/scoring/masters.js';
import { scoreDerbyEntry } from '$lib/scoring/derby.js';

function safeJsonParse(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

export async function recomputeScoresForEvent(db, event) {
  if (!event?.id) return { ok: false, error: "Missing event" };

  // Load official results
  const results = await getResultsForEvent(db, event.id);
  const resultsPayload = results?.payload || results?.payload_json || results?.payloadJson || results?.payload_json;

  // Your getResultsForEvent probably returns parsed payload already.
  // But to be safe:
  const officialPayload =
    typeof resultsPayload === "string" ? safeJsonParse(resultsPayload) : resultsPayload;

  if (event.type === "daytona") {
  if (!officialPayload?.officialTop10Ids || officialPayload.officialTop10Ids.length !== 10) {
    return { ok: false, error: "Official results missing Top 10 (need 10 IDs)." };
  }
}

if (event.type === "madness") {
  if (!officialPayload?.seedsByTeamId || !officialPayload?.winsByTeamId) {
    return { ok: false, error: "Official results missing seedsByTeamId and/or winsByTeamId." };
  }
}
if (event.type === "masters") {
  if (!officialPayload?.winnerId) {
    return { ok: false, error: "Official results missing winnerId." };
  }
  if (event.type === "derby") {
  if (!officialPayload?.winnerHorseId || !officialPayload?.payout) {
    return { ok: false, error: "Official results missing winnerHorseId and/or payout." };
  }
}
}


  // Pull all entries for this event
  const entriesRes = await db
    .prepare(`
      SELECT user_id, payload_json
      FROM entries
      WHERE event_id = ?
    `)
    .bind(event.id)
    .all();

  const rows = entriesRes?.results ?? [];
  let count = 0;

  for (const row of rows) {
    const entryPayload = safeJsonParse(row.payload_json) || {};
    let scored;

    if (event.type === "daytona") {
      scored = scoreDaytonaEntry({ entryPayload, resultsPayload: officialPayload });
    } else if (event.type === "madness") {
      scored = scoreMarchMadnessEntry({ entryPayload, resultsPayload: officialPayload });
    }  else if (event.type === "masters") {
      scored = scoreMastersEntry({ entryPayload, resultsPayload: officialPayload });
    } else if (event.type === "derby") {
      scored = scoreDerbyEntry({ entryPayload, resultsPayload: officialPayload });
    }
    
    else {
      scored = { score_total: 0, breakdown: { totals: { total: 0 }, notes: ["No scorer for this event type."] } };
    }


    await db
      .prepare(`
        INSERT INTO entry_scores (event_id, user_id, score_total, breakdown_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(event_id, user_id) DO UPDATE SET
          score_total = excluded.score_total,
          breakdown_json = excluded.breakdown_json,
          updated_at = excluded.updated_at
      `)
      .bind(
        event.id,
        row.user_id,
        scored.score_total,
        JSON.stringify(scored.breakdown || null),
        Math.floor(Date.now() / 1000)
      )
      .run();

    count++;
  }

  return { ok: true, count };
}
