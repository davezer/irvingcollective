<script>
  // RoundTracker.svelte
  // Read-only “progress” indicator for a user's selected teams during March Madness.

  export let selectedTeams = [];
  // resultsPayload should contain: seedsByTeamId, winsByTeamId
  export let resultsPayload = null;

  // Optional: compact vs roomy
  export let dense = false;

  const ROUNDS = [
    { key: 'r1', label: 'R1', mult: 1 },
    { key: 'r2', label: 'R2', mult: 2 },
    { key: 'r3', label: 'R3', mult: 3 },
    { key: 'r4', label: 'R4', mult: 4 },
    { key: 'r5', label: 'R5', mult: 6 },
    { key: 'r6', label: 'R6', mult: 10 }
  ];

  $: seedsByTeamId = resultsPayload?.seedsByTeamId || {};
  $: winsByTeamId = resultsPayload?.winsByTeamId || {};

  function teamIdOf(t) {
    return String(t?.id ?? t?.teamId ?? '');
  }

  function seedOf(teamId) {
    const s = Number(seedsByTeamId?.[teamId]);
    return Number.isFinite(s) && s > 0 ? s : null;
  }

  function winsObj(teamId) {
    return winsByTeamId?.[teamId] || {};
  }

  function pointsSoFar(teamId) {
    const seed = seedOf(teamId);
    if (!seed) return 0;
    const wins = winsObj(teamId);
    let pts = 0;
    for (const r of ROUNDS) {
      if (wins?.[r.key]) pts += seed * r.mult;
    }
    return pts;
  }

  function winsCount(teamId) {
    const wins = winsObj(teamId);
    let c = 0;
    for (const r of ROUNDS) if (wins?.[r.key]) c++;
    return c;
  }

  function isEliminated(teamId) {
    // We don’t have explicit elimination state; infer:
    // if a team has no win flags AND you want to show “unknown”, keep it neutral.
    // If you later add eliminatedByTeamId, you can wire it here.
    return false;
  }

  $: hasAnyResultsData =
    Object.keys(seedsByTeamId).length > 0 || Object.keys(winsByTeamId).length > 0;
</script>

<div class={"rt-card " + (dense ? "rt-dense" : "")}>
  <div class="rt-head">
    <div class="rt-title">Round Progress</div>
    {#if !hasAnyResultsData}
      <div class="rt-sub muted">Progress appears once results are synced.</div>
    {:else}
      <div class="rt-sub muted">Wins update as rounds complete.</div>
    {/if}
  </div>

  <div class="rt-table">
    <div class="rt-row rt-header">
      <div class="rt-teamcol">Team</div>
      <div class="rt-seedcol">Seed</div>
      <div class="rt-rounds">
        {#each ROUNDS as r}
          <div class="rt-roundhdr">{r.label}</div>
        {/each}
      </div>
      <div class="rt-pointscol">Pts</div>
    </div>

    {#each selectedTeams as t (teamIdOf(t))}
      {#if teamIdOf(t)}
        {@const tid = teamIdOf(t)}
        {@const seed = seedOf(tid)}
        {@const wins = winsObj(tid)}
        {@const pts = pointsSoFar(tid)}
        {@const wc = winsCount(tid)}

        <div class={"rt-row " + (isEliminated(tid) ? "rt-elim" : "")}>
          <div class="rt-teamcol">
            <div class="rt-team">
              {#if t.logoUrl || t.logo || t.image}
                <img class="rt-logo" src={t.logoUrl || t.logo || t.image} alt="" />
              {/if}
              <div class="rt-teamtext">
                <div class="rt-teamname">{t.name || t.teamName || 'Team'}</div>
                {#if t.abbr || t.shortName}
                  <div class="rt-teamabbr muted">{t.abbr || t.shortName}</div>
                {/if}
              </div>
            </div>
          </div>

          <div class="rt-seedcol">
            {#if seed}
              <span class="pill">{seed}</span>
            {:else}
              <span class="pill pill--muted">—</span>
            {/if}
          </div>

          <div class="rt-rounds">
            {#each ROUNDS as r (r.key)}
              {@const hit = Boolean(wins?.[r.key])}
              <div class={"rt-cell " + (hit ? "rt-hit" : "rt-miss")}>
                <span class="rt-dot" aria-hidden="true"></span>
              </div>
            {/each}
          </div>

          <div class="rt-pointscol">
            <span class="pill pill--gold">{pts}</span>
            <span class="muted rt-wins">{wc}W</span>
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .rt-card {
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.22);
    border-radius: 18px;
    padding: 14px;
  }

  .rt-head { display: grid; gap: 6px; margin-bottom: 10px; }
  .rt-title { font-weight: 900; letter-spacing: 0.02em; }
  .rt-sub { font-size: 0.95rem; }

  .rt-table { display: grid; gap: 10px; }

  .rt-row {
    display: grid;
    grid-template-columns: minmax(220px, 1.6fr) 80px minmax(240px, 2fr) 110px;
    gap: 12px;
    align-items: center;
  }

  .rt-header {
    padding: 8px 10px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.18);
  }

  .rt-header .rt-roundhdr {
    font-weight: 800;
    opacity: 0.85;
    text-align: center;
    font-size: 0.95rem;
  }

  .rt-team { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .rt-logo { width: 26px; height: 26px; border-radius: 8px; object-fit: contain; }
  .rt-teamtext { min-width: 0; }
  .rt-teamname { font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rt-teamabbr { font-size: 0.9rem; }

  .rt-rounds {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 10px;
  }

  .rt-cell {
    display: grid;
    place-items: center;
    padding: 10px 0;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.18);
  }

  .rt-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.20);
  }

  .rt-hit .rt-dot {
    border-color: rgba(212, 175, 55, 0.55);
    background: rgba(212, 175, 55, 0.35);
  }

  .rt-miss .rt-dot {
    border-color: rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.03);
  }

  .rt-pointscol {
    display: flex;
    justify-content: flex-end;
    align-items: baseline;
    gap: 8px;
  }

  .rt-wins { font-size: 0.9rem; }

  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.25);
    font-weight: 800;
    min-width: 28px;
  }

  .pill--gold {
    border-color: rgba(212, 175, 55, 0.30);
    background: rgba(212, 175, 55, 0.08);
  }

  .pill--muted {
    opacity: 0.7;
  }

  .muted { opacity: 0.75; }

  .rt-dense .rt-row {
    grid-template-columns: minmax(180px, 1.4fr) 70px minmax(210px, 2fr) 90px;
  }
  .rt-dense .rt-cell { padding: 8px 0; border-radius: 10px; }
  .rt-dense .rt-logo { width: 22px; height: 22px; border-radius: 7px; }

  @media (max-width: 900px) {
    .rt-row {
      grid-template-columns: 1fr;
      gap: 8px;
      padding: 10px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.18);
    }
    .rt-header { display: none; }
    .rt-pointscol { justify-content: flex-start; }
  }
</style>
