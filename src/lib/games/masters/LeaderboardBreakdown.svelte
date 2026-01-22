<script>
  export let ev;

  const b = ev?.breakdown || ev?.totals || ev?.score?.breakdown || null;

  const winnerId = b?.winnerId || ev?.breakdown?.winnerId || ev?.breakdown?.winner?.id || null;
  const pickedId = b?.pickedId || ev?.breakdown?.pickedId || null;
  const lockStage = b?.lockStage || ev?.breakdown?.lockStage || null;
  const won = Boolean(b?.won);

  const total = ev?.points ?? ev?.score_total ?? ev?.totals?.total ?? 0;

  function stageLabel(s) {
    if (s === 'pre_r1') return 'Pre R1';
    if (s === 'post_r1') return 'Post R1';
    if (s === 'post_r2') return 'Post R2';
    if (s === 'post_r3') return 'Post R3';
    return s || '—';
  }
</script>

<div class="chips">
  <span class="chip">
    <span class="k">Stage</span>
    <span class="v">{stageLabel(lockStage)}</span>
  </span>

  <span class="chip {won ? 'chip--badge' : ''}">
    <span class="k">Winner</span>
    <span class="v">{won ? '✔' : '—'}</span>
  </span>

  <span class="chip">
    <span class="k">Total</span>
    <span class="v">{total}</span>
  </span>
</div>

<style>
  .chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
  .chip { display:inline-flex; align-items:baseline; gap:8px; padding:6px 10px; border-radius:999px; border:1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); }
  .chip--badge { border-color: rgba(255,210,120,0.22); background: rgba(255,210,120,0.06); }
  .k { opacity:0.75; font-size:0.82rem; }
  .v { font-weight:900; }
</style>
