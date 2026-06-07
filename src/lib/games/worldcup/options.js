// src/lib/games/worldcup/options.js
import { WORLD_CUP_ROUNDS, WORLD_CUP_ROUND_LABELS, WORLD_CUP_POINTS } from '$lib/scoring/worldCup.js';
import { getWorldCupTeamOptions } from '$lib/server/providers/world_cup.js';

export async function getOptions({ db, event, fetchImpl }) {
  const out = await getWorldCupTeamOptions({ db, event, fetchImpl });

  return {
    provider: out.provider,
    cacheKey: out.cacheKey,
    options: {
      teams: out.options || [],
      rounds: WORLD_CUP_ROUNDS,
      roundLabels: WORLD_CUP_ROUND_LABELS,
      pointsByRound: WORLD_CUP_POINTS
    },
    mode: out.mode,
    note: out.note || 'World Cup team list. One pick per round. No re-use. Lose once and you’re eliminated.'
  };
}
