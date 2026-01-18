// src/routes/(app)/admin/events/+page.server.js
import { redirect } from "@sveltejs/kit";
import { getResultsForEvent } from "$lib/server/db/results.js";

export const load = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(302, "/login");

  // If you have an is_admin field, enforce it here.
  // Example: if (!locals.user.is_admin) throw redirect(302, "/");

  const db = platform.env.DB;

  const evRes = await db
    .prepare(`SELECT id, slug, name, type, lock_at, start_at FROM events ORDER BY start_at ASC`)
    .all();

  const events = evRes?.results ?? [];

  // attach whether results exist
  const enriched = [];
  for (const e of events) {
    const r = await getResultsForEvent(db, e.id);
    enriched.push({
      ...e,
      resultsPublished: !!r?.payload,
      resultsPublishedAt: r?.published_at ?? null
    });
  }

  return { events: enriched };
};
