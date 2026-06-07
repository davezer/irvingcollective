// src/lib/server/providers/world_cup.js
import { env } from '$env/dynamic/private';
import { getOptionsCache, setOptionsCache } from '$lib/server/db/optionsCache.js';

const PROVIDER = 'api-football';
const SEASON = 2026;
const LEAGUE_ID = 1; // API-Football World Cup league id
const CACHE_KEY = `worldcup:teams:api-football:${SEASON}:v1`;
const MAX_AGE_SECONDS = 60 * 60 * 6; // 6 hours; team list is stable, but this lets logos/names refresh

const MANUAL_CACHE_KEY = `worldcup:teams:manual:${SEASON}:v2`;

const MANUAL_WORLD_CUP_TEAMS = [
  // Group A
  { id: 'mex', code: 'MEX', name: 'Mexico', group: 'A' },
  { id: 'rsa', code: 'RSA', name: 'South Africa', group: 'A' },
  { id: 'kor', code: 'KOR', name: 'South Korea', group: 'A' },
  { id: 'cze', code: 'CZE', name: 'Czech Republic', group: 'A' },

  // Group B
  { id: 'can', code: 'CAN', name: 'Canada', group: 'B' },
  { id: 'bih', code: 'BIH', name: 'Bosnia and Herzegovina', group: 'B' },
  { id: 'qat', code: 'QAT', name: 'Qatar', group: 'B' },
  { id: 'sui', code: 'SUI', name: 'Switzerland', group: 'B' },

  // Group C
  { id: 'bra', code: 'BRA', name: 'Brazil', group: 'C' },
  { id: 'mar', code: 'MAR', name: 'Morocco', group: 'C' },
  { id: 'hai', code: 'HAI', name: 'Haiti', group: 'C' },
  { id: 'sco', code: 'SCO', name: 'Scotland', group: 'C' },

  // Group D
  { id: 'usa', code: 'USA', name: 'United States', group: 'D' },
  { id: 'par', code: 'PAR', name: 'Paraguay', group: 'D' },
  { id: 'aus', code: 'AUS', name: 'Australia', group: 'D' },
  { id: 'tur', code: 'TUR', name: 'Turkey', group: 'D' },

  // Group E
  { id: 'ger', code: 'GER', name: 'Germany', group: 'E' },
  { id: 'cuw', code: 'CUW', name: 'Curaçao', group: 'E' },
  { id: 'civ', code: 'CIV', name: 'Ivory Coast', group: 'E' },
  { id: 'ecu', code: 'ECU', name: 'Ecuador', group: 'E' },

  // Group F
  { id: 'ned', code: 'NED', name: 'Netherlands', group: 'F' },
  { id: 'jpn', code: 'JPN', name: 'Japan', group: 'F' },
  { id: 'swe', code: 'SWE', name: 'Sweden', group: 'F' },
  { id: 'tun', code: 'TUN', name: 'Tunisia', group: 'F' },

  // Group G
  { id: 'bel', code: 'BEL', name: 'Belgium', group: 'G' },
  { id: 'egy', code: 'EGY', name: 'Egypt', group: 'G' },
  { id: 'irn', code: 'IRN', name: 'Iran', group: 'G' },
  { id: 'nzl', code: 'NZL', name: 'New Zealand', group: 'G' },

  // Group H
  { id: 'esp', code: 'ESP', name: 'Spain', group: 'H' },
  { id: 'cpv', code: 'CPV', name: 'Cape Verde', group: 'H' },
  { id: 'ksa', code: 'KSA', name: 'Saudi Arabia', group: 'H' },
  { id: 'uru', code: 'URU', name: 'Uruguay', group: 'H' },

  // Group I
  { id: 'fra', code: 'FRA', name: 'France', group: 'I' },
  { id: 'sen', code: 'SEN', name: 'Senegal', group: 'I' },
  { id: 'irq', code: 'IRQ', name: 'Iraq', group: 'I' },
  { id: 'nor', code: 'NOR', name: 'Norway', group: 'I' },

  // Group J
  { id: 'arg', code: 'ARG', name: 'Argentina', group: 'J' },
  { id: 'alg', code: 'ALG', name: 'Algeria', group: 'J' },
  { id: 'aut', code: 'AUT', name: 'Austria', group: 'J' },
  { id: 'jor', code: 'JOR', name: 'Jordan', group: 'J' },

  // Group K
  { id: 'por', code: 'POR', name: 'Portugal', group: 'K' },
  { id: 'cod', code: 'COD', name: 'DR Congo', group: 'K' },
  { id: 'uzb', code: 'UZB', name: 'Uzbekistan', group: 'K' },
  { id: 'col', code: 'COL', name: 'Colombia', group: 'K' },

  // Group L
  { id: 'eng', code: 'ENG', name: 'England', group: 'L' },
  { id: 'cro', code: 'CRO', name: 'Croatia', group: 'L' },
  { id: 'gha', code: 'GHA', name: 'Ghana', group: 'L' },
  { id: 'pan', code: 'PAN', name: 'Panama', group: 'L' }
];

