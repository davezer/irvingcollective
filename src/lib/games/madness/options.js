// src/lib/games/madness/options.js
import { getMarchTeamOptions } from '$lib/server/providers/march_madness.js';

export async function getOptions({ db, event, fetchImpl }) {
  const out = await getMarchTeamOptions({
    db,
    eventId: event.id,
    fetchImpl
  });

  return {
    provider: out.provider || 'espn',
    cacheKey: out.cacheKey || 'march-teams:mens:v1',
    options: out.options || [],
    mode: out.mode || 'fallback:espn',
    note: out.note || ''
  };
}
