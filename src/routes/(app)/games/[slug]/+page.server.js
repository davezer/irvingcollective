// src/routes/(app)/games/[slug]/+page.server.js
import { error } from '@sveltejs/kit';
import { getEntryForUser } from '$lib/server/db/entries.js';
import { saveEntryForEvent } from '$lib/games/server.js';
import { getResultsForEvent } from '$lib/server/db/results.js';

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
  
  const results = event ? await getResultsForEvent(db, event.id) : null;

  return { event, locked, entry, results };
}

export const actions = {
  save: saveEntryForEvent
};
