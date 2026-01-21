<script>
  import { eventDisplay } from '$lib/events/displayNames';

  export let data;

  function fmtUnix(unix) {
    if (!unix) return '—';
    try {
      return new Date(Number(unix) * 1000).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  }

  function fmtIso(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  function resultsStatus(e) {
    if (e?.resultsPublished) return { text: 'Published', cls: 'pill pill--gold' };
    return { text: 'Not published', cls: 'pill pill--muted' };
  }
</script>


<div class="page">
  <div class="head">
    <div>
      <div class="kicker">Admin</div>
      <h1 class="h1">Events</h1>
      <div class="subtle">Manage results, publish, and recompute scoring.</div>
    </div>

    <span class="pill pill--gold">{data?.events?.length ?? 0} events</span>
  </div>

  <div class="card card--glow">
    <div class="table-wrap">
      <table class="admin-events-table">
        <colgroup>
          <col class="col-event" />
          <col class="col-locks" />
          <col class="col-entries" />
          <col class="col-results" />
          <col class="col-actions" />
        </colgroup>

        <thead>
          <tr>
            <th>Event</th>
            <th>Locks</th>
            <th>Entries</th>
            <th>Results</th>
            <th class="right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {#if data?.events?.length}
            {#each data.events as e (e.id)}
              {@const disp = eventDisplay(e)}
              {@const status = resultsStatus(e)}

              <tr>
                <td class="event-cell">
                  {#if disp.logo}
                    <img class="logo" src={disp.logo} alt="" loading="lazy" />
                  {/if}

                  <div class="event-text">
                    <div class="title">{disp.title}</div>
                    {#if disp.subtitle}
                      <div class="subtitle">{disp.subtitle}</div>
                    {/if}
                    <div class="slug muted">/{e.slug}</div>
                  </div>
                </td>
                
                <td class="muted nowrap locks-col">{fmtUnix(e.lock_at)}</td>

                <td class="entries-col">
                  <span class="pill pill--muted entries-pill">{e.entriesSubmitted}</span>
                </td>

                <td class="results-col">
                  <span class={status.cls}>{status.text}</span>
                </td>

                <td class="actions-col">
                  <a class="btn btn--vip btn--sm" href={`/admin/events/${e.slug}/results`}>Manage</a>
                </td>


              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="7" class="muted">No events found.</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px;
  }

  .head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }

  .h1 {
    margin: 0;
    font-size: 1.85rem;
    letter-spacing: 0.2px;
  }

  .subtle {
    opacity: 0.7;
    margin-top: 6px;
  }

  .right { text-align: right; }
  .muted { opacity: 0.7; }
  .small { font-size: 0.85rem; }
  .nowrap { white-space: nowrap; }

  /* ---------------------------
     TABLE WRAP + TABLE CORE
  ---------------------------- */
  .table-wrap {
    width: 100%;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.18);
    overflow: hidden; /* keep rounded corners */
  }

  table.admin-events-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
  }

  /* Column sizing — match your <colgroup> class names */
table.admin-events-table col.col-event   { width: 50%; }   /* <-- KEY */
table.admin-events-table col.col-locks   { width: 15%; }
table.admin-events-table col.col-entries { width: 10%; }
table.admin-events-table col.col-results { width: 12%; }
table.admin-events-table col.col-actions { width: 10%; }

  table.admin-events-table thead th {
    text-align: left;
    padding: 10px 12px;
    font-weight: 900;
    font-size: 0.92rem;
    border-bottom: 1px solid rgba(255,255,255,0.10);
    background: transparent;
    white-space: nowrap;
  }

  table.admin-events-table tbody td {
    padding: 16px 14px;
    vertical-align: middle;
    background: transparent;
    border-bottom: 0; /* row border handles dividers */
  }

  table.admin-events-table tbody tr {
    position: relative;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  table.admin-events-table tbody tr:last-child {
    border-bottom: 0;
  }

  /* Smooth hover overlay (no choppy cell blocks) */
  table.admin-events-table tbody tr::before {
    content: "";
    position: absolute;
    inset: 0;
    background: rgba(212, 175, 55, 0.06);
    opacity: 0;
    transition: opacity 120ms ease;
    pointer-events: none;
    z-index: 0;
  }

  /* Left accent on hover */
  table.admin-events-table tbody tr::after {
    content: "";
    position: absolute;
    left: 0;
    top: 10px;
    bottom: 10px;
    width: 3px;
    border-radius: 999px;
    background: rgba(212, 175, 55, 0.45);
    opacity: 0;
    transition: opacity 120ms ease;
    pointer-events: none;
    z-index: 0;
  }

  table.admin-events-table tbody tr:hover::before,
  table.admin-events-table tbody tr:hover::after {
    opacity: 1;
  }

  /* Ensure cell content sits above overlays */
  table.admin-events-table thead th,
  table.admin-events-table tbody td {
    position: relative;
    z-index: 1;
  }

  /* ---------------------------
     CELL CONTENT LAYOUT
  ---------------------------- */
.event-cell {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);  /* <-- KEY */
  gap: 14px;
  align-items: center;
}

  .logo {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    object-fit: cover;
    flex: 0 0 auto;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.25);
  }

  .event-text {
    display: grid;
    gap: 3px;
    min-width: 0;
  }

 .title {
  font-weight: 950;
  line-height: 1.12;

  /* allow wrapping (no ellipsis) */
  white-space: normal;
  overflow: visible;

  /* clamp to 2 lines so it doesn't blow up row height */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

  .subtitle {
    font-size: 0.85rem;
    line-height: 1.1;
    opacity: 0.72;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .slug {
    font-size: 0.78rem;
    opacity: 0.6;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Locks column text: keep it from wrapping ugly */
  td.locks-col { white-space: normal; }

  .results-cell {
    display: grid;
    gap: 6px;
    justify-items: start;
  }

  .actions-cell {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
  }

  /* ---------------------------
     PILLS + BUTTONS
  ---------------------------- */
  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    white-space: nowrap;
  }

  .entries-pill {
    min-width: 42px;
    font-weight: 900;
  }

  .pill--muted {
    border-color: rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.75);
  }

  .btn--sm {
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 0.92rem;
  }

  .btn--ghost {
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.9);
  }

  .btn--ghost:hover {
    background: rgba(255,255,255,0.06);
  }

  .btn--ghost:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ---------------------------
     RESPONSIVE
  ---------------------------- */
  @media (max-width: 820px) {
    table.admin-events-table col.col-locks   { width: 170px; }
    table.admin-events-table col.col-results { width: 150px; }
    table.admin-events-table col.col-actions { width: 130px; }
  }

  @media (max-width: 680px) {
    .page { padding: 16px; }

    .logo { width: 38px; height: 38px; border-radius: 12px; }

    table.admin-events-table col.col-locks   { width: 160px; }
    table.admin-events-table col.col-entries { width: 90px; }
    table.admin-events-table col.col-results { width: 140px; }
    table.admin-events-table col.col-actions { width: 120px; }
  }
</style>
