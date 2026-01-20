// src/lib/games/madness/seeds.js

export async function fetchSeedsFromProvider() {
  // TODO: Selection Sunday - swap in real provider.
  return {
    seeds: {},
    source: 'stub',
    note: 'Seed sync not wired to live API yet.'
  };
}

// ✅ MUST be exported with this exact name
export function parseSeedsJson(raw) {
  try {
    const parsed = JSON.parse(raw);

    // allow either:
    // 1) { "52": { seed: 1, region: "South" }, ... }
    // 2) { seeds: { "52": {...}, ... } }
    const seedsIn =
      parsed?.seeds && typeof parsed.seeds === 'object' ? parsed.seeds : parsed;

    const out = {};
    for (const [teamId, v] of Object.entries(seedsIn || {})) {
      const seedNum = Number(v?.seed ?? v);
      if (!Number.isFinite(seedNum) || seedNum <= 0) continue;

      out[String(teamId)] = {
        seed: seedNum,
        region: v?.region != null ? String(v.region) : null
      };
    }
    return out;
  } catch {
    return null;
  }
}
