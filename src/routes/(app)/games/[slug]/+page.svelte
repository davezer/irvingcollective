<script>
  import { enhance } from '$app/forms';
  import PodiumPicker from '$lib/components/PodiumPicker.svelte';

  let optionsMode = '';
  let optionsNote = '';

  export let data;
  const { event, locked, entry } = data;

  let loading = true;
  let loadError = '';
  let options = [];

  // Selected picks (objects)
  let top10 = [];

  // Initialize from saved payload (top10Ids)
  function applySaved(entryPayload) {
    if (!entryPayload?.top10Ids || !Array.isArray(entryPayload.top10Ids)) return;
    const ids = new Set(entryPayload.top10Ids.map(String));
    top10 = [];
    pendingIds = [...ids];
  }

  let pendingIds = [];
  applySaved(entry?.payload);

  async function fetchOptions() {
    loading = true;
    loadError = '';
    try {
      const res = await fetch(`/api/events/${event.slug}/options`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to load options (${res.status})`);
      }

      const body = await res.json();
      options = body.options || [];

      optionsMode = body.mode || '';
      optionsNote = body.note || '';

      // Resolve saved IDs to option objects once options load
      if (pendingIds.length) {
        const map = new Map(options.map((o) => [String(o.id), o]));
        top10 = pendingIds.map((id) => map.get(String(id))).filter(Boolean).slice(0, 10);
        pendingIds = [];
      }
    } catch (e) {
      loadError = e?.message || 'Failed to load drivers';
    } finally {
      loading = false;
    }
  }

  // On mount: fetch options for Daytona
  if (event?.type === 'daytona') {
    fetchOptions();
  }

  // Hidden input payload to submit
  $: top10IdsJson = JSON.stringify(top10.map((x) => String(x.id)));

  // UI helpers
  $: lockLabel = new Date(Number(event.lock_at) * 1000).toLocaleString();
  $: statusPillClass = locked ? 'pill pill--red' : 'pill pill--green';
  $: statusText = locked ? 'Locked' : 'Open';
</script>

<!-- HERO / EVENT HEADER -->
<div class="card card--glow">
  <div class="kicker">Event</div>
  <h1 class="h1">{event.name}</h1>

  <div class="meta-row">
    <span class="pill pill--gold">Locks: {lockLabel}</span>
    <span class={statusPillClass}>{statusText}</span>

    {#if event?.type}
      <span class="pill">Type: {event.type}</span>
    {/if}
  </div>

  {#if optionsMode}
    <div class="debug">
      <div class="muted">Options mode: {optionsMode}</div>
      {#if optionsNote}
        <div class="muted">{optionsNote}</div>
      {/if}
    </div>
  {/if}
</div>

<div class="spacer"></div>

<!-- BODY -->
{#if locked}
  <div class="card">
    <div class="section-head">
      <h2 class="h2">Finalized Entry</h2>
      <span class="pill pill--red">No edits</span>
    </div>

    {#if entry?.payload?.top10Ids?.length}
      <p class="subtle" style="margin-top: 6px;">
        Your picks are locked in. Once we add snapshots, this will show driver names + car numbers.
      </p>

      <div class="list">
        <ol>
          {#each entry.payload.top10Ids as id}
            <li><span class="muted">{id}</span></li>
          {/each}
        </ol>
      </div>

      <div class="muted" style="margin-top: 10px;">
        (Next PR: store/display option snapshots so we render names here.)
      </div>
    {:else}
      <p class="subtle" style="margin-top: 10px;">You didn’t submit an entry for this event.</p>
    {/if}
  </div>
{:else}
  {#if event.type !== 'daytona'}
    <div class="card">
      <div class="section-head">
        <h2 class="h2">Coming Soon</h2>
        <span class="pill">Not wired</span>
      </div>
      <p class="subtle" style="margin-top: 10px;">This event type isn’t wired yet.</p>
    </div>
  {:else}
    {#if loading}
      <div class="card">
        <div class="section-head">
          <h2 class="h2">Loading</h2>
          <span class="pill">Please wait</span>
        </div>
        <p class="subtle" style="margin-top: 10px;">Fetching the driver pool…</p>
      </div>
    {:else if loadError}
      <div class="card">
        <div class="section-head">
          <h2 class="h2">Couldn’t load drivers</h2>
          <span class="pill pill--red">Error</span>
        </div>

        <p class="subtle" style="margin-top: 10px;">
          <strong class="muted">Details:</strong> {loadError}
        </p>

        <div class="actions">
          <button class="btn" type="button" on:click={fetchOptions}>Try again</button>
        </div>
      </div>
    {:else}
      <form method="POST" action="?/save" use:enhance>
        <div class="card">
          <div class="section-head">
            <h2 class="h2">Your Daytona Entry</h2>
            <span class="pill pill--gold">{top10.length}/{10} selected</span>
          </div>

          <p class="subtle" style="margin-top: 10px;">
            Choose your top 10 finishers. Order matters. Make it look like you know ball.
          </p>

          <div class="spacer-sm"></div>

          <PodiumPicker {options} bind:value={top10} {locked} max={10} />

          <input type="hidden" name="top10Ids" value={top10IdsJson} />

          <div class="actions">
            <button class="btn" type="submit" disabled={locked || top10.length !== 10}>
              Save entry
            </button>

            {#if top10.length !== 10}
              <span class="muted">Pick exactly 10 to submit.</span>
            {:else}
              <span class="muted">Locked at submission time.</span>
            {/if}
          </div>
        </div>
      </form>
    {/if}
  {/if}
{/if}

<style>
  .spacer { height: 16px; }
  .spacer-sm { height: 10px; }

  .meta-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    margin-top: 14px;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
  }

  .debug {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: grid;
    gap: 6px;
  }

  .list {
    margin-top: 12px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.25);
  }

  ol {
    margin: 0;
    padding-left: 22px;
  }

  li {
    margin: 6px 0;
  }
</style>
