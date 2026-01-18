<script>
	import { onMount } from 'svelte';
  import { scoreDaytonaEntry } from '$lib/scoring/daytona.js';
  import { enhance } from '$app/forms';

let publishing = false;
let publishError = '';
let publishPulse = false;

	export let data;
  const getTotals = (scored) => scored?.breakdown?.totals || null;
	// Dropdown options (driver pool)
	let options = [];
	let optionsLoading = true;
	let optionsError = '';
	let optionsMode = '';
	let optionsNote = '';

	// Existing results → initial values
	let posIds = Array.from(
		{ length: 10 },
		(_, i) => data.results?.payload?.officialTop10Ids?.[i] ?? ''
	);
	let chaosCarId = data.results?.payload?.chaosCarId ?? '';

	const getCarNumber = (o) =>
  o?.carNumber ?? o?.car_number ?? o?.carNo ?? o?.number ?? o?.vehicleNumber ?? null;

const labelFor = (o) => {
  const num = o.carNumber ? `#${o.carNumber} ` : '';
  return `${num}${o.name}`.trim();
};

function getPreview(userId) {
  return previewByUserId?.get(userId) || null;
}

function getShownScore(e) {
  // Prefer live preview score; fallback to stored score
  return getPreview(e.user_id) || e.score || null;
}

function getTotalsFrom(e) {
  return getShownScore(e)?.breakdown?.totals || null;
}

function isPodiumExacta(e) {
  return Boolean(getPreview(e.user_id)?.breakdown?.podiumExacta);
}

function chaosHitPos(e) {
  const ch = getPreview(e.user_id)?.breakdown?.chaos;
  return ch?.inTop10 ? ch.finishPos : null;
}

function previewFor(userId) {
  return previewByUserId?.get(userId) || null;
}
function shownFor(e) {
  return previewFor(e.user_id) || e.score || null;
}
function totalsFor(e) {
  return shownFor(e)?.breakdown?.totals || null;
}

// --- LIVE PREVIEW SCORING ---

$: previewReady = (() => {
  const ids = posIds.map((x) => String(x || '')).filter(Boolean);
  if (ids.length !== 10) return false;
  const uniq = new Set(ids);
  return uniq.size === 10;
})();

$: previewResultsPayload = previewReady
  ? { officialTop10Ids: posIds.map((x) => String(x)) }
  : null;

// Map user_id -> {score_total, breakdown}
$: previewByUserId = (() => {
  if (!previewResultsPayload) return new Map();

  const m = new Map();
  for (const e of (data.entries || [])) {
    const entryPayload = e?.payload || {};
    const scored = scoreDaytonaEntry({
      entryPayload,
      resultsPayload: previewResultsPayload
    });
    m.set(e.user_id, scored);
  }
  return m;
})();


	// Card renderer helper you already use lower on the page
	const formatDriver = (d) => {
		if (!d) return '—';
		const num = d.carNumber ? `#${d.carNumber} ` : '';
		const name = d.name || d.id;
		return `${num}${name}`.trim();
	};

	// Derived sets for uniqueness + chaos filtering
	$: selectedTop10 = new Set(posIds.map((v) => String(v || '')).filter(Boolean));

$: posOptionLists = posIds.map((v, idx) => {
  const current = String(v || '');

  const used = new Set(
    posIds
      .map((vv, i) => (i === idx ? '' : String(vv || '')))
      .filter(Boolean)
  );

  // If nothing is picked elsewhere, return full list
  if (used.size === 0) return options;

  return options.filter((o) => {
    const id = String(o.id);
    return id === current || !used.has(id);
  });
});

// Chaos options exclude top10 (but keep current if already selected)
$: chaosOptionList = options.filter((o) => {
  const id = String(o.id);
  const current = String(chaosCarId || '');
  return id === current || !selectedTop10.has(id);
});

	// Guard: if chaos becomes part of top10, clear it
	$: if (chaosCarId && selectedTop10.has(String(chaosCarId))) {
		chaosCarId = '';
	}

	async function fetchOptions() {
		optionsLoading = true;
		optionsError = '';
		optionsMode = '';
		optionsNote = '';
		try {
			const res = await fetch(`/api/events/${data.event.slug}/options`);
			const body = await res.json().catch(() => ({}));

			if (!res.ok) {
				optionsError = body?.error || `Failed to load options (${res.status})`;
				options = [];
				return;
			}

			options = body.options || [];
			optionsMode = body.mode || '';
			optionsNote = body.note || '';
		} catch (e) {
			optionsError = e?.message || 'Failed to load options';
			options = [];
		} finally {
			optionsLoading = false;
		}
	}

	onMount(() => {
		if (data.event?.type === 'daytona') fetchOptions();
		else optionsLoading = false;
	});
