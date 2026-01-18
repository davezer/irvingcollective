// src/routes/(app)/admin/events/[slug]/results/+page.server.js
import { error, redirect, fail } from '@sveltejs/kit';
import { getResultsForEvent, upsertResultsForEvent } from '$lib/server/db/results.js';
import { recomputeScoresForEvent } from '$lib/server/scoring/recompute.js';
import { getDriverOptionsForEvent } from "$lib/server/nascar/getDriverOptions.js";

async function getEventBySlug(db, slug) {
	return await db
		.prepare(`SELECT id, slug, name, type, start_at FROM events WHERE slug = ?`)
		.bind(slug)
		.first();
}

function safeJsonParse(str) {
	try {
		return str ? JSON.parse(str) : null;
	} catch {
		return null;
	}
}

export const load = async ({ locals, platform, params }) => {
	if (!locals.user) throw redirect(302, '/login');
	// if (!locals.user.is_admin) throw redirect(302, "/");

	const db = platform.env.DB;
	const event = await getEventBySlug(db, params.slug);
	if (!event) throw error(404, 'Event not found');

	const results = await getResultsForEvent(db, event.id);
  let driverOptions = [];
  let optionsMode = "";
  let optionsNote = "";

  if (event.type === "daytona") {
    const opt = await getDriverOptionsForEvent({ event, fetch });

  // opt.options is always an array, opt.note/mode always strings
  driverOptions = opt.options;
  optionsMode = opt.mode;
  optionsNote = opt.note;
;
  }


	// ✅ Pull all entries for this event with usernames
	const entriesRes = await db
		.prepare(
			`
    SELECT
      e.user_id,
      u.display_name,
      e.payload_json,
      e.submitted_at,
      e.updated_at
    FROM entries e
    JOIN users u ON u.id = e.user_id
    WHERE e.event_id = ?
    ORDER BY e.updated_at DESC, e.submitted_at DESC
  `
		)
		.bind(event.id)
		.all();

	const entries = (entriesRes?.results ?? []).map((row) => {
		const payload = safeJsonParse(row.payload_json) ?? {};

		// Prefer snapshots for display
		const top10Snapshot = Array.isArray(payload.top10Snapshot) ? payload.top10Snapshot : [];
		const top10Ids = Array.isArray(payload.top10Ids) ? payload.top10Ids : [];

		const chaosSnap = payload.chaosCarSnapshot ?? null;
		const chaosId = payload.chaosCarId ?? null;

		// Create a display list of 10 picks, favoring snapshot objects
		const top10Display = Array.from({ length: 10 }, (_, i) => {
			const snap = top10Snapshot[i];
			if (snap?.id) return snap;
			const id = top10Ids[i] ?? null;
			return id ? { id, name: `Driver ${id}`, carNumber: '' } : null;
		}).filter(Boolean);

		const chaosDisplay = chaosSnap?.id
			? chaosSnap
			: chaosId
				? { id: chaosId, name: `Driver ${chaosId}`, carNumber: '' }
				: null;

		return {
			user_id: row.user_id,
			display_name: row.display_name,
			created_at: row.created_at,
			updated_at: row.updated_at,
			payload,
			top10Display,
			chaosDisplay,
      driverOptions,
      optionsMode,
      optionsNote
		};
	});
	// ✅ Pull scores for this event (if results published / recomputed)
	const scoresRes = await db
		.prepare(
			`
      SELECT user_id, score_total, breakdown_json
      FROM entry_scores
      WHERE event_id = ?
    `
		)
		.bind(event.id)
		.all();

	const scoreByUserId = new Map(
		(scoresRes?.results ?? []).map((r) => {
			let breakdown = null;
			try {
				breakdown = r.breakdown_json ? JSON.parse(r.breakdown_json) : null;
			} catch {
				breakdown = null;
			}
			return [r.user_id, { score_total: r.score_total ?? 0, breakdown }];
		})
	);

	// Attach score info to each entry
	const entriesWithScores = entries.map((e) => {
		const score = scoreByUserId.get(e.user_id) ?? null;
		return { ...e, score };
	});

	return { event, results, entries: entriesWithScores };
};

export const actions = {
	publish: async ({ locals, platform, params, request }) => {
		if (!locals.user) throw redirect(302, '/login');
		// if (!locals.user.is_admin) throw redirect(302, "/");

		const db = platform.env.DB;
		const event = await getEventBySlug(db, params.slug);
		if (!event) return fail(404, { ok: false, error: 'Event not found' });

		const form = await request.formData();

		const top10 = [];
		for (let i = 1; i <= 10; i++) {
			const v = (form.get(`pos${i}`) || '').toString().trim();
			if (!v) return fail(400, { ok: false, error: `Missing position ${i}` });
			top10.push(v);
		}

		const uniq = new Set(top10);
      if (uniq.size !== 10) return fail(400, { ok: false, error: "Top 10 must be unique." });

      // ✅ Chaos is per-user, not part of official results
      const payload = { officialTop10Ids: top10 };


		await upsertResultsForEvent(db, event.id, payload);
		const recompute = await recomputeScoresForEvent(db, event);

		if (!recompute.ok) return fail(400, { ok: false, error: recompute.error });

		return { ok: true, count: recompute.count };
	}
};
