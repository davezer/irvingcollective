<script>
  import { resolve } from '$app/paths';
  import { eventDisplay } from '$lib/events/displayNames';
  import RoundTracker from '$lib/games/madness/RoundTracker.svelte';

  export let data;

  const { event, locked, results, entries = [] } = data;
  const names = eventDisplay(event);
  const resultsPayload = results?.payload || null;

  const ROUNDS = [
    { key: 'r1', label: 'R1', mult: 1, long: 'Round of 64' },
    { key: 'r2', label: 'R2', mult: 2, long: 'Round of 32' },
    { key: 'r3', label: 'R3', mult: 3, long: 'Sweet 16' },
    { key: 'r4', label: 'R4', mult: 4, long: 'Elite 8' },
    { key: 'r5', label: 'R5', mult: 6, long: 'Final Four' },
    { key: 'r6', label: 'R6', mult: 10, long: 'Championship' }
  ];

  const winsByTeamId = resultsPayload?.winsByTeamId || {};
  const seedsByTeamId = resultsPayload?.seedsByTeamId || {};

  function prettyLock(ts) {
    if (!ts) return '';
    return new Date(Number(ts) * 1000).toLocaleString();
  }

  function teamIdOf(t) {
    return String(t?.id ?? t?.teamId ?? '');
  }

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
      if (wins?.[r.key]) c++;
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

    if (completedRoundIndex < 0) return 'pending';
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
          owners: []
        });
      }

      const row = teamPickMap.get(tid);
      row.count += 1;
      row.owners.push(entry.display_name);
    }
  }

  const teamStats = [...teamPickMap.values()]
    .map((row) => {
      const seed = seedOf(row.team);
      const wins = winsCount(row.team);
      const status = teamStatus(row.team);

      return {
        ...row,
        seed,
        wins,
        status,
        aliveOwners: row.owners.length,
        points: pointsSoFar(row.team),
        stage: stageLabel(row.team),
        isLoneWolf: row.count === 1
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if ((a.seed ?? 99) !== (b.seed ?? 99)) return (a.seed ?? 99) - (b.seed ?? 99);
      return String(a.team?.name || '').localeCompare(String(b.team?.name || ''));
    });

  const mostPickedTeams = teamStats.slice(0, 3);

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
    const count = teamStats.filter((t) => t.wins >= idx).length;
    return {
      ...r,
      count
    };
  });

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
        worstBeat
      };
    })
    .sort((a, b) => {
      if (b.scoreTotal !== a.scoreTotal) return b.scoreTotal - a.scoreTotal;
      if (b.alive !== a.alive) return b.alive - a.alive;
      if ((b.avgSeed ?? 0) !== (a.avgSeed ?? 0)) return (b.avgSeed ?? 0) - (a.avgSeed ?? 0);
      return String(a.display_name || '').localeCompare(String(b.display_name || ''));
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

  function badgeList(entry) {
    const badges = [];

    if (entry.alive === 4) badges.push({ label: 'All 4 alive', tone: 'green' });
    if (entry.alive === 0 && completedRoundIndex >= 0) badges.push({ label: 'Busted', tone: 'red' });
    if (boldestEntry && entry.user_id === boldestEntry.user_id) badges.push({ label: 'Boldest card', tone: 'gold' });
    if (chalkiestEntry && entry.user_id === chalkiestEntry.user_id) badges.push({ label: 'Chalk king', tone: 'muted' });
    if (mostAliveEntry && entry.user_id === mostAliveEntry.user_id) badges.push({ label: 'Most alive', tone: 'green' });

    const highestSeedOnCard = Math.max(
      0,
      ...((entry.selectedTeams || []).map((t) => Number(seedOf(t) || 0)))
    );
    if (highestSeedOnCard >= 10) {
      badges.push({ label: `Longshot ${highestSeedOnCard}`, tone: 'gold' });
    }

    return badges.slice(0, 5);
  }

  function fmtAvgSeed(n) {
    if (!Number.isFinite(n)) return '—';
    return n.toFixed(2);
  }

  function fmtTeamName(team) {
    return team?.name || team?.abbr || teamIdOf(team) || 'Team';
  }

  function teamOwners(team) {
    const row = teamPickMap.get(teamIdOf(team));
    return row?.owners || [];
  }
</script>

<div class="page-wide">
  <div class="warroom card card--glow">
    <div class="warroom__top">
      <div class="warroom__titlewrap">
        <div class="kicker">Tournament War Room</div>

        <div class="warroom__titleline">
          {#if names.logo}
            <img class="warroom__logo" src={names.logo} alt={`${names.title} logo`} loading="lazy" />
          {/if}
          <h1 class="warroom__title">{names.title} Picks Board</h1>
        </div>

        <div class="warroom__subtitle">
          Every pick. Every sweat. Every busted Cinderella and beautiful longshot.
        </div>
      </div>

      <div class="warroom__actions">
        <span class={locked ? 'pill pill--red' : 'pill pill--green'}>
          {locked ? 'Locked' : 'Open'}
        </span>
        <span class="pill pill--gold">{enrichedEntries.length} entries</span>
        <a class="btn btn--ghost" href={resolve('/games/[slug]', { slug: event.slug })}>Back to event</a>
      </div>
    </div>

    <div class="warroom__meta">
      <span class="pill">Lock time: {prettyLock(event?.lock_at)}</span>
      <span class="pill">Current stage: {completedRoundLabel}</span>
      <!-- <span class="pill">{teamStats.length} unique picked teams</span> -->
    </div>
  </div>
</div>

<div class="page-wide">
  {#if !locked}
    <div class="card notice">
      <div class="section-head">
        <h2 class="h2">Board is armed but not public yet</h2>
        <span class="pill">Waiting for lock</span>
      </div>

      <p class="subtle" style="margin-top: 8px;">
        Once the event locks, this page becomes the full league-wide picks and progress board.
      </p>
    </div>
  {:else if !enrichedEntries.length}
    <div class="card notice">
      <div class="section-head">
        <h2 class="h2">No entries yet</h2>
        <span class="pill">Empty board</span>
      </div>

      <p class="subtle" style="margin-top: 8px;">
        Nobody has submitted teams for this event.
      </p>
    </div>
  {:else}
    <section class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Most picked</div>
        {#if mostPickedTeams[0]}
          <div class="stat-value">{fmtTeamName(mostPickedTeams[0].team)}</div>
          <div class="stat-sub">
            {mostPickedTeams[0].count} entries
            {#if Number.isFinite(mostPickedTeams[0].seed)}
              • {mostPickedTeams[0].seed} seed
            {/if}
          </div>
        {:else}
          <div class="stat-value">—</div>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-label">Highest seed picked</div>
        {#if highestSeedPicked}
          <div class="stat-value">{highestSeedPicked.seed} seed</div>
            <div class="stat-sub">
            {fmtTeamName(highestSeedPicked.team)} • {highestSeedPicked.owners.join(', ')}
            </div>
        {:else}
          <div class="stat-value">—</div>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-label">Most alive</div>
        {#if mostAliveEntry}
          <div class="stat-value">{mostAliveEntry.display_name}</div>
          <div class="stat-sub">{mostAliveEntry.alive} alive</div>
        {:else}
          <div class="stat-value">—</div>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-label">Boldest card</div>
        {#if boldestEntry}
          <div class="stat-value">{boldestEntry.display_name}</div>
          <div class="stat-sub">Avg seed {fmtAvgSeed(boldestEntry.avgSeed)}</div>
        {:else}
          <div class="stat-value">—</div>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-label">Chalk king</div>
        {#if chalkiestEntry}
          <div class="stat-value">{chalkiestEntry.display_name}</div>
          <div class="stat-sub">Avg seed {fmtAvgSeed(chalkiestEntry.avgSeed)}</div>
        {:else}
          <div class="stat-value">—</div>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-label">Graveyard team</div>
        {#if graveyardTeam}
          <div class="stat-value">{fmtTeamName(graveyardTeam.team)}</div>
            <div class="stat-sub">
            {graveyardTeam.count} {graveyardTeam.count === 1 ? 'entry' : 'entries'} • eliminated
            </div>
        {:else}
          <div class="stat-value">No graveyard yet</div>
          <div class="stat-sub">Nobody popular has died yet</div>
        {/if}
      </div>
    </section>

    <section class="summary-panels">
      <div class="panel card">
        <div class="panel-head">
          <h2 class="h2">Most Picked Teams</h2>
          <span class="pill pill--gold">{teamStats.length} unique picked teams</span>
        </div>

        <div class="popular-list">
          {#each mostPickedTeams as row (row.id)}
            <div class="popular-row">
              <div class="popular-main">
                {#if row.team?.logoUrl}
                  <img class="popular-logo" src={row.team.logoUrl} alt="" />
                {/if}

                <div>
                  <div class="popular-name">
                    {#if Number.isFinite(row.seed)}
                      <span class="seed-tag">{row.seed}</span>
                    {/if}
                    {fmtTeamName(row.team)}
                  </div>
                  <div class="popular-sub">
                    {row.count} picks • {row.stage}
                    {#if row.isLoneWolf}
                      • lone wolf
                    {/if}
                  </div>
                </div>
              </div>

              <div class="popular-side">
                <span class={row.status === 'eliminated' ? 'pill pill--red' : 'pill pill--green'}>
                  {row.status === 'eliminated' ? 'Out' : row.status === 'champion' ? 'Champion' : 'Alive'}
                </span>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="panel card">
        <div class="panel-head">
          <h2 class="h2">Cinderella Watch</h2>
          <span class="pill">Longshots still breathing</span>
        </div>

        {#if survivingLongshots.length}
          <div class="chips-wrap">
            {#each survivingLongshots as row (row.id)}
              <div class="story-chip story-chip--gold">
                <div class="story-chip__title">{row.seed} seed {fmtTeamName(row.team)}</div>
                <div class="story-chip__sub">
                  {row.count} owner{row.count === 1 ? '' : 's'} • {row.stage}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-copy">No living longshots right now.</div>
        {/if}

        <div class="panel-divider"></div>

        <details class="panel-collapse">
            <summary class="panel-collapse__summary">
                <span class="h3">Round Ownership</span>
                <span class="panel-collapse__hint">Tap to expand</span>
            </summary>

            <div class="ownership-grid">
                {#each ownershipByRound as row (row.key)}
                <div class="ownership-card">
                    <div class="ownership-label">{row.long}</div>
                    <div class="ownership-value">{row.count}</div>
                    <div class="ownership-sub">picked teams reached this stage</div>
                </div>
                {/each}
            </div>
            </details>
      </div>
    </section>

    <section class="entries-grid">
      {#each enrichedEntries as entry, i (entry.user_id)}
        <details class="entry-card" open={i < 3}>
          <summary class="entry-summary">
            <div class="entry-summary__left">
              <div class="rank-badge">#{i + 1}</div>

              <div class="entry-identity">
                <div class="entry-name-row">
                  <div class="entry-name">{entry.display_name}</div>

                  <div class="badge-row">
                    {#each badgeList(entry) as badge}
                      <span class={`mini-badge mini-badge--${badge.tone}`}>{badge.label}</span>
                    {/each}
                  </div>
                </div>

                <div class="entry-meta">
                  <span>{entry.scoreTotal} pts</span>
                  <span>•</span>
                  <span>{entry.alive} alive</span>
                  <span>•</span>
                  <span>avg seed {fmtAvgSeed(entry.avgSeed)}</span>
                  <span>•</span>
                  <span>deepest run {entry.deepest}W</span>
                </div>
              </div>
            </div>

            <div class="entry-summary__right">
              <span class="pill pill--gold">{entry.selectedTeams.length}/4</span>
              <span class="panel-collapse__hint">Tap to expand</span>
            </div>
          </summary>

          <div class="entry-body">
            <div class="entry-story-grid">
              <div class="story-chip">
                <div class="story-chip__title">Best pick</div>
                <div class="story-chip__sub">
                  {#if entry.bestPick}
                    {#if Number.isFinite(seedOf(entry.bestPick))}
                      {seedOf(entry.bestPick)} seed
                    {/if}
                    {fmtTeamName(entry.bestPick)} • {pointsSoFar(entry.bestPick)} pts
                  {:else}
                    —
                  {/if}
                </div>
              </div>

              <div class="story-chip">
                <div class="story-chip__title">Toughest loss</div>
                <div class="story-chip__sub">
                  {#if entry.worstBeat}
                    {#if Number.isFinite(seedOf(entry.worstBeat))}
                      {seedOf(entry.worstBeat)} seed
                    {/if}
                    {fmtTeamName(entry.worstBeat)}
                  {:else}
                    None yet
                  {/if}
                </div>
              </div>

                        
            </div>

            <div class="team-strip">
              {#each entry.selectedTeams as team (team.id)}
                {@const status = teamStatus(team)}
                <div class={`team-chip team-chip--${status}`}>
                  <div class="team-chip__top">
                    <div class="team-chip__identity">
                      {#if team.logoUrl}
                        <img class="team-chip__logo" src={team.logoUrl} alt="" />
                      {/if}
                      <div>
                        <div class="team-chip__name">
                          {#if Number.isFinite(seedOf(team))}
                            <span class="seed-tag">{seedOf(team)}</span>
                          {/if}
                          {fmtTeamName(team)}
                        </div>
                        <div class="team-chip__meta">
                          {#if team.region}{team.region} • {/if}{stageLabel(team)}
                        </div>
                      </div>
                    </div>

                    <div class="team-chip__pills">
                      <span class="pill pill--gold">{pointsSoFar(team)} pts</span>
                    </div>
                  </div>

                  <div class="team-chip__bottom">
                    <span class={status === 'eliminated' ? 'pill pill--red' : 'pill pill--green'}>
                      {status === 'eliminated' ? 'Eliminated' : status === 'champion' ? 'Champion' : status === 'alive' ? 'Alive' : 'Pending'}
                    </span>

                    {#if teamOwners(team).length === 1}
                      <span class="pill">Lone wolf</span>
                    {:else}
                      <span class="pill">{teamOwners(team).length} owners</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>

            <RoundTracker selectedTeams={entry.selectedTeams} {resultsPayload} dense={true} />
          </div>
        </details>
      {/each}
    </section>
  {/if}
</div>

<style>
  .page-wide {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 24px 24px;
    box-sizing: border-box;
  }

  .warroom {
    margin-bottom: 18px;
  }

  .warroom__top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
  }

  .warroom__titlewrap {
    display: grid;
    gap: 6px;
    min-width: 0;
  }

  .warroom__titleline {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .warroom__logo {
    width: 42px;
    height: 42px;
    object-fit: cover;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.22);
    flex: 0 0 auto;
  }

  .warroom__title {
    margin: 0;
    font-family: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Garamond, Georgia, serif;
    font-size: 1.9rem;
    line-height: 1.1;
    letter-spacing: 0.2px;
  }

  .warroom__subtitle {
    opacity: 0.74;
    font-size: 0.98rem;
  }

  .warroom__actions,
  .warroom__meta,
  .badge-row,
  .team-chip__bottom,
  .team-chip__pills,
  .entry-summary__right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .warroom__meta {
    margin-top: 14px;
  }

  .notice {
    margin-bottom: 18px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .stat-card,
  .ownership-card {
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.22);
    border-radius: 18px;
    padding: 14px;
    min-width: 0;
  }

  .stat-label,
  .ownership-label {
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.66;
  }

  .stat-value,
  .ownership-value {
    margin-top: 6px;
    font-size: 1.12rem;
    font-weight: 900;
    line-height: 1.15;
  }

  .stat-sub,
  .ownership-sub,
  .popular-sub,
  .entry-meta,
  .story-chip__sub,
  .team-chip__meta,
  .empty-copy {
    opacity: 0.72;
    font-size: 0.92rem;
  }

  .summary-panels {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 16px;
    margin-bottom: 18px;
  }

  .panel {
    display: grid;
    gap: 14px;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .panel-head--mini {
    margin-top: 2px;
  }

  .panel-divider {
    height: 1px;
    background: rgba(255,255,255,0.08);
    border-radius: 999px;
  }

  .popular-list {
    display: grid;
    gap: 10px;
  }

  .popular-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    min-width: 0;
  }

  .popular-main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .popular-side {
    flex: 0 0 auto;
  }

  .popular-logo,
  .team-chip__logo {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    object-fit: contain;
    flex: 0 0 auto;
  }

  .popular-name,
  .team-chip__name,
  .entry-name {
    font-weight: 900;
    line-height: 1.15;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .seed-tag {
    display: inline-flex;
    min-width: 20px;
    justify-content: center;
    padding: 2px 6px;
    margin-right: 6px;
    border-radius: 999px;
    border: 1px solid rgba(214,177,94,0.28);
    background: rgba(214,177,94,0.10);
    font-size: 0.78rem;
    font-weight: 900;
    vertical-align: middle;
  }

  .chips-wrap,
  .entry-story-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .story-chip {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    border-radius: 14px;
    padding: 12px;
    min-width: 0;
  }

  .story-chip--gold {
    border-color: rgba(214,177,94,0.22);
    background: rgba(214,177,94,0.08);
  }

  .story-chip__title {
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.66;
    margin-bottom: 6px;
  }

  .ownership-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .entries-grid {
    display: grid;
    gap: 16px;
  }

  .entry-card {
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.22);
    border-radius: 20px;
    overflow: hidden;
  }

  .entry-card[open] {
    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
  }

  .entry-summary {
    list-style: none;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
    cursor: pointer;
  }

  .entry-summary::-webkit-details-marker {
    display: none;
  }

  .entry-summary__left {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    min-width: 0;
    flex: 1 1 auto;
  }

  .entry-identity {
    min-width: 0;
    display: grid;
    gap: 6px;
    flex: 1 1 auto;
  }

  .entry-name-row {
    display: grid;
    gap: 6px;
  }

  .entry-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .rank-badge {
    min-width: 48px;
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    font-weight: 900;
    border: 1px solid rgba(214,177,94,0.28);
    background: rgba(214,177,94,0.10);
    flex: 0 0 auto;
  }

  .entry-toggle {
    opacity: 0.56;
    font-size: 0.88rem;
    align-self: center;
    white-space: nowrap;
  }

  .entry-body {
    display: grid;
    gap: 14px;
    padding: 0 16px 16px;
  }

  .team-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .team-chip {
    border-radius: 16px;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    display: grid;
    gap: 10px;
    min-width: 0;
  }

  .team-chip--alive,
  .team-chip--champion {
    border-color: rgba(88, 190, 112, 0.28);
    background: rgba(88, 190, 112, 0.08);
  }

  .team-chip--eliminated {
    border-color: rgba(220, 78, 78, 0.22);
    background: rgba(220, 78, 78, 0.07);
    opacity: 0.86;
  }

  .team-chip__top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
  }

  .team-chip__identity {
    display: flex;
    gap: 10px;
    min-width: 0;
    align-items: center;
    flex: 1 1 auto;
  }

  .mini-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    font-size: 0.78rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .mini-badge--gold {
    border-color: rgba(214,177,94,0.28);
    background: rgba(214,177,94,0.10);
  }

  .mini-badge--green {
    border-color: rgba(88,190,112,0.26);
    background: rgba(88,190,112,0.09);
  }

  .mini-badge--red {
    border-color: rgba(220,78,78,0.24);
    background: rgba(220,78,78,0.08);
  }

  .mini-badge--muted {
    opacity: 0.8;
  }

  @media (max-width: 1200px) {
    .stats-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .summary-panels {
      grid-template-columns: 1fr;
    }

    .team-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 840px) {
    .ownership-grid,
    .chips-wrap,
    .entry-story-grid {
      grid-template-columns: 1fr;
    }

    .entry-summary {
      flex-direction: column;
    }

    .entry-summary__right {
      width: 100%;
      justify-content: space-between;
    }
  }

  @media (max-width: 640px) {
    .page-wide {
      padding: 0 12px 0px;
    }

    .warroom {
      margin-bottom: 14px;
    }

    .warroom__top {
      gap: 12px;
    }

    .warroom__titleline {
      align-items: flex-start;
      gap: 10px;
    }

    .warroom__logo {
      width: 36px;
      height: 36px;
      border-radius: 10px;
    }

    .warroom__title {
      font-size: 1.42rem;
      line-height: 1.02;
    }

    .warroom__subtitle {
      font-size: 0.95rem;
      line-height: 1.35;
    }

    .warroom__actions {
      width: 100%;
      gap: 8px;
    }

    .warroom__actions .btn,
    .warroom__actions .pill {
      min-height: 18px;
    }

    .warroom__meta {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      margin-top: 12px;
    }

    .warroom__meta .pill {
      width: 100%;
      justify-content: flex-start;
      box-sizing: border-box;
    }

.stats-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.stat-card,
.ownership-card {
  padding: 10px;
  border-radius: 14px;
}
.stat-value,
.ownership-value {
  font-size: 0.96rem;
  line-height: 1.1;
}
.stat-sub,
.ownership-sub,
.popular-sub,
.entry-meta,
.story-chip__sub,
.team-chip__meta,
.empty-copy {
  font-size: 0.78rem;
  line-height: 1.25;
}

.stat-label,
.ownership-label {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
}

.stat-card {
  min-height: 92px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

    .summary-panels {
      gap: 12px;
      margin-bottom: 14px;
    }

    .panel {
      gap: 12px;
    }

    .popular-row {
      padding: 10px;
      border-radius: 12px;
      align-items: center;
    }

    .popular-name {
      font-size: 0.98rem;
    }

    .popular-sub {
      font-size: 0.85rem;
    }

    .popular-side .pill {
      min-width: 54px;
      justify-content: center;
      padding-inline: 10px;
    }

    .chips-wrap,
    .entry-story-grid,
    .ownership-grid {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .story-chip {
      padding: 10px 12px;
      border-radius: 12px;
    }

    .entries-grid {
      gap: 12px;
    }

    .entry-card {
      border-radius: 18px;
    }

    .entry-summary {
      padding: 12px;
      gap: 12px;
    }

    .entry-summary__left {
      gap: 10px;
    }

    .rank-badge {
      min-width: 42px;
      width: 42px;
      height: 42px;
      font-size: 0.95rem;
    }

    .entry-name-row {
      gap: 5px;
    }

    .entry-name {
      font-size: 1.02rem;
    }

    .badge-row {
      gap: 6px;
    }

    .mini-badge {
      font-size: 0.72rem;
      padding: 4px 7px;
    }

    .entry-meta {
      gap: 6px;
      font-size: 0.84rem;
      line-height: 1.3;
    }

    .entry-summary__right {
      width: 100%;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .entry-summary__right .pill {
      min-height: 34px;
    }

    .entry-toggle {
      font-size: 0.82rem;
    }

    .entry-body {
      gap: 12px;
      padding: 0 12px 12px;
    }

    .team-strip {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .team-chip {
      padding: 10px;
      border-radius: 14px;
      gap: 8px;
    }

    .team-chip__top {
      gap: 8px;
    }

    .team-chip__identity {
      gap: 8px;
      align-items: flex-start;
    }

    .team-chip__logo {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      margin-top: 1px;
    }

    .team-chip__name {
      font-size: 0.96rem;
    }

    .team-chip__meta {
      font-size: 0.82rem;
    }

    .team-chip__bottom {
      gap: 6px;
    }

    .team-chip__bottom .pill,
    .team-chip__pills .pill {
      min-height: 32px;
      font-size: 0.78rem;
      padding-inline: 10px;
    }

    .seed-tag {
      min-width: 18px;
      padding: 1px 5px;
      margin-right: 5px;
      font-size: 0.72rem;
    }

    :global(.roundtracker),
    :global(.round-tracker) {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
  }

  @media (max-width: 420px) {
    .page-wide {
      padding: 0 10px 16px;
    }

    .warroom__title {
      font-size: 1.28rem;
    }

    .warroom__subtitle {
      font-size: 0.9rem;
    }

    .entry-summary {
      padding: 10px;
    }

    .entry-body {
      padding: 0 10px 10px;
    }

    .stat-card,
    .ownership-card,
    .story-chip,
    .team-chip {
      padding: 10px;
    }

    .mini-badge {
      font-size: 0.69rem;
      padding: 3px 6px;
    }

    .entry-meta {
      font-size: 0.8rem;
    }

    .stats-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.stat-card {
  min-height: 88px;
}
  }
</style>