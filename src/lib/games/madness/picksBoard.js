import { ROUND_MULT } from '$lib/scoring/march_madness';

export const ROUNDS = [
  { key: 'r1', label: 'R1', mult: ROUND_MULT.r1, long: 'Round of 64', stageReached: 'Round of 32' },
  { key: 'r2', label: 'R2', mult: ROUND_MULT.r2, long: 'Round of 32', stageReached: 'Sweet 16' },
  { key: 'r3', label: 'R3', mult: ROUND_MULT.r3, long: 'Sweet 16', stageReached: 'Elite 8' },
  { key: 'r4', label: 'R4', mult: ROUND_MULT.r4, long: 'Elite 8', stageReached: 'Final Four' },
  { key: 'r5', label: 'R5', mult: ROUND_MULT.r5, long: 'Final Four', stageReached: 'Championship' },
  { key: 'r6', label: 'R6', mult: ROUND_MULT.r6, long: 'Championship', stageReached: 'Champion' }
];

export function teamIdOf(t) {
  return String(t?.id ?? t?.teamId ?? '');
}

export function createPicksBoardContext({ entries = [], resultsPayload = null }) {
  const winsByTeamId = resultsPayload?.winsByTeamId || {};
  const seedsByTeamId = resultsPayload?.seedsByTeamId || {};

  function seedOf(team) {
    const tid = teamIdOf(team);
    const fromResults = Number(seedsByTeamId?.[tid] ?? null);
    if (Number.isFinite(fromResults) && fromResults > 0) return fromResults;

    const fromSnap = Number(team?.seed ?? null);
    if (Number.isFinite(fromSnap) && fromSnap > 0) return fromSnap;

    return null;
  }

  function winsObj(team) {
    return winsByTeamId?.[teamIdOf(team)] || {};
  }

  function winsCount(team) {
    const wins = winsObj(team);
    let c = 0;
    for (const r of ROUNDS) {
      if (wins?.[r.key]) c += 1;
    }
    return c;
  }

  function pointsSoFar(team) {
    const seed = seedOf(team);
    if (!seed) return 0;

    const wins = winsObj(team);
    let pts = 0;
    for (const r of ROUNDS) {
      if (wins?.[r.key]) pts += seed * r.mult;
    }
    return pts;
  }

  function maxCompletedRoundIndex() {
    let idx = -1;
    for (let i = 0; i < ROUNDS.length; i += 1) {
      const r = ROUNDS[i];
      const anyWin = Object.values(winsByTeamId || {}).some((w) => Boolean(w?.[r.key]));
      if (anyWin) idx = i;
    }
    return idx;
  }

  const completedRoundIndex = maxCompletedRoundIndex();
  const completedRoundLabel = completedRoundIndex >= 0 ? ROUNDS[completedRoundIndex].long : 'No rounds complete yet';

  function teamStatus(team) {
    const wc = winsCount(team);

    if (completedRoundIndex < 0) return 'alive';
    if (wc === 6) return 'champion';
    if (wc < completedRoundIndex + 1) return 'eliminated';
    return 'alive';
  }

  function stageLabel(team) {
    const wc = winsCount(team);
    if (wc >= 6) return 'Champion';
    if (wc === 5) return 'Title Game';
    if (wc === 4) return 'Final Four';
    if (wc === 3) return 'Elite 8';
    if (wc === 2) return 'Sweet 16';
    if (wc === 1) return 'Round of 32';
    if (completedRoundIndex < 0) return 'Awaiting tip off';
    if (teamStatus(team) === 'eliminated') return 'Out';
    return 'Round of 64';
  }

  function averageSeed(teams) {
    const vals = (teams || []).map(seedOf).filter((n) => Number.isFinite(n));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function aliveCount(teams) {
    if (completedRoundIndex < 0) return (teams || []).length;
    return (teams || []).filter((t) => teamStatus(t) === 'alive' || teamStatus(t) === 'champion').length;
  }

  function eliminatedCount(teams) {
    return (teams || []).filter((t) => teamStatus(t) === 'eliminated').length;
  }

  function totalTeamPoints(teams) {
    return (teams || []).reduce((sum, t) => sum + pointsSoFar(t), 0);
  }

  function deepestRun(teams) {
    return Math.max(0, ...(teams || []).map(winsCount));
  }

  const teamPickMap = new Map();

  for (const entry of entries) {
    for (const team of entry?.selectedTeams || []) {
      const tid = teamIdOf(team);
      if (!tid) continue;

      if (!teamPickMap.has(tid)) {
        teamPickMap.set(tid, {
          id: tid,
          team,
          count: 0,
          ownerIds: [],
          owners: []
        });
      }

      const row = teamPickMap.get(tid);
      row.count += 1;
      row.ownerIds.push(entry.user_id);
      row.owners.push(entry.display_name);
    }
  }

  function futurePointsForTeam(team) {
    const seed = seedOf(team);
    if (!seed) {
      return {
        current: 0,
        future: 0,
        maxTotal: 0,
        alive: false,
        remainingRounds: 0,
        titleUpside: 0,
        finalFourUpside: 0
      };
    }

    const current = pointsSoFar(team);
    const status = teamStatus(team);
    const wc = winsCount(team);
    const alive = status === 'alive' || status === 'champion' || completedRoundIndex < 0;
    const remainingRounds = alive ? Math.max(0, ROUNDS.length - wc) : 0;
    const future = alive
      ? ROUNDS.slice(wc).reduce((sum, r) => sum + seed * r.mult, 0)
      : 0;
    const maxTotal = current + future;

    const finalFourUpside = alive
      ? ROUNDS.slice(Math.max(wc, 4)).reduce((sum, r) => sum + seed * r.mult, 0)
      : 0;
    const titleUpside = alive
      ? ROUNDS.slice(Math.max(wc, 5)).reduce((sum, r) => sum + seed * r.mult, 0)
      : 0;

    return {
      current,
      future,
      maxTotal,
      alive,
      remainingRounds,
      titleUpside,
      finalFourUpside
    };
  }

  const teamStats = [...teamPickMap.values()]
    .map((row) => {
      const seed = seedOf(row.team);
      const wins = winsCount(row.team);
      const status = teamStatus(row.team);
      const future = futurePointsForTeam(row.team);

      return {
        ...row,
        seed,
        wins,
        status,
        aliveOwners: row.owners.length,
        points: pointsSoFar(row.team),
        stage: stageLabel(row.team),
        futurePoints: future.future,
        maxTotal: future.maxTotal,
        titleUpside: future.titleUpside,
        finalFourUpside: future.finalFourUpside,
        isLoneWolf: row.count === 1
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if ((a.seed ?? 99) !== (b.seed ?? 99)) return (a.seed ?? 99) - (b.seed ?? 99);
      return String(a.team?.name || '').localeCompare(String(b.team?.name || ''));
    });

  const teamStatsById = new Map(teamStats.map((row) => [row.id, row]));

  function buildFuturePoints(entry) {
    const teams = entry?.selectedTeams || [];
    const items = teams.map((team) => {
      const calc = futurePointsForTeam(team);
      return {
        id: teamIdOf(team),
        team,
        seed: seedOf(team),
        status: teamStatus(team),
        stage: stageLabel(team),
        wins: winsCount(team),
        current: calc.current,
        future: calc.future,
        maxTotal: calc.maxTotal,
        alive: calc.alive,
        remainingRounds: calc.remainingRounds,
        titleUpside: calc.titleUpside,
        finalFourUpside: calc.finalFourUpside
      };
    });

    const maxLeft = items.reduce((sum, item) => sum + item.future, 0);
    const aliveValue = items.filter((item) => item.alive).reduce((sum, item) => sum + item.future, 0);
    const deadValueLost = items.filter((item) => !item.alive).reduce((sum, item) => sum + item.future, 0);
    const titleEquity = items.reduce((sum, item) => sum + item.titleUpside, 0);
    const finalFourEquity = items.reduce((sum, item) => sum + item.finalFourUpside, 0);
    const aliveTeams = items.filter((item) => item.alive).length;

    return {
      items,
      maxLeft,
      aliveValue,
      deadValueLost,
      titleEquity,
      finalFourEquity,
      aliveTeams
    };
  }

  function buildFatePath(entry) {
    const teams = entry?.selectedTeams || [];
    const futureItems = teams.map((team) => {
      const row = teamStatsById.get(teamIdOf(team));
      return {
        team,
        row,
        future: row?.futurePoints ?? 0,
        seed: row?.seed ?? seedOf(team),
        status: row?.status ?? teamStatus(team),
        owners: row?.count ?? 0,
        stage: row?.stage ?? stageLabel(team)
      };
    });

    const aliveItems = futureItems
      .filter((item) => item.status === 'alive' || item.status === 'champion' || completedRoundIndex < 0)
      .sort((a, b) => {
        if (b.future !== a.future) return b.future - a.future;
        if ((b.seed ?? 0) !== (a.seed ?? 0)) return (b.seed ?? 0) - (a.seed ?? 0);
        return String(itemName(a.team)).localeCompare(String(itemName(b.team)));
      });

    const deadItems = futureItems
      .filter((item) => item.status === 'eliminated')
      .sort((a, b) => {
        if ((b.future ?? 0) !== (a.future ?? 0)) return (b.future ?? 0) - (a.future ?? 0);
        if ((a.seed ?? 99) !== (b.seed ?? 99)) return (a.seed ?? 99) - (b.seed ?? 99);
        return String(itemName(a.team)).localeCompare(String(itemName(b.team)));
      });

    const contrarianAlive = aliveItems
      .filter((item) => (item.owners ?? 0) <= 2)
      .sort((a, b) => {
        if (b.future !== a.future) return b.future - a.future;
        if ((b.seed ?? 0) !== (a.seed ?? 0)) return (b.seed ?? 0) - (a.seed ?? 0);
        return String(itemName(a.team)).localeCompare(String(itemName(b.team)));
      })[0] || null;

    const chalkThreat = [...teamStats]
      .filter((row) => row.count >= Math.max(2, Math.ceil(entries.length * 0.45)))
      .filter((row) => !teams.some((team) => teamIdOf(team) === row.id))
      .filter((row) => row.status === 'alive' || row.status === 'champion' || completedRoundIndex < 0)
      .sort((a, b) => {
        if (b.futurePoints !== a.futurePoints) return b.futurePoints - a.futurePoints;
        if (b.count !== a.count) return b.count - a.count;
        return String(itemName(a.team)).localeCompare(String(itemName(b.team)));
      })[0] || null;

    const needs = [];
    const danger = [];

    if (aliveItems[0]) {
      needs.push(`${itemName(aliveItems[0].team)} to keep climbing${aliveItems[0].future ? ` (${aliveItems[0].future} pts left)` : ''}`);
    }
    if (aliveItems[1]) {
      needs.push(`${itemName(aliveItems[1].team)} to survive the next wave`);
    }
    if (contrarianAlive) {
      needs.push(`${itemName(contrarianAlive.team)} to hit as a low-owned differentiator`);
    }

    if (chalkThreat) {
      danger.push(`${itemName(chalkThreat.team)} chalk run (${chalkThreat.count} owners)`);
    }
    if (deadItems[0]) {
      danger.push(`already lost ${itemName(deadItems[0].team)} upside`);
    }
    if (!aliveItems.length && completedRoundIndex >= 0) {
      danger.push('needs outside chaos because the card is effectively capped');
    }

    let summary = 'Still has live paths.';
    if (!aliveItems.length && completedRoundIndex >= 0) {
      summary = 'Needs complete bracket chaos and help from the field.';
    } else if (contrarianAlive && chalkThreat) {
      summary = `Needs ${itemName(contrarianAlive.team)} to beat the crowd while avoiding a ${itemName(chalkThreat.team)} chalk march.`;
    } else if (aliveItems[0]) {
      summary = `Path runs mostly through ${itemName(aliveItems[0].team)}.`;
    }

    return {
      summary,
      needs: needs.slice(0, 3),
      danger: danger.slice(0, 3)
    };
  }

  function buildTeamImpact(teamInput) {
    const teamId = typeof teamInput === 'string' ? teamInput : teamIdOf(teamInput);
    const row = teamStatsById.get(teamId);
    if (!row) return null;

    const affectedEntries = entries
      .filter((entry) => (entry.selectedTeams || []).some((team) => teamIdOf(team) === teamId))
      .map((entry) => {
        const future = buildFuturePoints(entry);
        const item = future.items.find((x) => x.id === teamId);
        return {
          user_id: entry.user_id,
          display_name: entry.display_name,
          scoreTotal: Number(entry?.score?.score_total ?? 0),
          swing: item?.future ?? 0,
          maxLeft: future.maxLeft,
          titleUpside: item?.titleUpside ?? 0,
          stage: item?.stage ?? row.stage,
          status: item?.status ?? row.status
        };
      })
      .sort((a, b) => {
        if (b.swing !== a.swing) return b.swing - a.swing;
        if (b.scoreTotal !== a.scoreTotal) return b.scoreTotal - a.scoreTotal;
        return String(a.display_name || '').localeCompare(String(b.display_name || ''));
      });

    const highestRoundPicked = row.wins >= 6
      ? 'Champion'
      : affectedEntries.some((e) => e.titleUpside > 0)
        ? 'Champion'
        : affectedEntries.length && row.finalFourUpside > 0
          ? 'Final Four+'
          : row.stage;

    const ownershipByRound = ROUNDS.map((round, idx) => {
      const owners = entries.filter((entry) => (entry.selectedTeams || []).some((team) => {
        if (teamIdOf(team) !== teamId) return false;
        return winsCount(team) >= idx;
      }));

      return {
        ...round,
        count: owners.length,
        label: round.stageReached
      };
    });

    const beneficiary = affectedEntries[0] || null;

    return {
      ...row,
      highestRoundPicked,
      ownershipByRound,
      affectedEntries,
      beneficiary,
      casualty: beneficiary,
      impactIfWin: beneficiary
        ? `${beneficiary.display_name} gains the most (${beneficiary.swing} pts still live).`
        : 'Nobody is directly impacted.',
      impactIfLose: beneficiary
        ? `${beneficiary.display_name} takes the biggest hit if ${itemName(row.team)} goes out now.`
        : 'A loss would mostly be cosmetic.'
    };
  }

  const enrichedEntries = entries
    .map((entry) => {
      const teams = entry?.selectedTeams || [];
      const avgSeed = averageSeed(teams);
      const alive = aliveCount(teams);
      const eliminated = eliminatedCount(teams);
      const teamPts = totalTeamPoints(teams);
      const deepest = deepestRun(teams);
      const scoreTotal = Number(entry?.score?.score_total ?? teamPts ?? 0);

      const loneWolves = teams.filter((t) => {
        const row = teamPickMap.get(teamIdOf(t));
        return row?.count === 1;
      });

      const bestPick = [...teams].sort((a, b) => {
        const aPts = pointsSoFar(a);
        const bPts = pointsSoFar(b);
        if (bPts !== aPts) return bPts - aPts;

        const aWins = winsCount(a);
        const bWins = winsCount(b);
        if (bWins !== aWins) return bWins - aWins;

        return (seedOf(b) ?? 0) - (seedOf(a) ?? 0);
      })[0] || null;

      const worstBeat = [...teams]
        .filter((t) => teamStatus(t) === 'eliminated')
        .sort((a, b) => {
          const aSeed = seedOf(a) ?? 99;
          const bSeed = seedOf(b) ?? 99;
          if (aSeed !== bSeed) return aSeed - bSeed;
          return winsCount(a) - winsCount(b);
        })[0] || null;

      const futurePoints = buildFuturePoints(entry);
      const fatePath = buildFatePath(entry);

      return {
        ...entry,
        selectedTeams: teams,
        avgSeed,
        alive,
        eliminated,
        teamPts,
        deepest,
        scoreTotal,
        loneWolves,
        bestPick,
        worstBeat,
        futurePoints,
        fatePath
      };
    })
    .sort((a, b) => {
      if (b.scoreTotal !== a.scoreTotal) return b.scoreTotal - a.scoreTotal;
      if (b.alive !== a.alive) return b.alive - a.alive;
      if ((b.avgSeed ?? 0) !== (a.avgSeed ?? 0)) return (b.avgSeed ?? 0) - (a.avgSeed ?? 0);
      return String(a.display_name || '').localeCompare(String(b.display_name || ''));
    });

  const mostPickedTeams = teamStats.slice(0, 5);

  const highestSeedPicked = [...teamStats]
    .filter((t) => Number.isFinite(t.seed))
    .sort((a, b) => {
      if (b.seed !== a.seed) return b.seed - a.seed;
      if (b.count !== a.count) return b.count - a.count;
      return String(a.team?.name || '').localeCompare(String(b.team?.name || ''));
    })[0] || null;

  const survivingLongshots = [...teamStats]
    .filter((t) => (t.status === 'alive' || t.status === 'champion') && Number.isFinite(t.seed))
    .sort((a, b) => {
      if (b.seed !== a.seed) return b.seed - a.seed;
      if (b.count !== a.count) return b.count - a.count;
      return String(a.team?.name || '').localeCompare(String(b.team?.name || ''));
    })
    .slice(0, 5);

  const graveyardTeam = [...teamStats]
    .filter((t) => t.status === 'eliminated')
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if ((a.seed ?? 99) !== (b.seed ?? 99)) return (a.seed ?? 99) - (b.seed ?? 99);
      return String(a.team?.name || '').localeCompare(String(b.team?.name || ''));
    })[0] || null;

  const ownershipByRound = ROUNDS.map((r, idx) => {
    const count = teamStats.filter((t) => t.wins >= idx + 1).length;
    return {
      ...r,
      count
    };
  });

  const boldestEntry = [...enrichedEntries]
    .filter((e) => Number.isFinite(e.avgSeed))
    .sort((a, b) => {
      if (b.avgSeed !== a.avgSeed) return b.avgSeed - a.avgSeed;
      if (b.alive !== a.alive) return b.alive - a.alive;
      return String(a.display_name || '').localeCompare(String(b.display_name || ''));
    })[0] || null;

  const chalkiestEntry = [...enrichedEntries]
    .filter((e) => Number.isFinite(e.avgSeed))
    .sort((a, b) => {
      if (a.avgSeed !== b.avgSeed) return a.avgSeed - b.avgSeed;
      if (b.scoreTotal !== a.scoreTotal) return b.scoreTotal - a.scoreTotal;
      return String(a.display_name || '').localeCompare(String(b.display_name || ''));
    })[0] || null;

  const mostAliveEntry = [...enrichedEntries]
    .sort((a, b) => {
      if (b.alive !== a.alive) return b.alive - a.alive;
      if (b.scoreTotal !== a.scoreTotal) return b.scoreTotal - a.scoreTotal;
      return String(a.display_name || '').localeCompare(String(b.display_name || ''));
    })[0] || null;

  return {
    ROUNDS,
    winsByTeamId,
    seedsByTeamId,
    completedRoundIndex,
    completedRoundLabel,
    teamPickMap,
    teamStats,
    teamStatsById,
    mostPickedTeams,
    highestSeedPicked,
    survivingLongshots,
    graveyardTeam,
    ownershipByRound,
    enrichedEntries,
    boldestEntry,
    chalkiestEntry,
    mostAliveEntry,
    seedOf,
    winsObj,
    winsCount,
    pointsSoFar,
    teamStatus,
    stageLabel,
    buildFuturePoints,
    buildFatePath,
    buildTeamImpact
  };
}

function itemName(team) {
  return team?.name || team?.abbr || teamIdOf(team) || 'Team';
}
