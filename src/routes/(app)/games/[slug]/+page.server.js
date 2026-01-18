// src/routes/(app)/games/[slug]/+page.server.js
import { error, fail } from '@sveltejs/kit';
import { getEntryForUser, upsertEntryForUser } from '$lib/server/db/entries.js';

export async function load({ params, platform, locals }) {
  const db = platform?.env?.DB;
  if (!db) throw error(500, 'Database not available');
  if (!locals.user) throw error(401, 'Not authenticated');
  const slug = params.slug;
  const event = await db
    .prepare(
      `SELECT id, slug, name, type, start_at, lock_at
       FROM events
       WHERE slug = ?
       LIMIT 1`
    )
    .bind(slug)
    .first();

  if (!event) throw error(404, 'Event not found');

  const now = Math.floor(Date.now() / 1000);
  const locked = now >= Number(event.lock_at);

  const entry = await getEntryForUser({
    db,
    eventId: event.id,
    userId: locals.user.id
  });

  return { event, locked, entry };
}

export const actions = {
  save: async ({ request, params, platform, locals }) => {
    const db = platform?.env?.DB;
    if (!db) throw error(500, 'Database not available');

    const slug = params.slug;

    const event = await db
      .prepare(`SELECT id, lock_at, type FROM events WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first();

    if (!event) throw error(404, 'Event not found');

    const now = Math.floor(Date.now() / 1000);
    const locked = now >= Number(event.lock_at);
    if (locked) return fail(403, { message: 'Event is locked. Entries can’t be edited.' });

    if (event.type !== 'daytona') {
      return fail(400, { message: 'Unsupported event type for entry submission.' });
    }

    const form = await request.formData();
    

    // ---- Top 10 IDs ----
    let top10Ids;
    try {
      top10Ids = JSON.parse(String(form.get('top10Ids') || '[]')).map(String);
    } catch {
      return fail(400, { message: 'Invalid top10 payload.' });
    }

    top10Ids = top10Ids.filter(Boolean).slice(0, 10);
    const uniq = new Set(top10Ids);
    if (top10Ids.length !== 10 || uniq.size !== 10) {
      return fail(400, { message: 'You must pick exactly 10 unique drivers.' });
    }

    // ---- Top 10 Snapshot (optional but we want it) ----
    let top10Snapshot = null;
    const top10SnapshotRaw = form.get('top10Snapshot');

    if (typeof top10SnapshotRaw === 'string' && top10SnapshotRaw.trim()) {
      try {
        const parsed = JSON.parse(top10SnapshotRaw);

        if (!Array.isArray(parsed)) throw new Error('snapshot not array');

        // Normalize to {id,name,carNumber} and keep first 10 only
        const normalized = parsed
          .slice(0, 10)
          .map((x) => ({
            id: x?.id != null ? String(x.id) : '',
            name: x?.name != null && String(x.name).trim() ? String(x.name).trim() : null,
            carNumber:
              x?.carNumber != null && String(x.carNumber).trim()
                ? String(x.carNumber).trim()
                : null
          }))
          .filter((x) => x.id);

        // Snapshot should match top10Ids order exactly (best effort).
        // If it doesn’t, we still store it but re-order to match ids.
        const map = new Map(normalized.map((x) => [String(x.id), x]));
        const reordered = top10Ids.map((id) => map.get(String(id)) || { id, name: null, carNumber: null });

        top10Snapshot = reordered;
      } catch {
        // Don’t hard-fail; we can still save the entry without snapshot
        top10Snapshot = null;
      }
    }

    // ---- Chaos Car (optional) + snapshot ----
    const chaosCarIdRaw = form.get('chaosCarId');
    const chaosCarId =
      typeof chaosCarIdRaw === 'string' && chaosCarIdRaw.trim()
        ? chaosCarIdRaw.trim()
        : null;

    if (chaosCarId && top10Ids.includes(chaosCarId)) {
      return fail(400, { message: 'Chaos car can’t be one of your Top 10 picks.' });
    }

    let chaosCarSnapshot = null;

    if (chaosCarId) {
      const chaosCarNameRaw = form.get('chaosCarName');
      const chaosCarNumberRaw = form.get('chaosCarNumber');

      const chaosCarName =
        typeof chaosCarNameRaw === 'string' && chaosCarNameRaw.trim()
          ? chaosCarNameRaw.trim()
          : '';

      const chaosCarNumber =
        typeof chaosCarNumberRaw === 'string' && chaosCarNumberRaw.trim()
          ? chaosCarNumberRaw.trim()
          : '';

      chaosCarSnapshot = {
        id: chaosCarId,
        name: chaosCarName || null,
        carNumber: chaosCarNumber || null
      };
    }
    if (!chaosCarId) return fail(400, { message: 'You must choose a Chaos Car.' });

    const payload = { top10Ids, top10Snapshot, chaosCarId, chaosCarSnapshot };

    await upsertEntryForUser({
      db,
      eventId: event.id,
      userId: locals.user.id,
      payload,
      now
    });

    return { success: true };
  }
};
