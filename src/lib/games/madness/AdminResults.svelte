<script>
  import { enhance } from '$app/forms';
  import UnpublishButton from '$lib/components/admin/UnpublishButton.svelte';

  export let data;

  const { event, results, entries, pickedTeams } = data;

  let seedSyncing = false;
  let seedSyncMsg = '';
  let publishSaving = false;
  let publishMsg = '';
  let toggleMsg = '';

  const ROUNDS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];

  const pickedIdsJson = JSON.stringify((pickedTeams || []).map((t) => String(t.id)));
  const eventPublishedAt = event?.results_published_at || null;

  const payload = results?.payload || null;
  const syncedSeeds = payload?.seeds || null;
  const seedsByTeamId = payload?.seedsByTeamId || null;
  const winsByTeamId = payload?.winsByTeamId || null;
  const eliminatedByTeamId = payload?.eliminatedByTeamId || {};

  function seedPrefill(id) {
    const key = String(id);

    if (seedsByTeamId && seedsByTeamId[key] != null) {
      const v = seedsByTeamId[key];
      const n = Number(v?.seed ?? v);
      if (Number.isFinite(n) && n > 0) return String(n);
    }

    if (syncedSeeds && syncedSeeds[key] != null) {
      const v = syncedSeeds[key];
      const n = Number(v?.seed ?? v);
      if (Number.isFinite(n) && n > 0) return String(n);
    }

    return '';
  }

  function winChecked(id, r) {
    const key = String(id);
    return Boolean(winsByTeamId?.[key]?.[r]);
  }

  function seedForTeamId(teamId, entry) {
    const key = String(teamId);

    const v1 = payload?.seedsByTeamId?.[key];
    const s1 = Number(v1?.seed ?? v1);
    if (Number.isFinite(s1) && s1 > 0) return s1;

    const v2 = payload?.seeds?.[key];
    const s2 = Number(v2?.seed ?? v2);
    if (Number.isFinite(s2) && s2 > 0) return s2;

    const snaps = entry?.payload?.teamSnapshots || [];
    const snap = snaps.find((t) => String(t?.id) === key);
    const s3 = Number(snap?.seed ?? null);
    if (Number.isFinite(s3) && s3 > 0) return s3;

    return null;
  }
</script>

