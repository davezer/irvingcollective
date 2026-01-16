// src/routes/(app)/games/[slug]/+page.server.js
import { error, fail } from '@sveltejs/kit';
import { getEntryForUser, upsertEntryForUser } from '$lib/server/db/entries.js';

export async function load({ params, platform, locals }) {
  const db = platform?.env?.DB;
  if (!db) throw error(500, 'Database not available');

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

    let top10Ids;
    try {
      top10Ids = JSON.parse(String(form.get('top10Ids') || '[]')).map(String);
    } catch {
      return fail(400, { message: 'Invalid top10 payload.' });
    }

    // Validate exactly 10 unique picks
    top10Ids = top10Ids.filter(Boolean).slice(0, 10);
    const uniq = new Set(top10Ids);
    if (top10Ids.length !== 10 || uniq.size !== 10) {
      return fail(400, { message: 'You must pick exactly 10 unique drivers.' });
    }

    const payload = { top10Ids };

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
