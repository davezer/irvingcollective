<script>
  import { enhance } from '$app/forms';
  import MarchTeamPicker from '$lib/components/MarchTeamPicker.svelte';
  import RoundTracker from './RoundTracker.svelte';
  import { MADNESS_RULES } from './rules.js';
  import GameRules from '$lib/components/GameRules.svelte';
  import SectionHead from '$lib/ui/SectionHeader.svelte';

  export let event;
  export let locked = false;
  export let entry = null;
  export let results;

  // options + load state from parent route
  export let options = [];
  export let loading = false;
  export let loadError = '';
  export let onRetryOptions = () => {};

  // March selections
  let picks = [];

  // Derived payload
  $: ids = picks.map((x) => String(x.id));
  $: idsJson = JSON.stringify(ids);
  $: snapshotsJson = JSON.stringify(
    picks.map((x) => ({
      id: String(x.id),
      name: x?.name ? String(x.name) : null,
      abbrev: x?.abbrev ? String(x.abbrev) : null,
      logo: x?.logo ? String(x.logo) : null
    }))
  );

  // Save UX
  let saving = false;
  let saveError = '';
  let savedPulse = false;

  // Dirty tracking
  let lastSavedIds = [];
  $: dirty = !locked && JSON.stringify(ids) !== JSON.stringify(lastSavedIds);

  // Hydration
  let hydratedEntryRowId = null;
  let pendingIds = [];

  $: if (entry?.id && entry.id !== hydratedEntryRowId) {
    hydratedEntryRowId = entry.id;

    const serverIds = (entry?.payload?.teamIds || []).map(String).slice(0, 4);
    lastSavedIds = serverIds;

    // resolve after options arrive
    pendingIds = serverIds;
    if (options.length) {
      const map = new Map(options.map((o) => [String(o.id), o]));
      picks = pendingIds.map((id) => map.get(id)).filter(Boolean).slice(0, 4);
      pendingIds = [];
    }
  }

  $: if (pendingIds.length && options.length) {
    const map = new Map(options.map((o) => [String(o.id), o]));
    picks = pendingIds.map((id) => map.get(id)).filter(Boolean).slice(0, 4);
    pendingIds = [];
  }

  $: resultsPayload = results?.payload || null;
  $: selectedTeams =
  (entry?.payload?.teamSnapshots?.length ? entry.payload.teamSnapshots : picks).map((t) => ({
    id: String(t.id),
    name: t.name,
    abbr: t.abbrev ?? t.abbr ?? '',
    logoUrl: t.logo ?? t.logoUrl ?? ''
  }));
