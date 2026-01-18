<script>
  export let data;

  let expanded = new Set(); // user_id set

  function toggleUser(userId) {
    const next = new Set(expanded);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    expanded = next;
  }

  function fmtDate(unix) {
    if (!unix) return '';
    return new Date(Number(unix) * 1000).toLocaleDateString();
  }

  function hasAnyBreakdown(ev) {
    return Boolean(ev?.totals || ev?.breakdown);
  }
</script>

<div class="card">
  <div class="section-head">
    <div>
      <div class="kicker">Overall</div>
      <h2 class="h2" style="margin: 0;">Totals</h2>
    </div>

    <span class="pill pill--gold">{data.totals?.length ?? 0} players</span>
  </div>

  <div class="table-wrap">
    <table class="lb">
      <colgroup>
        <col class="col-rank" />
        <col />
        <col class="col-points" />
      </colgroup>
      <thead>
        <tr>
          <th>Rank</th>
          <th>GM</th>
          <th class="right">Points</th>
        </tr>
      </thead>

      <tbody>
        {#each data.totals as row (row.user_id)}
          <tr class="row">
            <td class="rank">{row.rank}</td>

            <td class="gm">
              <button
                type="button"
                class="gm-btn"
                on:click={() => toggleUser(row.user_id)}
                aria-expanded={expanded.has(row.user_id)}
              >
                <span class="chev">{expanded.has(row.user_id) ? '▾' : '▸'}</span>
                <span class="name">{row.display_name}</span>
              </button>
            </td>

            <td class="right points">{row.points}</td>
          </tr>

          {#if expanded.has(row.user_id)}
            <tr class="detail">
              <td colspan="3">
                <div class="detail-inner">
                  {#if data.byUser?.[row.user_id]?.length}
                    {#each data.byUser[row.user_id] as ev (ev.event_id)}
                      <div class="ev">
                        <div class="ev-top">
                          <div class="ev-title">
                            <div class="ev-name">{ev.event_name}</div>
                            <div class="ev-date muted">{fmtDate(ev.start_at)}</div>
                          </div>

                          <div class="ev-points">{ev.points}</div>
                        </div>

                        {#if hasAnyBreakdown(ev)}
                          <div class="chips">
                            <div class="chip">
                              <span class="k">Exact</span>
                              <span class="v">{ev.totals?.exact ?? 0}</span>
                            </div>

                            <div class="chip">
                              <span class="k">Bonus</span>
                              <span class="v">{ev.totals?.bonus ?? 0}</span>
                            </div>

                            <div class="chip">
                              <span class="k">Chaos</span>
                              <span class="v">{ev.totals?.chaos ?? 0}</span>
                            </div>

                            {#if ev.breakdown?.podiumExacta}
                              <div class="chip chip--badge">
                                <span class="k">Podium</span>
                                <span class="v">✔</span>
                              </div>
                            {/if}

                            {#if ev.breakdown?.chaos?.inTop10}
                              <div class="chip chip--badge">
                                <span class="k">Chaos Hit</span>
                                <span class="v">P{ev.breakdown.chaos.finishPos}</span>
                              </div>
                            {/if}
                          </div>
                        {:else}
                          <div class="muted" style="margin-top: 8px;">No breakdown available.</div>
                        {/if}
                      </div>
                    {/each}
                  {:else}
                    <div class="muted">No scored events yet.</div>
                  {/if}
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
</div>


<style>
  .right { text-align: right; }

  .table-wrap {
    margin-top: 12px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.18);
    overflow: hidden; /* keeps rounded corners */
  }

  table.lb {
    width: 100%;
    border-collapse: collapse;
  }

  thead th {
    text-align: left;
    padding: 14px 16px;
    font-weight: 800;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  tbody td {
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    vertical-align: top;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  .points {
    font-weight: 950;
  }

  .gm-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    padding: 0;
    font: inherit;
  }

  .gm-btn:hover .name { text-decoration: underline; }

  .chev {
    width: 18px;
    opacity: 0.85;
    display: inline-block;
    transform: translateY(-1px);
  }

  /* Expanded section inside table */
  tr.detail td {
    padding: 0 16px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .detail-inner {
    margin-top: 8px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.20);
    padding: 12px 14px;
  }

  .ev {
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .ev:last-child { border-bottom: 0; }

  .ev-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 14px;
  }

  .ev-name {
    font-weight: 850;
    font-size: 1.02rem;
  }

  .ev-date { margin-top: 2px; }

  .ev-points {
    font-weight: 950;
    min-width: 60px;
    text-align: right;
  }

  /* Chips */
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
  }

  .chip .k {
    font-weight: 750;
    font-size: 0.85rem;
    opacity: 0.9;
  }

  .chip .v {
    font-weight: 950;
    font-size: 0.95rem;
  }

  .chip--badge {
    border-color: rgba(255,210,120,0.22);
    background: rgba(255,210,120,0.06);
  }

  .muted { opacity: 0.75; }

  /* Tighten table column widths */
table.lb {
  table-layout: fixed; /* makes colgroup widths actually matter */
}

/* Give Rank a fixed compact width, keep Points compact too */
table.lb col.col-rank { width: 64px; }
table.lb col.col-points { width: 90px; }
/* GM takes the rest automatically */

/* Reduce padding a bit so it feels tighter */
thead th,
tbody td {
  padding: 12px 12px; /* was 14px 16px */
}

/* Make the GM cell sit closer to Rank */
td.rank { padding-right: 6px; }
td.gm { padding-left: 6px; }

/* Keep the GM button compact */
.gm-btn { gap: 8px; }
.chev { width: 14px; }

</style>
