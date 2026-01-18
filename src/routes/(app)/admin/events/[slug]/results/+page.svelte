<script>
  export let data;

  // For Daytona you probably want driver names; simplest v1 is IDs.
  // If you want, we can reuse your /api/events/:slug/options endpoint and build a nice selector UI.
  let pos = Array.from({ length: 10 }, (_, i) => data.results?.payload?.officialTop10Ids?.[i] ?? "");
  let chaosCarId = data.results?.payload?.chaosCarId ?? "";
</script>

<h1 class="page-title">Results: {data.event.name}</h1>

<div class="card">
  <form method="POST">
    <input type="hidden" name="/admin/events/[slug]/results" value="1" />

    <div class="grid">
      {#each pos as v, idx}
        <label class="field">
          <span>Position {idx + 1}</span>
          <input name={`pos${idx + 1}`} bind:value={pos[idx]} placeholder="driver id" />
        </label>
      {/each}

      <label class="field">
        <span>Chaos Car</span>
        <input name="chaosCarId" bind:value={chaosCarId} placeholder="driver id" />
      </label>
    </div>

    <button class="btn btn--vip" formaction="?/publish">Publish + Recompute</button>
  </form>

  {#if data.results?.payload}
    <p class="muted">Existing results are loaded above (edit and re-publish to recompute).</p>
  {/if}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .field span {
    display: block;
    font-size: 0.9rem;
    margin-bottom: 6px;
    opacity: 0.85;
  }
  .field input {
    width: 100%;
  }
</style>
