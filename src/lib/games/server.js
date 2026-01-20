// src/lib/games/server.js
import { error, fail } from '@sveltejs/kit';
import { saveEntry as saveDaytonaEntry } from '$lib/games/daytona/server.js';
import { saveEntry as saveMadnessEntry } from '$lib/games/madness/server.js';

const SAVE_BY_TYPE = {
  daytona: saveDaytonaEntry,
  madness: saveMadnessEntry
};

export async function saveEntryForEvent({ request, params, platform, locals }) {
  const db = platform?.env?.DB;
  if (!db) throw error(500, 'Database not available');
  if (!locals.user) throw error(401, 'Not authenticated');

  const slug = params.slug;

  const event = await db
    .prepare(`SELECT id, lock_at, type FROM events WHERE slug = ? LIMIT 1`)
    .bind(slug)
    .first();

  if (!event) throw error(404, 'Event not found');

  const now = Math.floor(Date.now() / 1000);
  const locked = now >= Number(event.lock_at);
  if (locked) return fail(403, { message: 'Event is locked. Entries can’t be edited.' });

  const handler = SAVE_BY_TYPE[event.type];
  if (!handler) return fail(400, { message: 'Unsupported event type for entry submission.' });

  const form = await request.formData();

  return handler({
    db,
    event,
    userId: locals.user.id,
    form,
    now,
    locked
  });
}