const STABLE_ID_BY_NAME = {
  'united states': 'usa',
  usa: 'usa',
  'south korea': 'kor',
  'korea republic': 'kor',
  'czech republic': 'cze',
  czechia: 'cze',
  curacao: 'cuw',
  curaçao: 'cuw',
  'ivory coast': 'civ',
  "cote d ivoire": 'civ',
  "côte d ivoire": 'civ',
  'saudi arabia': 'ksa',
  'new zealand': 'nzl',
  'cape verde': 'cpv',
  'dr congo': 'cod',
  'congo dr': 'cod',
  'democratic republic of the congo': 'cod',
  'bosnia and herzegovina': 'bih'
};

function asStr(v) {
  return v == null ? '' : String(v).trim();
}

function normalizeKey(v) {
  return asStr(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(v) {
  return normalizeKey(v).replace(/\s+/g, '-');
}

function stableTeamId({ name, code }) {
  const key = normalizeKey(name);
  if (STABLE_ID_BY_NAME[key]) return STABLE_ID_BY_NAME[key];

  const codeStr = asStr(code).toLowerCase();
  if (codeStr) return codeStr;

  return slug(name);
}

function normalizeApiFootballTeams(rows) {
  const out = [];
  const seen = new Set();

  for (const row of rows || []) {
    const team = row?.team || row;
    const name = asStr(team?.name);
    if (!name) continue;

    const code = asStr(team?.code).toUpperCase() || null;
    const id = stableTeamId({ name, code });
    if (!id || seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      name,
      code,
      country: asStr(team?.country) || name,
      logo: asStr(team?.logo) || null,
      group: null,
      providerTeamId: team?.id != null ? String(team.id) : null
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchApiFootballTeams({ fetchImpl, apiKey }) {
  const url = `https://v3.football.api-sports.io/teams?league=${LEAGUE_ID}&season=${SEASON}`;

  const res = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      'x-apisports-key': apiKey
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API-Football teams failed (${res.status}): ${text.slice(0, 160)}`);
  }

  const data = await res.json();
  return normalizeApiFootballTeams(data?.response || []);
}

function manualReturn(note = '') {
  return {
    provider: 'manual',
    cacheKey: MANUAL_CACHE_KEY,
    options: MANUAL_WORLD_CUP_TEAMS,
    mode: 'manual',
    note: note || `Manual ${SEASON} World Cup team list fallback.`
  };
}

export async function getWorldCupTeamOptions({ db, event, fetchImpl = fetch }) {
  const apiKey =
    asStr(env.API_FOOTBALL_KEY) ||
    asStr(env.APISPORTS_KEY) ||
    asStr(env.API_SPORTS_KEY);

  if (!apiKey) {
    return manualReturn('No API_FOOTBALL_KEY configured. Using the manual 48-team World Cup list.');
  }

  const cached = await getOptionsCache({
    db,
    eventId: event.id,
    provider: PROVIDER,
    cacheKey: CACHE_KEY,
    maxAgeSeconds: MAX_AGE_SECONDS
  });

  if (Array.isArray(cached) && cached.length >= 48) {
    return {
      provider: PROVIDER,
      cacheKey: CACHE_KEY,
      options: cached,
      mode: 'cache',
      note: `Loaded ${cached.length} World Cup teams from cache.`
    };
  }

  try {
    const options = await fetchApiFootballTeams({ fetchImpl, apiKey });

    // Guardrail: do not cache or serve an obviously partial tournament field.
    if (options.length < 48) {
      return manualReturn(`API-Football only returned ${options.length} teams; using manual fallback instead.`);
    }

    const fetchedAt = Math.floor(Date.now() / 1000);
    await setOptionsCache({
      db,
      eventId: event.id,
      provider: PROVIDER,
      cacheKey: CACHE_KEY,
      payload: options,
      fetchedAt
    });

    return {
      provider: PROVIDER,
      cacheKey: CACHE_KEY,
      options,
      mode: 'live:api-football',
      note: `Loaded ${options.length} World Cup teams from API-Football.`
    };
  } catch (e) {
    return manualReturn(`${e?.message || 'API-Football request failed'} Using manual fallback instead.`);
  }
}
