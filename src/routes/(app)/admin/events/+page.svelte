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
      <table class="events">
        <colgroup>
          <col />
          <col class="col-type" />
          <col class="col-start" />
          <col class="col-lock" />
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

.table-wrap {
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.18);
  overflow-x: auto; /* ✅ allow scroll if viewport too small */
}

table.events {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto; /* ✅ let content size columns naturally */
}
table.events th:first-child,
table.events td:first-child {
  width: 42%;
}

  thead th {
    text-align: left;
    padding: 12px 14px;
    font-weight: 900;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    font-size: 0.92rem;
  }

  tbody td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    vertical-align: middle;
  }

  tbody tr:hover td {
    background: rgba(255,255,255,0.03);
  }

  tbody tr:last-child td { border-bottom: 0; }


col.col-start { width: 200px; }
col.col-lock { width: 200px; }
col.col-entries { width: 90px; }
col.col-results { width: 230px; }  /* ✅ give Results room */
col.col-actions { width: 230px; }  /* ✅ keep buttons visible */

.event-cell {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
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
  gap: 3px; /* tighter */
}

.title {
  font-weight: 950;
  line-height: 1.1;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 100%;
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
}

.results-cell {
  display: grid;
  gap: 4px;
  justify-items: start;
}
.pill {
  display: inline-flex;
  align-items: center;
  height: 30px;          /* ✅ consistent */
  padding: 0 12px;
  border-radius: 999px;
  white-space: nowrap;
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

.actions-cell {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

/* Ghost button */
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
.nowrap {
  white-space: nowrap;
}

td.locks-col,
td.entries-col,
td.results-col,
td.actions-col {
  vertical-align: middle;
}

td.entries-col,
td.results-col,
td.actions-col {
  padding-top: 14px;
  padding-bottom: 14px;
}
tbody tr {
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
tbody tr:last-child {
  border-bottom: 0;
}
tbody td {
  padding: 14px 14px;
  vertical-align: middle; /* ✅ key */
  border-bottom: 0;       /* ✅ remove per-cell borders */
}
thead th {
  padding: 10px 12px;
}
.entries-pill {
  min-width: 42px;
  justify-content: center;
  font-weight: 900;
}
  @media (max-width: 820px) {
    col.col-start, col.col-results { width: 180px; }
  }

  @media (max-width: 680px) {
    .page { padding: 16px; }
    col.col-type { width: 92px; }
    col.col-actions { width: 90px; }
    col.col-start, col.col-results { width: 160px; }
    .logo { width: 38px; height: 38px; border-radius: 12px; }
  }
</style>
