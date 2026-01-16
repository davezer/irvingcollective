import { json } from '@sveltejs/kit';
import { getOptionsCache, setOptionsCache } from '$lib/server/db/optionsCache.js';
import { fetchCupDrivers } from '$lib/server/providers/nascar.js';
import { findCupRaceId, fetchRaceEntryList } from '$lib/server/providers/nascarRaceEntry.js';
import { fetchPrelimEntryList } from '$lib/server/providers/nascarPrelimEntry.js';


const MAX_AGE_SECONDS = 60 * 60 * 6; // 6 hours

export async function GET({ params, platform }) {
  const db = platform?.env?.DB;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const slug = params.slug;

  const event = await db
    .prepare(`SELECT id, slug, type, start_at, name FROM events WHERE slug = ? LIMIT 1`)
    .bind(slug)
    .first();

  if (!event) return json({ error: 'Event not found' }, { status: 404 });

  if (event.type !== 'daytona') {
    return json({ provider: null, cacheKey: null, options: [] });
  }

  const seasonYear = new Date(Number(event.start_at) * 1000).getUTCFullYear() || 2026;

  // 1) Try cached entrants first
  const provider = 'nascar';
  const cacheKey = `daytona-entrants:${seasonYear}:v1`;

  const cached = await getOptionsCache({
    db,
    eventId: event.id,
    provider,
    cacheKey,
    maxAgeSeconds: MAX_AGE_SECONDS
  });

  if (cached && Array.isArray(cached) && cached.length) {
    return json({ provider, cacheKey, options: cached, mode: 'entrants' });
  }

  // 2) Find race_id for Daytona 500 (Cup series_1)
  let raceId = null;
  try {
    raceId = await findCupRaceId({
      fetchImpl: fetch,
      seasonYear,
      raceName: 'DAYTONA 500'
    });
  } catch (e) {
    // If race lookup fails, fallback
    const fallback = await fetchCupDrivers(fetch);
    return json({
      provider,
      cacheKey,
      options: fallback,
      mode: 'fallback:drivers',
      note: `Race ID lookup failed: ${e?.message || e}`
    });
  }

  const prelim = await fetchPrelimEntryList({ fetchImpl: fetch, raceId });

if (prelim.ok && prelim.options.length) {
  const fetchedAt = Math.floor(Date.now() / 1000);
  await setOptionsCache({
    db,
    eventId: event.id,
    provider,
    cacheKey,
    payload: prelim.options,
    fetchedAt
  });

  return json({
    provider,
    cacheKey,
    options: prelim.options,
    mode: 'entrants:prelim',
    raceId
  });
}


  // 3) Fetch entrants for that race
  const entry = await fetchRaceEntryList({
    fetchImpl: fetch,
    seasonYear,
    seriesId: 1,
    raceId
  });

  if (entry.options && entry.options.length) {
    const fetchedAt = Math.floor(Date.now() / 1000);
    await setOptionsCache({
      db,
      eventId: event.id,
      provider,
      cacheKey,
      payload: entry.options,
      fetchedAt
    });

    return json({
      provider,
      cacheKey,
      options: entry.options,
      mode: 'entrants',
      raceId,
      sourceUrl: entry.sourceUrl
    });
  }

  // 4) If entrants not available yet (common before race week), fallback to drivers list
  const fallback = await fetchCupDrivers(fetch);
  return json({
    provider,
    cacheKey,
    options: fallback,
    mode: 'fallback:drivers',
    raceId,
    note: entry.error || 'Entrants feed not available yet'
  });
}
