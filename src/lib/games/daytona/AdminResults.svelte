<script>
  import { enhance } from '$app/forms';

  export let data;

  const { event, results, entries, driverOptions, optionsMode, optionsNote } = data;

  let saving = false;
  let errorMsg = '';
  let okPulse = false;

  $: official = results?.payload ? results.payload : null;
  // If your getResultsForEvent already parses payload_json into `payload`, great.
  // If not, this will just be null; publish still works.

  function labelFor(id) {
    const o = (driverOptions || []).find((x) => String(x.id) === String(id));
    if (!o) return String(id);
    const num = o.carNumber ? `#${o.carNumber} ` : '';
    return `${num}${o.name}`;
  }
</script>

<div class="page-wide">
  <div class="card">
    <div class="section-head">
      <h2 class="h2">Publish Official Top 10</h2>
      <span class="pill pill--gold">Daytona</span>
    </div>

    {#if optionsMode}
      <div class="muted" style="margin-top:10px;">
        Options: {optionsMode}{#if optionsNote} · {optionsNote}{/if}
      </div>
    {/if}

    <form
      method="POST"
      action="?/publish"
      use:enhance={() => {
        saving = true;
        errorMsg = '';
        okPulse = false;

        return async ({ result, update }) => {
          if (result.type === 'success') {
            await update({ reset: false });
            okPulse = true;
            setTimeout(() => (okPulse = false), 1200);
          } else if (result.type === 'failure') {
            errorMsg = result.data?.error || 'Publish failed.';
          } else {
            errorMsg = 'Publish failed.';
          }
          saving = false;
        };
      }}
    >
      <div class="grid">
        {#each Array.from({ length: 10 }, (_, i) => i + 1) as pos}
          <div class="field">
            <label class="muted" for={"pos" + pos}>Pos {pos}</label>
            <select id={"pos" + pos} class="input" name={"pos" + pos} required>
              <option value="">— select driver —</option>
              {#each driverOptions || [] as d}
                <option value={String(d.id)}>
                  {d.carNumber ? `#${d.carNumber} ` : ''}{d.name}
                </option>
              {/each}
            </select>
          </div>
        {/each}
      </div>

      <div class="actions">
        <button class="btn btn--vip" type="submit" disabled={saving}>
          {saving ? 'Publishing…' : 'Publish results + recompute'}
        </button>

        <div class="muted">
          {#if errorMsg}
            <span style="color: rgba(255,120,120,0.95);">{errorMsg}</span>
          {:else if okPulse}
            Published ✅
          {/if}
        </div>
      </div>
    </form>
  </div>

  <div class="spacer"></div>

  <div class="card">
    <div class="section-head">
      <h2 class="h2">Entries</h2>
      <span class="pill">{entries?.length || 0}</span>
    </div>

    <div class="list" style="margin-top: 12px;">
      {#if !entries?.length}
        <div class="muted">No entries yet.</div>
      {:else}
        {#each entries as e}
          <div class="row">
            <div class="row-top">
              <div class="name">{e.display_name}</div>
              {#if e.score}
                <span class="pill pill--gold">{e.score.score_total} pts</span>
              {/if}
            </div>

            {#if e.top10Display?.length}
              <ol class="ol">
                {#each e.top10Display as pick}
                  <li>{labelFor(pick.id)}</li>
                {/each}
              </ol>
            {:else}
              <div class="muted">No picks.</div>
            {/if}

            {#if e.chaosDisplay}
              <div class="muted" style="margin-top: 8px;">
                Chaos: <strong>{labelFor(e.chaosDisplay.id)}</strong>
              </div>
            {/if}

            <hr class="hr" />
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .page-wide { width: 100%; max-width: 1400px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; }
  @media (max-width: 640px) { .page-wide { padding: 0 14px; } }
  .spacer { height: 16px; }

  .section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }

  .grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
  }
  @media (max-width: 960px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

  .field { display: grid; gap: 8px; }
  .input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.28);
    color: rgba(255, 255, 255, 0.92);
    outline: none;
  }

  .actions { display: flex; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap; }

  .list {
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.25);
  }

  .row { padding: 10px 0; }
  .row-top { display:flex; justify-content: space-between; align-items:center; gap: 10px; }
  .name { font-weight: 700; }
  .ol { margin: 10px 0 0 0; padding-left: 22px; }
  .hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 12px 0 0 0; }
</style>
