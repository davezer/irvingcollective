// src/lib/games/adminResults.server.js
import { fail } from '@sveltejs/kit';
import { getResultsForEvent, upsertResultsForEvent } from '$lib/server/db/results.js';
import { recomputeScoresForEvent } from '$lib/server/scoring/recompute.js';

import * as daytona from '$lib/games/daytona/adminResults.server.js';
import * as madness from '$lib/games/madness/adminResults.server.js';
import * as masters from '$lib/games/masters/adminResults.server.js';
import * as derby from '$lib/games/kentucky-derby/adminResults.server.js';
import * as worldcup from '$lib/games/worldcup/adminResults.server.js';

const HANDLERS = {
  daytona,
  madness,
  masters,
  derby,
  worldcup
};

function safeJsonParse(str) {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

export async function getEventBySlug(db, slug) {
  return db
    .prepare(`SELECT * FROM events WHERE slug = ? LIMIT 1`)
    .bind(slug)
    .first();
}

/**
 * Shared: load entries + scores for any event.
 */
export async function loadEntriesWithScores({ db, eventId }) {
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
    .bind(eventId)
    .all();

  const entries = (entriesRes?.results || []).map((r) => ({
    user_id: r.user_id,
    display_name: r.display_name,
    submitted_at: r.submitted_at,
    updated_at: r.updated_at,
    payload: safeJsonParse(r.payload_json) || {}
  }));

  const scoresRes = await db
    .prepare(
      `
      SELECT user_id, score_total, breakdown_json
      FROM entry_scores
      WHERE event_id = ?
      `
    )
    .bind(eventId)
    .all();

  const scoreByUserId = new Map(
    (scoresRes?.results || []).map((r) => {
      let breakdown = null;
      try {
        breakdown = r.breakdown_json ? JSON.parse(r.breakdown_json) : null;
      } catch {
        breakdown = null;
      }
      return [r.user_id, { score_total: r.score_total ?? 0, breakdown }];
    })
  );

  return entries.map((e) => ({ ...e, score: scoreByUserId.get(e.user_id) ?? null }));
}

export async function mergeResultsPayload({ db, eventId, patch, now, setPublishedAt = false, slug = null }) {
  const current = await getResultsForEvent(db, eventId);
  const base = current?.payload && typeof current.payload === 'object' ? current.payload : {};
  const next = { ...base, ...(patch && typeof patch === 'object' ? patch : {}) };

  const nowSec = Number.isFinite(now) ? Number(now) : Math.floor(Date.now() / 1000);

  await upsertResultsForEvent(db, eventId, next, {
    nowSec,
    setPublishedAt,
    slug
  });

  return next;
}

export async function loadAdminResults({ db, event, fetchImpl }) {
  const handler = HANDLERS[event.type];
  if (!handler?.load) {
    const results = await getResultsForEvent(db, event.id);
    const entries = await loadEntriesWithScores({ db, eventId: event.id });
    return { event, results, entries };
  }

  return handler.load({ db, event, fetchImpl });
}

export async function actionPublish({ db, event, request, fetchImpl }) {
  const handler = HANDLERS[event.type];
  if (!handler?.publish) return fail(400, { ok: false, error: 'Unsupported event type for publishing.' });

  const form = await request.formData();
  const out = await handler.publish({ db, event, form, fetchImpl });
  if (!out?.ok) return out;

  const recompute = await recomputeScoresForEvent(db, event);
  if (!recompute.ok) return fail(400, { ok: false, error: recompute.error });

  return { ok: true, count: recompute.count };
}

export async function actionSyncSeeds({ db, event, request, fetchImpl }) {
  const handler = HANDLERS[event.type];
  if (!handler?.syncSeeds) return fail(400, { ok: false, error: 'Seed sync not supported for this event.' });

  const form = await request.formData();
  return handler.syncSeeds({ db, event, form, fetchImpl });
}
export async function actionAdvanceRound({ db, event, request, fetchImpl }) {
  const handler = HANDLERS[event.type];
  if (!handler?.advanceRound) return fail(400, { ok: false, error: 'Advance not supported for this event type.' });

  const form = await request.formData();
  // form unused but keeps signature consistent
  return handler.advanceRound({ db, event, form, fetchImpl });
}

export async function actionResetEntries({ db, event }) {
  const eventId = event.id;

  // 1. Delete scores FIRST (FK safety)
  await db
    .prepare(`DELETE FROM entry_scores WHERE event_id = ?`)
    .bind(eventId)
    .run();

  // 2. Delete entries
  await db
    .prepare(`DELETE FROM entries WHERE event_id = ?`)
    .bind(eventId)
    .run();

  return { ok: true };
}

export async function actionUnpublish({ db, event }) {
  if (!event?.id) {
    return { ok: false, error: 'Invalid event' };
  }

  // 1. Mark results as unpublished
  await db
    .prepare(
      `
      UPDATE events
      SET results_published_at = NULL
      WHERE id = ?
      `
    )
    .bind(event.id)
    .run();

  // 2. Remove all computed scores for this event
  await db
    .prepare(
      `
      DELETE FROM entry_scores
      WHERE event_id = ?
      `
    )
    .bind(event.id)
    .run();

  return { ok: true };
}



