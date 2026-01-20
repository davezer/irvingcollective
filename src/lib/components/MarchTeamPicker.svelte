<script>
  export let options = [];
  export let locked = false;
  export let max = 4;

  // bind this from parent
  export let value = []; // array of option objects: {id,name,abbrev,logo}

  let q = '';

  $: qLower = q.trim().toLowerCase();

  $: selectedIdSet = new Set((value || []).map((x) => String(x.id)));

  $: filtered =
    qLower.length === 0
      ? options
      : options.filter((o) => {
          const hay = `${o.name || ''} ${o.abbrev || ''}`.toLowerCase();
          return hay.includes(qLower);
        });

  function add(opt) {
    if (locked) return;
    const id = String(opt.id);
    if (selectedIdSet.has(id)) return;
    if (value.length >= max) return;
    value = [...value, opt];
  }

  function remove(id) {
    if (locked) return;
    value = value.filter((x) => String(x.id) !== String(id));
  }
</script>

<div class="mm-grid">
  <div class="panel">
    <div class="head">
      <div>
        <div class="kicker">Available</div>
        <h3 class="h3">Teams</h3>
      </div>
      <span class="pill">{options.length} total</span>
    </div>

    <input
      class="input"
      placeholder="Search teams…"
      bind:value={q}
      disabled={locked}
      style="margin-top: 10px;"
    />

    <div class="list" style="margin-top: 10px;">
      {#each filtered as opt (opt.id)}
        <div class="row">
          <div class="left">
            {#if opt.logo}
              <img class="logo" src={opt.logo} alt="" loading="lazy" />
            {/if}
            <div class="names">
              <div class="name">{opt.name}</div>
              {#if opt.abbrev}<div class="muted">{opt.abbrev}</div>{/if}
            </div>
          </div>

          <button
            class="btn btn--ghost"
            type="button"
            on:click={() => add(opt)}
            disabled={locked || selectedIdSet.has(String(opt.id)) || value.length >= max}
            title={value.length >= max ? `Pick only ${max}` : 'Add'}
          >
            +
          </button>
        </div>
      {/each}
    </div>
  </div>

  <div class="panel">
    <div class="head">
      <div>
        <div class="kicker">Your entry</div>
        <h3 class="h3">Your 4 Teams</h3>
      </div>
      <span class="pill">{value.length}/{max}</span>
    </div>

    <p class="subtle" style="margin-top: 6px;">
      You score every time one of your teams wins.
    </p>

    <div class="list" style="margin-top: 10px;">
      {#if value.length === 0}
        <div class="muted">Pick 4 teams to submit.</div>
      {:else}
        {#each value as opt (opt.id)}
          <div class="row">
            <div class="left">
              {#if opt.logo}
                <img class="logo" src={opt.logo} alt="" loading="lazy" />
              {/if}
              <div class="names">
                <div class="name">{opt.name}</div>
                {#if opt.abbrev}<div class="muted">{opt.abbrev}</div>{/if}
              </div>
            </div>

            <button
              class="btn btn--ghost"
              type="button"
              on:click={() => remove(opt.id)}
              disabled={locked}
              title="Remove"
            >
              –
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <div class="slotline">
      <slot name="actions" />
    </div>

    <div class="muted" style="margin-top: 10px;">
      <slot name="statusLine" />
    </div>
  </div>
</div>

<style>
  .mm-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 980px) {
    .mm-grid {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 14px;
    background: rgba(10, 12, 18, 0.35);
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    flex-wrap: wrap;
  }

  .list {
    max-height: 420px;
    overflow: auto;
    padding-right: 6px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .logo {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    object-fit: cover;
    background: rgba(255, 255, 255, 0.06);
  }

  .names {
    min-width: 0;
  }

  .name {
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .slotline {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
  }
</style>
