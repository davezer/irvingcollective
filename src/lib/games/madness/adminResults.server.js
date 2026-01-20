// src/lib/games/madness/adminResults.server.js
import { fail } from '@sveltejs/kit';
import { getResultsForEvent } from '$lib/server/db/results.js';
import { loadEntriesWithScores } from '$lib/games/adminResults.server.js';
import { mergeResultsPayload } from '$lib/games/adminResults.server.js';
import { fetchSeedsFromProvider, parseSeedsJson } from '$lib/games/madness/seeds.js';

function normalizeTeamSnap(x) {
  return {
    id: x?.id != null ? String(x.id) : '',
    name: x?.name ? String(x.name) : null,
    abbrev: x?.abbrev ? String(x.abbrev) : null,
    logo: x?.logo ? String(x.logo) : null
  };
}

export async function load({ db, event }) {
  const results = await getResultsForEvent(db, event.id);
  const entries = await loadEntriesWithScores({ db, eventId: event.id });
  
  // Derive pickedTeams unique across entries
  const teamMap = new Map();

  for (const e of entries) {
    const ids = (e?.payload?.teamIds || []).map(String);
    const snaps = Array.isArray(e?.payload?.teamSnapshots) ? e.payload.teamSnapshots : [];

    const snapById = new Map(
      snaps
        .map(normalizeTeamSnap)
        .filter((s) => s.id)
        .map((s) => [s.id, s])
    );

    for (const id of ids) {
      if (!id) continue;
      const snap = snapById.get(id) || { id, name: null, abbrev: null, logo: null };
      if (!teamMap.has(id)) teamMap.set(id, snap);
    }
  }

  const pickedTeams = [...teamMap.values()].sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id)
  );

  return {
    event,
    results,
    entries,
    pickedTeams
  };
}

/**
 * Publish Madness “official results” for scoring:
 * - seedsByTeamId: { [teamId]: number }
 * - winsByTeamId: { [teamId]: {r1..r6 boolean} }
 *
 * IMPORTANT: This merges into existing results payload so it doesn't clobber synced seeds.
 */
export async function publish({ db, event, form }) {
  let ids = [];
  try {
    ids = JSON.parse(String(form.get('pickedTeamIds') || '[]')).map(String);
  } catch {
    return fail(400, { ok: false, error: 'Invalid pickedTeamIds payload.' });
  }

  ids = ids.filter(Boolean);
  const idUniq = new Set(ids);
  if (idUniq.size !== ids.length) {
    return fail(400, { ok: false, error: 'pickedTeamIds must be unique.' });
  }

  const seedsByTeamId = {};
  const winsByTeamId = {};

  for (const id of ids) {
    const seedRaw = String(form.get(`seed_${id}`) || '').trim();
    const seed = Number(seedRaw);

    if (!Number.isFinite(seed) || seed < 1 || seed > 16) {
      return fail(400, {
        ok: false,
        error: `Missing/invalid seed for team ${id} (must be 1–16).`
      });
    }

    seedsByTeamId[id] = seed;

    winsByTeamId[id] = {
      r1: form.get(`win_${id}_r1`) === 'on',
      r2: form.get(`win_${id}_r2`) === 'on',
      r3: form.get(`win_${id}_r3`) === 'on',
      r4: form.get(`win_${id}_r4`) === 'on',
      r5: form.get(`win_${id}_r5`) === 'on',
      r6: form.get(`win_${id}_r6`) === 'on'
    };
  }

  const now = Math.floor(Date.now() / 1000);

  await mergeResultsPayload({
    db,
    eventId: event.id,
    now,
    patch: {
      seedsByTeamId,
      winsByTeamId,
      publishedAt: now
    }
  });

  return { ok: true };
}

/**
 * Seed sync action:
 * - writes payload.seeds (auto-synced)
 * - DOES NOT clobber seedsByTeamId/winsByTeamId
 */
export async function syncSeeds({ db, event, form, fetchImpl }) {
  const seedsJson = (form.get('seedsJson') || '').toString().trim();

  let seeds = null;
  let source = 'provider';
  let note = '';

  if (seedsJson) {
    seeds = parseSeedsJson(seedsJson);
    source = 'manual';
    if (!seeds) return fail(400, { ok: false, error: 'Invalid seeds JSON.' });
  } else {
    const fetched = await fetchSeedsFromProvider({ fetchImpl, event });
    seeds = fetched.seeds || {};
    source = fetched.source || 'provider';
    note = fetched.note || '';
  }

  const now = Math.floor(Date.now() / 1000);

  await mergeResultsPayload({
    db,
    eventId: event.id,
    now,
    patch: {
      seeds,
      syncedAt: now,
      source,
      syncNote: note || null
    }
  });

  return { ok: true, seedCount: Object.keys(seeds).length, source };
}
