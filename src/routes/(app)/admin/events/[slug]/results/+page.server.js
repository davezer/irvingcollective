// src/routes/(app)/admin/events/[slug]/results/+page.server.js
import { error, redirect, fail } from "@sveltejs/kit";
import { getResultsForEvent, upsertResultsForEvent } from "$lib/server/db/results.js";
import { recomputeScoresForEvent } from "$lib/server/scoring/recompute.js";

async function getEventBySlug(db, slug) {
  return await db
    .prepare(`SELECT id, slug, name, type, start_at FROM events WHERE slug = ?`)
    .bind(slug)
    .first();
}

export const load = async ({ locals, platform, params }) => {
  if (!locals.user) throw redirect(302, "/login");
  // if (!locals.user.is_admin) throw redirect(302, "/");

  const db = platform.env.DB;
  const event = await getEventBySlug(db, params.slug);
  if (!event) throw error(404, "Event not found");

  const results = await getResultsForEvent(db, event.id);

  return { event, results };
};

export const actions = {
  publish: async ({ locals, platform, params, request }) => {
    if (!locals.user) throw redirect(302, "/login");
    // if (!locals.user.is_admin) throw redirect(302, "/");

    const db = platform.env.DB;
    const event = await getEventBySlug(db, params.slug);
    if (!event) return fail(404, { ok: false, error: "Event not found" });

    const form = await request.formData();

    // Expect 10 positions: pos1..pos10 and chaosCarId
    const top10 = [];
    for (let i = 1; i <= 10; i++) {
      const v = (form.get(`pos${i}`) || "").toString().trim();
      if (!v) return fail(400, { ok: false, error: `Missing position ${i}` });
      top10.push(v);
    }

    const chaosCarId = (form.get("chaosCarId") || "").toString().trim();
    if (!chaosCarId) return fail(400, { ok: false, error: "Missing chaos car" });

    // basic uniqueness check
    const uniq = new Set(top10);
    if (uniq.size !== 10) return fail(400, { ok: false, error: "Top 10 must be unique." });
    if (uniq.has(chaosCarId)) return fail(400, { ok: false, error: "Chaos car cannot be in top 10." });

    const payload = {
      officialTop10Ids: top10,
      chaosCarId
    };

    await upsertResultsForEvent(db, event.id, payload);
    const recompute = await recomputeScoresForEvent(db, event);

    if (!recompute.ok) return fail(400, { ok: false, error: recompute.error });

    return { ok: true, count: recompute.count };
  }
};
