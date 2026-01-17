<script>
  import Card from '$lib/ui/Card.svelte';
  import SectionHeader from '$lib/ui/SectionHeader.svelte';
  import Pill from '$lib/ui/Pill.svelte';

  export let data;
  const rows = data?.rows ?? [];
</script>

<Card variant="glow">
  <div class="kicker">Standings</div>
  <h1 class="h1">Leaderboard</h1>
  <p class="subtle" style="margin-top:10px;">
    Total points decide IrvingCoin. Respect the board.
  </p>
</Card>

<div style="height:16px;"></div>

<Card>
  <SectionHeader kicker="Overall" title="Totals">
    <Pill tone="gold">{rows.length} players</Pill>
  </SectionHeader>

  <div class="table" style="margin-top: 14px;">
    {#if rows.length === 0}
      <div class="muted" style="padding: 14px;">No scores yet.</div>
    {:else}
      <div class="thead">
        <div>Rank</div>
        <div>GM</div>
        <div style="text-align:right;">Points</div>
      </div>

      {#each rows as r, i (r.user_id)}
        <div class="trow">
          <div class="muted">{i + 1}</div>
          <div class="subtle">{r.display_name}</div>
          <div style="text-align:right; font-weight:800; color: rgba(245,213,138,0.95);">
            {r.total_points}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</Card>

<style>
  .table {
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 14px;
    overflow: hidden;
    background: rgba(0,0,0,0.22);
  }
  .thead, .trow {
    display: grid;
    grid-template-columns: 90px 1fr 140px;
    gap: 10px;
    padding: 12px 14px;
    align-items: center;
  }
  .thead {
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    font-weight: 750;
    letter-spacing: 0.02em;
    color: rgba(255,255,255,0.75);
  }
  .trow {
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .trow:last-child { border-bottom: none; }
</style>
