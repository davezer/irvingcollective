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

  function resultsStatus(e) {
    if (e?.resultsPublished) return { text: 'Published', cls: 'pill pill--gold' };
    return { text: 'Not published', cls: 'pill pill--muted' };
  }

  function lockStatus(e) {
    if (Number(e?.manual_lock) === 1) return { text: 'Locked (manual)', cls: 'pill pill--red' };
    if (Number(e?.manual_unlock) === 1) return { text: 'Open (manual)', cls: 'pill pill--green' };
    return { text: 'Auto', cls: 'pill pill--muted' };
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
          <col class="col-lockstatus" />
          <col class="col-entries" />
          <col class="col-results" />
          <col class="col-actions" />
        </colgroup>

        <thead>
          <tr>
            <th>Event</th>
            <th>Locks</th>
            <th>Lock</th>
            <th>Entries</th>
            <th>Results</th>
            <th class="right">Manage</th>
          </tr>
        </thead>

        <tbody>
          {#if data?.events?.length}
            {#each data.events as e (e.id)}
              <tr>
                <!-- Event -->
                <td class="event-cell">
                  {#if eventDisplay(e).logo}
                    <img class="logo" src={eventDisplay(e).logo} alt="" loading="lazy" />
                  {/if}

                  <div class="event-text">
                    <div class="title">{eventDisplay(e).title}</div>
                    {#if eventDisplay(e).subtitle}
                      <div class="subtitle">{eventDisplay(e).subtitle}</div>
                    {/if}
                    <div class="slug muted">/{e.slug}</div>
                  </div>
                </td>

                <!-- Locks -->
                <td class="muted nowrap locks-col">
                  {fmtUnix(e.lock_at)}
                </td>

                <!-- Lock override -->
                <td class="lockstatus-col">
                  <div class="lockui">
                    <div class="lockui-top">
                      <span class={lockStatus(e).cls}>{lockStatus(e).text}</span>
                    </div>

                    <form method="POST" action="?/setLockOverride" class="lock-actions">
                      <input type="hidden" name="eventId" value={e.id} />

                      {#if Number(e.manual_lock) === 1}
                        <button class="btn btn--ghost btn--sm" type="submit" name="mode" value="auto">Auto</button>
                        <button class="btn btn--ghost btn--sm" type="submit" name="mode" value="unlock">Unlock</button>
                      {:else if Number(e.manual_unlock) === 1}
                        <button class="btn btn--ghost btn--sm" type="submit" name="mode" value="auto">Auto</button>
                        <button class="btn btn--ghost btn--sm" type="submit" name="mode" value="lock">Lock</button>
                      {:else}
                        <button class="btn btn--ghost btn--sm" type="submit" name="mode" value="lock">Lock</button>
                        <button class="btn btn--ghost btn--sm" type="submit" name="mode" value="unlock">Unlock</button>
                      {/if}
                    </form>
                  </div>
                </td>

                <!-- Entries -->
                <td class="entries-col">
                  <span class="pill pill--muted entries-pill">{e.entriesSubmitted}</span>
                </td>

                <!-- Results -->
                <td class="results-col">
                  <!-- {#const st = resultsStatus(e)}{/const} -->
                  <!-- Svelte 4 doesn't support @const; do inline instead -->
                  <span class={resultsStatus(e).cls}>{resultsStatus(e).text}</span>
                </td>

                <!-- Manage -->
                <td class="actions-col right">
                  <a class="btn btn--vip btn--sm" href={`/admin/events/${e.slug}/results`}>Manage</a>
                </td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan="6" class="muted">No events found.</td>
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
  .nowrap { white-space: nowrap; }

  /* TABLE WRAP */
  .table-wrap {
    width: 100%;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.18);
    overflow: hidden;
  }

  table.admin-events-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
  }

  /* Column sizing */
  table.admin-events-table col.col-event   { width: 30%; }
  table.admin-events-table col.col-locks   { width: 18%; }
  table.admin-events-table col.col-lockstatus { width: 20%; }
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
    border-bottom: 0;
  }

  table.admin-events-table tbody tr {
    position: relative;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  table.admin-events-table tbody tr:last-child {
    border-bottom: 0;
  }

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

  table.admin-events-table thead th,
  table.admin-events-table tbody td {
    position: relative;
    z-index: 1;
  }

  /* CELL LAYOUT */
  .event-cell {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 14px;
    align-items: center;
  }

  .logo {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    object-fit: cover;
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
    white-space: normal;
    overflow: visible;
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

  .lockstatus-wrap {
    display: grid;
    gap: 8px;
  }

  .lock-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* PILLS + BUTTONS */
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

  .pill--red {
    border-color: rgba(255,120,120,0.25);
    background: rgba(255,120,120,0.08);
    color: rgba(255,220,220,0.95);
  }

  .pill--green {
    border-color: rgba(80,216,150,0.22);
    background: rgba(80,216,150,0.07);
    color: rgba(210,255,235,0.95);
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

  /* ===== polish pass: tighter + more premium ===== */

/* slightly denser table */
table.admin-events-table tbody td {
  padding: 12px 14px; /* was 16px 14px */
}

table.admin-events-table thead th {
  padding: 10px 14px;
  font-size: 0.88rem;
  letter-spacing: 0.02em;
  color: rgba(255,255,255,0.82);
}

/* reduce overall row visual height */
table.admin-events-table tbody tr::after {
  top: 12px;
  bottom: 12px;
}

/* Event cell: tighter vertical rhythm */
.event-text { gap: 2px; }

.title {
  font-size: 0.98rem;
  -webkit-line-clamp: 1; /* 2 -> 1, feels cleaner here */
}

.subtitle {
  font-size: 0.82rem;
  opacity: 0.70;
}

.slug {
  font-size: 0.74rem;
  opacity: 0.55;
}

/* Logos: slightly smaller = more refined */
.logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

/* Locks column: make timestamp smaller & calmer */
.locks-col {
  font-size: 0.86rem;
  opacity: 0.68;
}

/* Pills: slightly shorter, consistent */
.pill {
  height: 28px;          /* was 30px */
  padding: 0 10px;       /* tighter */
  font-size: 0.82rem;
  letter-spacing: 0.01em;
}

/* Entries pill should look like a badge, not a big bubble */
.entries-pill {
  min-width: 38px;
  height: 26px;
  font-weight: 900;
}

/* Lock status stack: make it one aligned block */
.lockstatus-wrap {
  gap: 6px; /* was 8 */
}

/* Lock action buttons: tighter + aligned */
.lock-actions {
  gap: 6px;
}

.btn--sm {
  padding: 7px 10px;  /* was 8px 12px */
  border-radius: 10px;
  font-size: 0.88rem;
}

/* Manage button: make it consistent + less bulky */
.actions-col .btn--vip.btn--sm {
  padding: 8px 12px;
  border-radius: 12px;
}

/* Align Manage column content nicely */
.actions-col {
  text-align: right;
}
/* ===== lock controls: segmented, premium ===== */

.lockstatus-wrap > .pill {
  width: fit-content;
}

.lock-actions {
  display: inline-flex;
  width: fit-content;
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.22);
}

.lock-actions .btn {
  border: 0 !important;
  background: transparent !important;
  padding: 7px 10px;
  border-radius: 10px;
  color: rgba(255,255,255,0.88);
}

.lock-actions .btn:hover {
  background: rgba(255,255,255,0.06) !important;
}

.lock-actions .btn:active {
  transform: translateY(0px);
}

.lockstatus-inline{
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.lockui{
  position: relative;
  display: grid;
  gap: 8px;
  padding: 6px 10px;
}

.lockui-top{
  display:flex;
  align-items:center;
  justify-content:flex-start;
}
table.admin-events-table thead th {
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(10px);
  background: rgba(0,0,0,0.35);
}

.entries-col, .results-col { text-align: center; }
table.admin-events-table thead th:nth-child(4),
table.admin-events-table thead th:nth-child(5) { text-align: center; }
</style>
