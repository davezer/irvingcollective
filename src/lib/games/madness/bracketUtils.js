// src/lib/games/madness/bracketUtils.js

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Stable team id: "mm26:<slug>"
 * Example: "mm26:miami-fl"
 */
export function makeTeamId(name) {
  return `mm26:${slugify(name)}`;
}

/**
 * Returns:
 *  - options: [{ id, name, region, seed }]
 *  - seeds:   { [id]: { seed, region } }
 */
export function buildFromBracketJson(bracketJson) {
  const srcRegions = bracketJson?.regions || {};

  const outOptions = [];
  const outSeeds = {};

  for (const [regionName, slots] of Object.entries(srcRegions)) {
    for (const slot of slots || []) {
      const seed = Number(slot?.seed);
      if (!Number.isFinite(seed) || seed <= 0) continue;

      // Normal team slot
      if (slot?.team) {
        const name = String(slot.team).trim();
        if (!name) continue;

        const id = makeTeamId(name);
        outOptions.push({ id, name, region: regionName, seed });
        outSeeds[id] = { seed, region: regionName };
        continue;
      }

      // Play-in slot: create an entry for each team
      if (Array.isArray(slot?.play_in)) {
        for (const t of slot.play_in) {
          const name = String(t).trim();
          if (!name) continue;

          const id = makeTeamId(name);
          outOptions.push({ id, name, region: regionName, seed });
          outSeeds[id] = { seed, region: regionName };
        }
      }
    }
  }

  // de-dupe by id
  const seen = new Set();
  const options = outOptions.filter((o) => {
    if (!o.id || !o.name) return false;
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  return { options, seeds: outSeeds };
}