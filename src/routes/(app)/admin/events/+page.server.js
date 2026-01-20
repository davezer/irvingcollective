// src/routes/(app)/admin/events/+page.server.js
import { redirect, fail } from '@sveltejs/kit';
import { recomputeScoresForEvent } from '$lib/server/scoring/recompute.js';

export const load = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(302, '/login');
  // if (!locals.user.is_admin) throw redirect(302, "/");

  const db = platform.env.DB;

  const res = await db
    .prepare(
      `
      SELECT
        e.id,
        e.slug,
        e.name,
        e.type,
        e.lock_at,
        e.start_at,

        r.published_at AS resultsPublishedAt,
        CASE WHEN r.payload_json IS NOT NULL AND r.payload_json != '' THEN 1 ELSE 0 END AS resultsPublished,

        COALESCE(ec.entry_count, 0) AS entriesSubmitted
      FROM events e
      LEFT JOIN results r ON r.event_id = e.id
      LEFT JOIN (
        SELECT event_id, COUNT(*) AS entry_count
        FROM entries
        GROUP BY event_id
      ) ec ON ec.event_id = e.id
      ORDER BY e.start_at ASC
      `
    )
    .all();

  const events = (res?.results ?? []).map((e) => ({
    ...e,
    resultsPublished: Boolean(e.resultsPublished),
    entriesSubmitted: Number(e.entriesSubmitted ?? 0)
  }));

  return { events };
};

export const actions = {
  recompute: async ({ locals, platform, request }) => {
    if (!locals.user) throw redirect(302, '/login');
    // if (!locals.user.is_admin) throw redirect(302, "/");

    const db = platform.env.DB;
    const form = await request.formData();

    const eventId = (form.get('eventId') || '').toString().trim();
    if (!eventId) return fail(400, { ok: false, error: 'Missing eventId' });

    const event = await db
      .prepare(`SELECT id, slug, name, type, start_at, lock_at FROM events WHERE id = ? LIMIT 1`)
      .bind(eventId)
      .first();

    if (!event) return fail(404, { ok: false, error: 'Event not found' });

    const out = await recomputeScoresForEvent(db, event);
    if (!out?.ok) return fail(400, { ok: false, error: out?.error || 'Recompute failed' });

    return { ok: true, count: out.count };
  }
};
