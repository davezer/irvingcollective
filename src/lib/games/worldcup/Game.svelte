<!-- src/lib/games/worldcup/Game.svelte -->
<script>
  import { WORLD_CUP_ROUNDS, WORLD_CUP_ROUND_LABELS, WORLD_CUP_POINTS } from '$lib/scoring/worldCup.js';

  export let event;
  export let locked;
  export let entry;
  export let options;   // from /api/events/[slug]/options
  export let loading;
  export let loadError;
  export let results;
  export let bankroll;
  export let onRetryOptions;

  const empty = (v) => (v == null ? '' : String(v));

  $: teams = options?.teams || [];
  $: currentRound = results?.payload?.currentRound || 'group';
  $: roundLabel = WORLD_CUP_ROUND_LABELS[currentRound] || currentRound;
  $: roundPts = WORLD_CUP_POINTS[currentRound] || 0;

  $: picksByRound = entry?.payload?.picksByRound || {};
  $: usedTeams = entry?.payload?.usedTeams || [];
  $: eliminated = Boolean(entry?.payload?.eliminated);

  let teamId = '';

  // keep select in sync with current round pick
  $: teamId = empty(picksByRound?.[currentRound] || '');

  function teamName(id) {
    const t = teams.find((x) => empty(x.id) === empty(id));
    return t?.name || id;
  }

  function isUsed(id) {
    // allow selecting same as current round pick (edit)
    const prev = empty(picksByRound?.[currentRound] || '');
    return usedTeams.includes(id) && id !== prev;
  }
</script>

<div class="wc-card">
  <div class="wc-head">
    <div>
      <div class="wc-kicker">World Cup Survivor</div>
      <div class="wc-round">
        <span class="wc-round-name">{roundLabel}</span>
        <span class="wc-round-pts">{roundPts} pts</span>
      </div>
      <div class="wc-subtle">
        One team per round. No re-use. Lose once and you’re eliminated.
      </div>
    </div>

    <div class="wc-bankroll">
      <div class="wc-bankroll-label">Bankroll</div>
      <div class="wc-bankroll-value">{bankroll}</div>
    </div>
  </div>

  {#if loading}
    <div class="wc-note">Loading teams…</div>
  {:else if loadError}
    <div class="wc-error">
      {loadError}
      <button class="btn btn--ghost btn--sm" on:click={onRetryOptions}>Retry</button>
    </div>
  {:else if eliminated}
    <div class="wc-elim">
      You’re eliminated. Your run is over for this World Cup.
    </div>
  {:else}
    <form method="POST" action="?/save" class="wc-form">
      <input type="hidden" name="round" value={currentRound} />

      <label class="wc-label">Pick a team</label>
      <select class="wc-select" name="teamId" bind:value={teamId} disabled={locked}>
        <option value="" disabled>Select a team</option>
        {#each teams as t (t.id)}
          <option value={t.id} disabled={isUsed(String(t.id))}>
            {t.name}{isUsed(String(t.id)) ? ' (used)' : ''}
          </option>
        {/each}
      </select>

      <button class="btn btn--vip wc-submit" disabled={locked || !teamId}>
        {locked ? 'Locked' : 'Save Pick'}
      </button>
    </form>
  {/if}

  <div class="wc-history">
    <div class="wc-history-title">Your Run</div>

    <div class="wc-history-list">
      {#each WORLD_CUP_ROUNDS as r}
        {#if picksByRound?.[r]}
          <div class="wc-row">
            <div class="wc-row-left">
              <div class="wc-row-round">{WORLD_CUP_ROUND_LABELS[r] || r}</div>
              <div class="wc-row-team">{teamName(picksByRound[r])}</div>
            </div>
            <div class="wc-row-right">
              <span class="wc-chip">{WORLD_CUP_POINTS[r] || 0} pts</span>
            </div>
          </div>
        {/if}
      {/each}

      {#if !Object.keys(picksByRound || {}).length}
        <div class="wc-note">No picks submitted yet.</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .wc-card{
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.18);
    padding: 16px;
  }

  .wc-head{
    display:flex;
    justify-content:space-between;
    gap:16px;
    flex-wrap:wrap;
    align-items:flex-start;
    margin-bottom: 12px;
  }

  .wc-kicker{
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 0.78rem;
    opacity: 0.85;
  }

  .wc-round{
    display:flex;
    gap:10px;
    align-items:baseline;
    margin-top: 4px;
  }

  .wc-round-name{
    font-size: 1.25rem;
    font-weight: 950;
  }

  .wc-round-pts{
    font-size: 0.9rem;
    opacity: 0.75;
  }

  .wc-subtle{ opacity: 0.7; margin-top: 4px; }

  .wc-bankroll{
    text-align:right;
    opacity:0.9;
  }

  .wc-bankroll-label{
    font-size:0.8rem;
    opacity:0.7;
  }

  .wc-bankroll-value{
    font-weight: 950;
    font-size: 1.2rem;
  }

  .wc-form{ display:grid; gap:10px; margin-top: 10px; }

  .wc-label{ font-weight: 900; opacity: 0.9; }

  .wc-select{
    width: 100%;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.22);
    color: rgba(255,255,255,0.9);
    outline: none;
  }

  .wc-submit{ justify-self: start; }

  .wc-error{
    margin-top: 10px;
    display:flex;
    gap:10px;
    align-items:center;
    opacity: 0.9;
  }

  .wc-note{
    margin-top: 10px;
    opacity: 0.7;
  }

  .wc-elim{
    margin-top: 10px;
    padding: 12px;
    border-radius: 14px;
    border: 1px solid rgba(255,120,120,0.20);
    background: rgba(255,120,120,0.07);
  }

  .wc-history{
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .wc-history-title{
    font-weight: 950;
    margin-bottom: 8px;
  }

  .wc-history-list{ display:grid; gap:8px; }

  .wc-row{
    display:flex;
    justify-content:space-between;
    gap:12px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.18);
  }

  .wc-row-round{ font-weight: 900; opacity: 0.85; font-size: 0.9rem; }
  .wc-row-team{ opacity: 0.75; font-size: 0.88rem; margin-top: 2px; }

  .wc-chip{
    display:inline-flex;
    align-items:center;
    height: 26px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    opacity: 0.85;
    white-space: nowrap;
  }
</style>