</script>
{#if locked}
  <div class="card">
    <div class="section-head">
      <h2 class="h2">Finalized Entry</h2>
      <span class="pill pill--red">No edits</span>
    </div>

    {#if entry?.payload?.teamIds?.length}
      <p class="subtle" style="margin-top: 6px;">
        Your 4 teams are locked in.
      </p>

      <div class="list">
        {#if entry?.payload?.teamSnapshots?.length}
          <ol>
            {#each entry.payload.teamSnapshots as row}
              <li>
                <strong>{row?.name || row?.id}</strong>
                {#if row?.abbrev}
                  <span class="muted" style="margin-left: 8px;">({row.abbrev})</span>
                {/if}
              </li>
            {/each}
          </ol>
        {:else}
          <ol>
            {#each entry.payload.teamIds as id}
              <li><span class="muted">{id}</span></li>
            {/each}
          </ol>
        {/if}
      </div>
    {:else}
      <p class="subtle" style="margin-top: 10px;">You didn’t submit an entry for this event.</p>
    {/if}
  </div>

{:else if loading}
  <div class="card">
    <div class="section-head">
      <h2 class="h2">Loading</h2>
      <span class="pill">Please wait</span>
    </div>
    <p class="subtle" style="margin-top: 10px;">Fetching teams…</p>
  </div>

{:else if loadError}
  <div class="card">
    <div class="section-head">
      <h2 class="h2">Couldn’t load options</h2>
      <span class="pill pill--red">Error</span>
    </div>

    <p class="subtle" style="margin-top: 10px;">
      <strong class="muted">Details:</strong> {loadError}
    </p>

    <div class="actions">
      <button class="btn" type="button" on:click={onRetryOptions}>Try again</button>
    </div>
  </div>

{:else}
  <form
    method="POST"
    action="?/save"
    use:enhance={() => {
      saving = true;
      saveError = '';
      savedPulse = false;

      const savedIdsNow = [...ids];

      return async ({ result, update }) => {
        if (result.type === 'success') {
          await update({ reset: false });
          hydratedEntryRowId = null;

          lastSavedIds = savedIdsNow;

          savedPulse = true;
          setTimeout(() => (savedPulse = false), 1200);
        } else if (result.type === 'failure') {
          saveError = result.data?.message || 'Could not save entry.';
        } else {
          saveError = 'Something went wrong saving your entry.';
        }
        saving = false;
      };
    }}
  >
    <div class="page-wide">
      <div class="card">
        <div class="section-head section-head--stack">
          <h2 class="h2">Your March Entry</h2>

          <div class="section-head__row">
            <div class="rules-wrap">
              <SectionHead rules={MADNESS_RULES} />
            </div>

            <span class="pill pill--tight">{picks.length}/4</span>
          </div>
        </div>

        <p class="subtle" style="margin-top: 10px;">
          Pick 4 teams. You score points every time one of them wins.
        </p>

        <div class="spacer-sm"></div>

        <MarchTeamPicker {options} bind:value={picks} {locked} max={4}>
          <button
            slot="actions"
            class="btn btn--vip"
            type="submit"
            disabled={locked || saving || picks.length !== 4 || !dirty}
            title={locked
              ? 'Event is locked'
              : picks.length !== 4
                ? 'Pick exactly 4'
                : !dirty
                  ? 'No changes'
                  : 'Save'}
          >
            {saving ? 'Saving…' : dirty ? (lastSavedIds.length ? 'Update entry' : 'Save entry') : 'Saved'}
          </button>

          <div slot="statusLine">
            {#if saveError}
              <span style="color: rgba(255,120,120,0.95);">{saveError}</span>
            {:else if saving}
              Saving your teams…
            {:else if savedPulse || (!dirty && picks.length === 4)}
              Saved.
            {:else if picks.length !== 4}
              Pick exactly 4 to submit.
            {:else}
              Make changes, then save.
            {/if}
          </div>
          
        </MarchTeamPicker>

        <input type="hidden" name="teamIds" value={idsJson} />
        <input type="hidden" name="teamSnapshots" value={snapshotsJson} />
        <RoundTracker {selectedTeams} {resultsPayload} />
        
      </div>
    </div>
  </form>
{/if}

<style>
  .spacer-sm { height: 10px; }
  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    flex-wrap: wrap;
  }
  .list {
    margin-top: 12px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.25);
  }
  ol { margin: 0; padding-left: 22px; }
  li { margin: 6px 0; }

  .page-wide {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 24px;
    box-sizing: border-box;
  }
  @media (max-width: 640px) {
    .page-wide { padding: 0 14px; }
  }
.sectionHead {
  flex-wrap: wrap;
  justify-self: left;
  padding-bottom: 2px;
}

/* --- Madness mobile header fix --- */
.section-head--stack{
  display: grid;
  gap: 10px;
  align-items: start;
}

.section-head__row{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: nowrap;
}

/* prevent the Rules button from doing weird flex things */
.rules-wrap{
  display: flex;
  align-items: center;
  min-width: 0;
}

/* tighten the count pill so it doesn't look like a giant floating bubble */
.pill--tight{
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.85rem;
  white-space: nowrap;
}

/* On really small screens, keep row but allow it to wrap cleanly */
@media (max-width: 420px){
  .section-head__row{
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .pill--tight{
    margin-left: auto;
  }
}

/* your current .sectionHead was fighting layout; make it neutral */
.sectionHead{
  padding: 0;
  flex: 0 0 auto;
}
/* The panel/card that contains the list */

</style>
