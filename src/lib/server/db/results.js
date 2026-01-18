// src/lib/server/db/results.js
export async function getResultsForEvent(db, eventId) {
  const row = await db
    .prepare(`SELECT payload_json, published_at, updated_at FROM event_results WHERE event_id = ?`)
    .bind(eventId)
    .first();

  if (!row) return null;

  let payload = null;
  try {
    payload = JSON.parse(row.payload_json);
  } catch {
    payload = null;
  }

  return {
    payload,
    published_at: row.published_at,
    updated_at: row.updated_at
  };
}

export async function upsertResultsForEvent(db, eventId, payload) {
  const payloadJson = JSON.stringify(payload ?? {});

  await db
    .prepare(`
      INSERT INTO event_results (event_id, payload_json)
      VALUES (?, ?)
      ON CONFLICT(event_id) DO UPDATE SET
        payload_json = excluded.payload_json,
        updated_at   = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    `)
    .bind(String(eventId), payloadJson)
    .run();
}