<div class="page-wide">
  <div class="card">
    <div class="section-head"></div>

    <form
      method="POST"
      action="?/syncSeeds"
      use:enhance={() => {
        seedSyncing = true;
        seedSyncMsg = '';
        return async ({ result, update }) => {
          if (result.type === 'success') {
            await update({ reset: false });
            seedSyncMsg = 'Seeds synced ✅';
          } else if (result.type === 'failure') {
            seedSyncMsg = result.data?.error || 'Seed sync failed.';
          } else {
            seedSyncMsg = 'Seed sync failed.';
          }
          seedSyncing = false;
        };
      }}
    >
      <div class="field" style="margin-top: 12px;">
        <label class="muted" for="seedsJson">Optional manual seeds JSON</label>

        <textarea
          id="seedsJson"
          class="input"
          name="seedsJson"
          rows="6"
          placeholder={"Example: " + '{"52":{"seed":1,"region":"South"},"120":{"seed":12,"region":"East"}}'}
        ></textarea>
      </div>

      <div class="actions">
        <button class="btn btn--vip" type="submit" disabled={seedSyncing}>
          {seedSyncing ? 'Syncing…' : 'Sync Seeds'}
        </button>

        <div class="muted">
          {#if seedSyncMsg}
            {seedSyncMsg}
          {/if}
        </div>
      </div>
    </form>
  </div>

  <div class="spacer"></div>

  <div class="card">
    <div class="section-head">
      <h2 class="h2">Publish Results + Recompute</h2>
      <span class="pill">{pickedTeams?.length || 0} picked teams</span>
    </div>

    {#if !pickedTeams?.length}
      <p class="subtle" style="margin-top:10px;">No teams have been picked yet — nothing to publish.</p>
    {:else}
      <form
        method="POST"
        action="?/publish"
        use:enhance={() => {
          publishSaving = true;
          publishMsg = '';
          return async ({ result, update }) => {
            if (result.type === 'success') {
              await update({ reset: false });
              publishMsg = 'Published ✅ (scores recomputed)';
            } else if (result.type === 'failure') {
              publishMsg = result.data?.error || 'Publish failed.';
            } else {
              publishMsg = 'Publish failed.';
            }
            publishSaving = false;
          };
        }}
      >
        <input type="hidden" name="pickedTeamIds" value={pickedIdsJson} />

        <div class="tablewrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Team</th>
                <th style="width:110px;">Seed</th>
                {#each ROUNDS as r (r)}
                  <th>{r.toUpperCase()}</th>
                {/each}
                <th style="width:160px;">Quick status</th>
              </tr>
            </thead>
            <tbody>
              {#each pickedTeams as t (String(t.id))}
                <tr>
                  <td>
                    <div class="teamcell">
                      {#if t.logo}
                        <img class="logo" src={t.logo} alt="" loading="lazy" />
                      {/if}
                      <div>
                        <div class="teamname">{t.name || t.id}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <input
                      class="seed"
                      type="number"
                      min="1"
                      max="16"
                      name={"seed_" + t.id}
                      value={seedPrefill(t.id)}
                      required
                    />
                  </td>

                  {#each ROUNDS as r (r)}
                    <td style="text-align:center;">
                      <input
                        type="checkbox"
                        name={"win_" + t.id + "_" + r}
                        checked={winChecked(t.id, r)}
                      />
                    </td>
                  {/each}

                  <td>
                    <div class="status-cell">
                      <span class={eliminatedByTeamId?.[String(t.id)] ? 'pill pill--red' : 'pill pill--green'}>
                        {eliminatedByTeamId?.[String(t.id)] ? 'Out' : 'Alive'}
                      </span>

                      <form
                        method="POST"
                        action="?/toggleEliminated"
                        use:enhance={() => {
                          toggleMsg = '';
                          return async ({ result, update }) => {
                            if (result.type === 'success') {
                              await update({ reset: false });
                              toggleMsg = 'Team status updated ✅';
                            } else if (result.type === 'failure') {
                              toggleMsg = result.data?.error || 'Status update failed.';
                            } else {
                              toggleMsg = 'Status update failed.';
                            }
                          };
                        }}
                      >
                        <input type="hidden" name="teamId" value={String(t.id)} />
                        <input type="hidden" name="nextState" value={eliminatedByTeamId?.[String(t.id)] ? 'alive' : 'out'} />
                        <button
                          type="submit"
                          class={eliminatedByTeamId?.[String(t.id)] ? 'btn btn--ghost btn--tiny' : 'btn btn--danger btn--tiny'}
                        >
                          {eliminatedByTeamId?.[String(t.id)] ? 'Restore' : 'Eliminate'}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <div class="actions">
          <button class="btn btn--vip" type="submit" disabled={publishSaving}>
            {publishSaving ? 'Publishing…' : 'Publish results + recompute'}
          </button>

          <div class="muted">
            {#if publishMsg}
              {publishMsg}
            {/if}
            {#if toggleMsg}
              <div>{toggleMsg}</div>
            {/if}
          </div>
        </div>
      </form>
    {/if}
  </div>

  <div style="margin-top: 18px;">
    <div class="section-head">
      <h3 class="h3">Danger Zone</h3>
      <div class="muted">Unpublishing removes all computed scores for this event.</div>
    </div>

    <div class="actions" style="margin-top: 10px;">
      <UnpublishButton publishedAt={eventPublishedAt} />
    </div>
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
        {#each entries as e (String(e.id))}
          <div class="row">
            <div class="row-top">
              <div class="name">{e.display_name}</div>
              {#if e.score}
                <span class="pill pill--gold">{e.score.score_total} pts</span>
              {/if}
            </div>

            {#if e?.payload?.teamSnapshots?.length}
              <div class="chips">
                {#each e.payload.teamSnapshots as s (String(s?.id))}
                  {@const tid = String(s?.id ?? '')}
                  {@const seed = seedForTeamId(tid, e)}
                  <span class="chip">
                    {#if seed}
                      <span class="chip-seed" aria-label={"Seed " + seed}>{seed}</span>
                    {/if}
                    <span>{s?.abbrev || s?.name || s?.id}</span>
                  </span>
                {/each}
              </div>
            {:else if e?.payload?.teamIds?.length}
              <div class="chips">
                {#each e.payload.teamIds as id (String(id))}
                  {@const tid = String(id)}
                  {@const seed = seedForTeamId(tid, e)}
                  <span class="chip">
                    {#if seed}
                      <span class="chip-seed" aria-label={"Seed " + seed}>{seed}</span>
                    {/if}
                    <span>{tid}</span>
                  </span>
                {/each}
              </div>
            {:else}
              <div class="muted">No teams picked.</div>
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
  .hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 12px 0 0 0; }

  .chips { display:flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .chip {
    display:inline-flex;
    align-items:center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.25);
    font-size: 0.9rem;
  }

  .chip-seed {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    font-weight: 900;
    font-size: 0.85rem;
    line-height: 1;
    border: 1px solid rgba(212, 175, 55, 0.35);
    background: rgba(212, 175, 55, 0.14);
    color: rgba(255, 255, 255, 0.92);
    flex: 0 0 auto;
  }

  .tablewrap {
    margin-top: 14px;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(0,0,0,0.22);
  }
  .tbl { width: 100%; border-collapse: collapse; min-width: 980px; }
  .tbl th, .tbl td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    vertical-align: middle;
  }
  .tbl th { text-align: left; font-size: 0.9rem; opacity: 0.8; }
  .teamcell { display:flex; align-items:center; gap: 10px; }
  .logo { width: 26px; height: 26px; border-radius: 8px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.10); }
  .teamname { font-weight: 700; line-height: 1.1; }

  .seed {
    width: 90px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(0,0,0,0.28);
    color: rgba(255,255,255,0.92);
    outline: none;
  }

  .status-cell {
    display: grid;
    gap: 8px;
    justify-items: start;
  }

  .btn--tiny {
    min-height: 32px;
    padding: 6px 10px;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 900;
  }

  .btn--danger {
    border: 1px solid rgba(255,120,120,0.28);
    background: rgba(255,120,120,0.08);
    color: rgba(255,235,235,0.98);
  }

  .btn--danger:hover {
    background: rgba(255,120,120,0.12);
  }
</style>
