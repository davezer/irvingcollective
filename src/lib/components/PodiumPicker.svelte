<script>
  export let options = []; // [{ id, name, carNumber? }]
  export let value = [];   // bind:value (selected podium items)
  export let locked = false;
  export let max = 10;

  let query = '';

  $: selectedIds = new Set((value ?? []).map((x) => x.id));
  $: available = (options ?? []).filter((x) => !selectedIds.has(x.id));

  $: filteredAvailable = available.filter((x) =>
    x.name.toLowerCase().includes(query.toLowerCase())
  );

  // Keep render snappy when not searching
  $: renderAvailable = query ? filteredAvailable : filteredAvailable.slice(0, 80);

  function add(item) {
    if (locked) return;
    if (!item) return;
    if (value.some((x) => x.id === item.id)) return;
    if (value.length >= max) return;

    value = [...value, item];
  }

  function remove(id) {
    if (locked) return;
    value = value.filter((x) => x.id !== id);
  }

  function moveUp(idx) {
    if (locked) return;
    if (idx <= 0) return;
    const next = value.slice();
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    value = next;
  }

  function moveDown(idx) {
    if (locked) return;
    if (idx >= value.length - 1) return;
    const next = value.slice();
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    value = next;
  }

  // Optional: quick clear (nice for testing)
  function clearAll() {
    if (locked) return;
    value = [];
  }
</script>

<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
  <!-- AVAILABLE -->
  <div class="card">
    <h3>Available</h3>

    <input
      placeholder="Search..."
      bind:value={query}
      disabled={locked}
      style="width:100%; margin: 8px 0;"
    />

    <div style="border: 1px solid #ddd; border-radius: 6px; overflow:hidden;">
      {#if renderAvailable.length === 0}
        <div style="opacity:.6; padding: 12px;">
          {#if query}
            No matches.
          {:else}
            No available drivers.
          {/if}
        </div>
      {:else}
        {#each renderAvailable as item (item.id)}
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px; padding:10px; border-bottom:1px solid #eee;">
            <div style="min-width:0;">
              <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                {item.name}
                {#if item.carNumber}
                  <span style="opacity:.6;"> #{item.carNumber}</span>
                {/if}
              </div>
            </div>

            <button
              type="button"
              on:click={() => add(item)}
              disabled={locked || value.length >= max}
              title="Add"
              style="min-width: 34px;"
            >
              +
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <div style="opacity:.7; margin-top:8px;">
      {#if !query && filteredAvailable.length > renderAvailable.length}
        Showing {renderAvailable.length} of {filteredAvailable.length}. Search to see more.
      {/if}
    </div>
  </div>

  <!-- PODIUM -->
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3 style="margin:0;">Top {max} Podium</h3>
      <button type="button" on:click={clearAll} disabled={locked || value.length === 0} title="Clear all">
        Clear
      </button>
    </div>

    <div style="opacity:.7; margin-top:6px;">Use ↑ / ↓ to reorder. Click ✕ to remove.</div>

    <div style="margin-top:10px; border: 1px solid #ddd; border-radius: 6px; overflow:hidden;">
      {#if value.length === 0}
        <div style="opacity:.6; padding: 12px;">Pick {max} drivers from the left.</div>
      {:else}
        {#each value as item, idx (item.id)}
          <div style="display:flex; justify-content:space-between; align-items:center; gap: 10px; padding:10px; border-bottom:1px solid #eee;">
            <div style="min-width:0;">
              <strong>{idx + 1}.</strong>
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                {item.name}
              </span>
            </div>

            <div style="display:flex; gap:6px; align-items:center;">
              <button type="button" on:click={() => moveUp(idx)} disabled={locked || idx === 0} title="Move up">
                ↑
              </button>
              <button type="button" on:click={() => moveDown(idx)} disabled={locked || idx === value.length - 1} title="Move down">
                ↓
              </button>
              <button type="button" on:click={() => remove(item.id)} disabled={locked} title="Remove">
                ✕
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <div style="margin-top: 10px;">Selected: {value.length}/{max}</div>
  </div>
</div>