</script>

<h1 class="page-title">Results: {data.event.name}</h1>

<div class="card">
	<form
		method="POST"
		use:enhance={() => {
			publishing = true;
			publishError = '';
			publishPulse = false;

			return async ({ result, update }) => {
			publishing = false;

			if (result.type === 'success') {
				await update({ reset: false });
				publishPulse = true;
				setTimeout(() => (publishPulse = false), 1200);
			} else if (result.type === 'failure') {
				publishError = result.data?.error || result.data?.message || 'Publish failed.';
			} else {
				publishError = 'Something went wrong publishing results.';
			}
			};
		}}
		>
		{#if optionsMode || optionsNote}
			<div class="muted" style="margin-bottom: 10px;">
				{#if optionsMode}Options mode: <strong>{optionsMode}</strong>{/if}
				{#if optionsNote}<div>{optionsNote}</div>{/if}
			</div>
		{/if}
		{#if optionsLoading}
			<div class="muted" style="margin-bottom: 10px;">Loading driver pool…</div>
		{:else if optionsError}
			<div class="muted" style="margin-bottom: 10px; color: rgba(255,120,120,0.95);">
				{optionsError}
				<div style="margin-top: 8px;">
					<button class="btn" type="button" on:click={fetchOptions}>Try again</button>
				</div>
			</div>
			
		{/if}
		

		<div class="grid">
			{#each posIds as _, idx}
				<label class="field">
					<span>Position {idx + 1}</span>
					<select
            class="input"
            name={`pos${idx + 1}`}
            value={posIds[idx]}
            on:change={(e) => {
              posIds[idx] = e.currentTarget.value;
              posIds = [...posIds]; // ✅ force reactive update
            }}
          >
						<option value="">— select driver —</option>
						{#each posOptionLists[idx] as opt}
							<option value={String(opt.id)}>{labelFor(opt)}</option>
						{/each}
					</select>
				</label>
			{/each}

		</div>
    {#if !previewReady}
      <div class="muted" style="margin-top: 8px;">
        Live preview will appear once you select 10 unique finishers.
      </div>
    {/if}

		<button class="btn btn--vip" formaction="?/publish" disabled={publishing}>
			{publishing ? 'Publishing…' : 'Publish + Recompute'}
		</button>
		{#if publishError}
			<div class="muted" style="margin-top: 10px; color: rgba(255,120,120,0.95);">
				{publishError}
			</div>
			{:else if publishPulse}
			<div class="muted" style="margin-top: 10px;">Published + recomputed.</div>
			{/if}
	</form>

	{#if data.results?.payload}
		<p class="muted" style="margin-top: 10px;">
			Existing results are loaded above (edit and re-publish to recompute).
		</p>
	{/if}
</div>

<!-- ✅ Entries list -->
<h2 class="section-title">Submitted Entries ({data.entries?.length ?? 0})</h2>

{#if !data.entries || data.entries.length === 0}
  <div class="card">
    <p class="muted">No entries yet for this event.</p>
  </div>
{:else}
  <div class="entry-grid">
    {#each data.entries as e}
      <div class="card entry-card">
        <!-- HEADER -->
        <div class="entry-header">
          <div class="entry-header-left">
            <div class="entry-topline">
              <div class="entry-name">{e.display_name}</div>

              {#if previewByUserId?.get(e.user_id)}
                {@const p = previewByUserId.get(e.user_id)}
                <div class="score-pill score-pill--live">
                  <span class="score-label">Preview</span>
                  <span class="score-value">{p.score_total}</span>
                </div>
              {:else if e.score}
                <div class="score-pill">
                  <span class="score-label">Score</span>
                  <span class="score-value">{e.score.score_total}</span>
                </div>
              {:else}
                <div class="score-pill score-pill--pending">
                  <span class="score-label">Score</span>
                  <span class="score-value">—</span>
                </div>
              {/if}
            </div>

            <div class="entry-meta muted">
              Updated: {new Date((e.updated_at || e.submitted_at) * 1000).toLocaleString()}
            </div>
          </div>
        </div>

        <!-- BREAKDOWN CHIPS -->
        {#if true}
          {@const preview = previewByUserId?.get(e.user_id) || null}
          {@const shown = preview || e.score || null}
          {@const totals = shown?.breakdown?.totals || null}

          {#if totals}
            <div class="breakdown-row">
              <div class={"bd-chip " + (preview ? "bd-chip--live" : "")}>
                <span class="bd-k">Exact</span>
                <span class="bd-v">{totals.exact ?? 0}</span>
              </div>

              <div class={"bd-chip " + (preview ? "bd-chip--live" : "")}>
                <span class="bd-k">Bonus</span>
                <span class="bd-v">{totals.bonus ?? 0}</span>
              </div>

              <div class={"bd-chip " + (preview ? "bd-chip--live" : "")}>
                <span class="bd-k">Chaos</span>
                <span class="bd-v">{totals.chaos ?? 0}</span>
              </div>

              {#if preview?.breakdown?.podiumExacta}
                <div class="bd-chip bd-chip--live bd-chip--badge">
                  <span class="bd-k">Podium</span>
                  <span class="bd-v">✔</span>
                </div>
              {/if}

              {#if preview?.breakdown?.chaos?.inTop10}
                <div class="bd-chip bd-chip--live bd-chip--badge">
                  <span class="bd-k">Chaos Hit</span>
                  <span class="bd-v">P{preview.breakdown.chaos.finishPos}</span>
                </div>
              {/if}
            </div>
          {:else if previewReady}
            <div class="breakdown-row">
              <div class="muted">No breakdown available.</div>
            </div>
          {:else if data.results?.payload}
            <div class="breakdown-row">
              <div class="muted">Scores not computed yet (publish results to compute).</div>
            </div>
          {/if}
        {/if}

        <!-- ENTRY LISTS -->
        <div class="entry-block">
          <div class="entry-label">Top 10</div>
          <ol class="entry-list">
            {#each e.top10Display as d}
              <li>{formatDriver(d)}</li>
            {/each}
          </ol>
        </div>

        <div class="entry-block">
          <div class="entry-label">Chaos Car</div>
          <ol class="entry-list entry-list--single">
            <li>{formatDriver(e.chaosDisplay)}</li>
          </ol>
        </div>
      </div>
    {/each}
  </div>
{/if}

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
	.input {
		width: 100%;
		padding: 10px 12px;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(0, 0, 0, 0.28);
		color: rgba(255, 255, 255, 0.92);
		outline: none;
	}

	.section-title {
		margin-top: 28px;
		margin-bottom: 12px;
		font-size: 1.2rem;
		font-weight: 700;
	}

	.entry-block {
		margin-top: 10px;
	}

	.entry-label {
		font-weight: 700;
		opacity: 0.9;
		margin-bottom: 6px;
	}

	.entry-list {
		margin: 0;
		padding-left: 20px;
	}

	.entry-list li {
		margin: 2px 0;
	}
.bd-chip--live {
  border-color: rgba(255, 215, 120, 0.22);
  background: rgba(255, 215, 120, 0.06);
}

.bd-chip--badge {
  border-style: dashed;
}
	.entry-list--single {
		padding-left: 20px; /* same as Top 10 */
		margin: 0;
	}

	.entry-list--single li {
		margin: 2px 0;
	}

	.entry-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.entry-card {
		padding: 16px;
		max-width: 33%;
	}

	.entry-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
	}
	.entry-topline {
		display: flex;
		align-items: center;
		gap: 25px;
		padding-bottom: 10px;
	}

	.entry-name {
		font-weight: 900;
		font-size: 1.05rem;
		line-height: 1.1;
	}

	.entry-meta {
		font-size: 0.9rem;
		line-height: 1.1;
	}

	.score-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 10px; /* smaller */
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.05);
	}

	.score-pill--pending {
		opacity: 0.7;
	}

	.score-label {
		font-weight: 700;
		font-size: 0.8rem; /* smaller */
		opacity: 0.9;
	}
  .score-pill--live {
  border-color: rgba(255, 215, 120, 0.28);
  background: rgba(255, 215, 120, 0.08);
}
	.score-value {
		font-weight: 900;
		font-size: 0.95rem; /* smaller */
	}

	.breakdown-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 10px 0 6px;
	}

	.bd-chip {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		padding: 6px 10px;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
	}

	.bd-k {
		font-weight: 700;
		font-size: 0.85rem;
		opacity: 0.9;
	}

	.bd-v {
		font-weight: 900;
		font-size: 0.95rem;
	}

	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 900px) {
		.entry-grid {
			grid-template-columns: 1fr;
		}
		.grid {
			grid-template-columns: 1fr;
		}
	}
</style>
