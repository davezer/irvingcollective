// src/lib/server/scoring/daytona.js

// v1 rules (easy to tweak later):
// - exact position match: 10 pts
// - in official top 10 but wrong position: 5 pts
// - chaos car match: 10 pts
export function scoreDaytonaEntry(entryPayload, resultsPayload) {
  const picks = Array.isArray(entryPayload?.top10Ids) ? entryPayload.top10Ids : [];
  const chaosPick = entryPayload?.chaosCarId ?? null;

  const officialTop10 = Array.isArray(resultsPayload?.officialTop10Ids)
    ? resultsPayload.officialTop10Ids
    : [];
  const officialChaos = resultsPayload?.chaosCarId ?? null;

  const breakdown = {
    picks: [],
    chaos: { picked: chaosPick, official: officialChaos, points: 0 },
    totals: { exact: 0, inTop10: 0, chaos: 0, total: 0 }
  };

  const officialSet = new Set(officialTop10);

  let exactPoints = 0;
  let inTop10Points = 0;

  for (let i = 0; i < picks.length; i++) {
    const id = picks[i];
    const officialAtPos = officialTop10[i] ?? null;

    let points = 0;
    let reason = "";

    if (id && officialAtPos && id === officialAtPos) {
      points = 10;
      reason = "exact";
      exactPoints += points;
    } else if (id && officialSet.has(id)) {
      points = 5;
      reason = "in_top10";
      inTop10Points += points;
    } else {
      points = 0;
      reason = "miss";
    }

    breakdown.picks.push({
      position: i + 1,
      picked: id,
      officialAtPosition: officialAtPos,
      points,
      reason
    });
  }

  let chaosPoints = 0;
  if (chaosPick && officialChaos && chaosPick === officialChaos) chaosPoints = 10;

  breakdown.chaos.points = chaosPoints;

  const total = exactPoints + inTop10Points + chaosPoints;

  breakdown.totals = {
    exact: exactPoints,
    inTop10: inTop10Points,
    chaos: chaosPoints,
    total
  };

  return { total, breakdown };
}
