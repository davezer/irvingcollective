<script>
  import { onMount } from 'svelte';
  import { eventDisplay } from '$lib/events/displayNames';

  export let data;

  // ----------------------------
  // Safe helpers
  // -----------------------------
  const num = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };

  const s = (v, d = '') => (v == null ? d : String(v));

  const first = (...vals) => {
    for (const v of vals) {
      if (v === 0) return 0;
      if (v === '' || v == null) continue;
      return v;
    }
    return null;
  };

  const fmtUnix = (sec) => {
    const x = Number(sec);
    if (!Number.isFinite(x) || !x) return '—';
    try {
      return new Date(x * 1000).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  // -----------------------------
  // Normalize likely data shapes
  // -----------------------------
  // User name
 $: who = data?.user?.display_name ?? 'Member';

  // Bankroll
  $: bankroll = num(
    first(
      data?.bankroll,
      data?.summary?.bankroll,
      data?.totals?.bankroll,
      data?.totals?.totalPoints,
      data?.totals?.total_points,
      data?.totalPoints,
      data?.total_points
    ) ?? 0,
    0
  );

 $: rank = data?.myRank ?? null;
$: board = data?.top ?? [];
$: next = data?.nextEvent ?? null;

  $: boardRows = Array.isArray(board) ? board.slice(0, 4) : [];
  $: nextDisp = next ? eventDisplay(next) : null;
  // Next event display fields with robust fallbacks

  function nextWhen(ev) {
    // lock_at is often the only date you have — but “Locks:” reads weird on a lounge page,
    // so we display it as “Closes” if present.
    const t = first(ev?.starts_at, ev?.start_at, ev?.startAt, ev?.lock_at, ev?.lockAt);
    return fmtUnix(t);
  }

  function nextHref(ev) {
    const slug = s(first(ev?.slug, ev?.event_slug, ev?.eventSlug) || '');
    // if you already compute href server-side, use it
    return s(first(ev?.href, ev?.url) || (slug ? `/games/${slug}` : '/games'));
  }

  function nextIsOpen(ev) {
    // Many shapes: locked boolean, open boolean, locked_at relative, etc.
    if (ev?.locked === true) return false;
    if (ev?.open === true) return true;
    if (ev?.locked === false) return true;
    return true;
  }

    function nextTitle(ev) {
    return s(first(nextDisp?.title, ev?.displayName, ev?.title, ev?.name, ev?.eventName, ev?.slug) || 'Upcoming Event');
  }

  function nextSubtitle(ev) {
    // THIS is the “Race, Crash, Cash” line (or March Madness, etc.)
    return s(first(nextDisp?.subtitle, ev?.subtitle, ev?.series, ev?.typeLabel, ev?.type, ev?.league) || '');
  }

  function nextLogo(ev) {
    return first(nextDisp?.logo, ev?.logo, ev?.image, ev?.icon) || null;
  }

// -----------------------------
// Vinyl mode (client only)
// -----------------------------

let vinyl = false;
let audioEl;

const LOUNGE_TRACK = '/ICLOF.mp3';

onMount(() => {
  // restore preference
  try {
    vinyl = window.localStorage.getItem('ic:vinyl') === '1';
  } catch {}

  // set up audio element
  if (audioEl) {
    audioEl.volume = 0.22;
    audioEl.loop = true;
  }
});

async function toggleVinyl() {
  vinyl = !vinyl;

  try {
    window.localStorage.setItem('ic:vinyl', vinyl ? '1' : '0');
  } catch {}

  if (!audioEl) return;

  if (vinyl) {
    try {
      // ensure track is loaded and starts clean
      audioEl.src = LOUNGE_TRACK; // safe even if already set
      audioEl.currentTime = 0;
      audioEl.volume = 0.22;
      audioEl.loop = true;
      await audioEl.play();
    } catch (err) {
      console.warn('Audio play blocked:', err);
    }
  } else {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
}
</script>

<div class="lounge {vinyl ? 'is-vinyl' : ''}">
  <section class="hero">
    <div class="hero-top">
      <div class="kicker">Irving Collective • Offseason Lounge</div>

      <button type="button" class="vinyl" on:click={toggleVinyl} aria-pressed={vinyl}>
        Hype Mode: {vinyl ? 'On' : 'Off'}
      </button>
    </div>

    <h1 class="h1">Welcome back, {who}.</h1>
    <p class="sub">Velvet-rope access. Picks. Points. Prestige.</p>

    <div class="cta">
      <a class="btn btn--vip" href="/games">Enter the Games</a>
      <a class="btn btn--ghost" href="/leaderboard">View the Board</a>
    </div>

    <div class="rail">
      <div class="chips">
        <div class="chip">
          <div class="label">Bankroll</div>
          <div class="value">{bankroll}</div>
          <div class="hint">Total points across events</div>
        </div>

        <div class="chip">
          <div class="label">Rank</div>
          <div class="value">{rank ? `#${rank}` : '—'}</div>
          <div class="hint">Respect is earned</div>
        </div>
      </div>

      <div class="next">
  {#if next}
    <div class="next-bar">
      <div class="next-tag">Next Up</div>

      <div class="next-right">
        {#if nextLogo(next)}
          <img class="logo" src={nextLogo(next)} alt="" loading="lazy" />
        {:else}
          <div class="logo logo--placeholder" aria-hidden="true">IC</div>
        {/if}

        <div class="next-text">
          <div class="next-title">{nextTitle(next)}</div>
          <div class="next-sub">
            {#if nextSubtitle(next)}{nextSubtitle(next)}<span class="sep">•</span>{/if}
            <span class="when">{nextWhen(next)}</span>
          </div>
        </div>

        <div class="next-actions">
          <span class="pill {nextIsOpen(next) ? 'pill--green' : 'pill--red'}">
            {nextIsOpen(next) ? 'Open' : 'Locked'}
          </span>

          <a class="btn btn--vip btn--sm" href={nextHref(next)}>Make your pick</a>
          <a class="btn btn--ghost btn--sm" href="/games">All games</a>
        </div>
      </div>
    </div>
  {:else}
    <div class="next-bar">
      <div class="next-tag">Next Up</div>
      <div class="muted small">Nothing queued. Enjoy the silence.</div>
    </div>
  {/if}
</div>
  </section>

  <section class="board">
    <div class="board-head">
      <div>
        <div class="label">The Board</div>
        <div class="board-title">Top Players</div>
      </div>
      <a class="btn btn--ghost btn--sm" href="/leaderboard">Full leaderboard</a>
    </div>

    {#if boardRows?.length}
      <div class="board-list">
        {#each boardRows as r, i (r?.user_id ?? r?.id ?? r?.name ?? i)}
          <div class="row">
            <div class="rank">{s(first(r?.rank, r?.place) ?? (i + 1))}</div>
            <div class="name">{s(first(r?.display_name, r?.displayName, r?.name) || '—')}</div>
            <div class="score">{num(first(r?.total, r?.score_total, r?.score, r?.points) ?? 0, 0)}</div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="muted small">No leaderboard data available.</div>
    {/if}
  </section>

  <footer class="footer">
    <div class="footline">Members Only • Irving Collective</div>
  </footer>

  <div class="film" aria-hidden="true"></div>
  <audio bind:this={audioEl} src={LOUNGE_TRACK} preload="auto" ></audio>
</div>

<style>
  .lounge {
    max-width: 1100px;
    margin: 0 auto;
    padding: 28px;
    position: relative;
  }

  .hero {
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      radial-gradient(900px 500px at 18% 0%, rgba(212,175,55,0.12), transparent 55%),
      radial-gradient(900px 500px at 90% 0%, rgba(60,180,140,0.10), transparent 60%),
      rgba(0,0,0,0.18);
    padding: 24px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.55);
    overflow: hidden;
    position: relative;
    z-index: 1;
  }

  .hero::after{
    content:"";
    position:absolute;
    inset:-1px;
    pointer-events:none;
    border-radius: 22px;
    background: radial-gradient(800px 260px at 25% 0%, rgba(255,255,255,0.06), transparent 60%);
    opacity: 0.85;
  }

  .hero-top {
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap: 12px;
    flex-wrap: wrap;
    position: relative;
    z-index: 2;
  }

  .kicker {
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.72rem;
    opacity: 0.82;
  }

  .vinyl{
    border-radius: 999px;
    padding: 8px 12px;
    font-weight: 900;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.18);
    color: rgba(255,255,255,0.82);
    transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
    white-space: nowrap;
  }
  .vinyl:hover{
    background: rgba(255,255,255,0.05);
    border-color: rgba(212,175,55,0.25);
    transform: translateY(-1px);
  }

  .h1 {
    margin: 12px 0 6px;
    font-size: 2.25rem;
    line-height: 1.05;
    font-weight: 950;
    position: relative;
    z-index: 2;
  }

  .sub {
    margin: 0;
    opacity: 0.72;
    max-width: 60ch;
    position: relative;
    z-index: 2;
  }

  .cta {
    display:flex;
    gap: 10px;
    margin-top: 16px;
    flex-wrap: wrap;
    position: relative;
    z-index: 2;
  }

  .rail {
    display:grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-top: 18px;
    position: relative;
    z-index: 2;
  }

  .chips {
    display:flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .chip {
    flex: 1 1 220px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.16);
    padding: 12px 14px;
    min-width: 0;
  }

  .label {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.70;
    font-weight: 900;
  }

  .value {
    font-weight: 950;
    font-size: 1.35rem;
    margin-top: 6px;
    line-height: 1;
  }

  .hint {
    opacity: 0.62;
    font-size: 0.86rem;
    margin-top: 6px;
  }

 .next{
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.16);
  padding: 12px 14px;
}
.next-bar{
  display: grid;
  grid-template-columns: 92px 1fr;  /* label column + content */
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.next-tag{
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 0.68rem;
  opacity: 0.62;
}
/* Next Up: label left, everything else right */
.next{
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.16);
  padding: 12px 14px;
}

.next-bar{
  display: grid;
  grid-template-columns: 92px 1fr;  /* label column + content */
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.next-tag{
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 0.68rem;
  opacity: 0.62;
}

.next-right{
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.logo{
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

.next-text{ min-width: 0; }

.next-title{
  font-size: 1.02rem;
  font-weight: 950;
  letter-spacing: 0.2px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-sub{
  font-size: 0.86rem;
  margin-top: 2px;
  opacity: 0.72;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-actions{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.next-actions .btn--sm{
  padding: 7px 11px;
  border-radius: 12px;
  font-size: 0.90rem;
}

/* Mobile: stack to avoid crushing */
@media (max-width: 780px){
  .next-bar{
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .next-right{
    grid-template-columns: 44px minmax(0, 1fr);
  }
  .next-actions{
    grid-column: 1 / -1;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

  .pill {
    display:inline-flex;
    align-items:center;
    justify-content:center;
    height: 26px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    font-weight: 900;
    font-size: 0.80rem;
    opacity: 0.88;
    white-space: nowrap;
  }
  .pill--green{ border-color: rgba(80,216,150,0.22); background: rgba(80,216,150,0.06); }
  .pill--red{ border-color: rgba(255,120,120,0.22); background: rgba(255,120,120,0.06); }
  .pill--muted{ border-color: rgba(255,255,255,0.10); background: rgba(255,255,255,0.03); opacity: 0.75; }

  .next-body {
    display:grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    gap: 12px;
    align-items:center;
    min-width: 0;
  }

  .logo {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    object-fit: cover;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.22);
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight: 950;
    font-size: 0.82rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.75);
  }
  .logo--placeholder{
    background: rgba(0,0,0,0.20);
  }

  .next-text { min-width: 0; }

  .next-title {
    font-weight: 950;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .next-sub {
    opacity: 0.68;
    font-size: 0.88rem;
    margin-top: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .sep { margin: 0 8px; opacity: 0.5; }
  .when { opacity: 0.9; }

  .next-actions {
    display:flex;
    gap: 8px;
    align-items:center;
    flex-wrap: wrap;
    justify-content: flex-end;
    white-space: nowrap;
  }

  .board {
    margin-top: 14px;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.14);
    padding: 14px;
    position: relative;
    z-index: 1;
  }

  .board-head {
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }

  .board-title {
    font-weight: 950;
    font-size: 1.15rem;
    margin-top: 6px;
  }

  .board-list {
    display:grid;
    gap: 8px;
  }

  .row {
    display:grid;
    grid-template-columns: 34px minmax(0, 1fr) 90px;
    align-items:center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.16);
    min-width: 0;
  }

  .rank {
    opacity: 0.72;
    font-weight: 900;
    text-align: center;
  }

  .name {
    font-weight: 900;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .score {
    text-align: right;
    font-weight: 950;
    opacity: 0.88;
  }

  .btn{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    border-radius: 14px;
    padding: 10px 14px;
    font-weight: 900;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.18);
    color: rgba(255,255,255,0.90);
    text-decoration:none;
    transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
  }
  .btn:hover{
    transform: translateY(-1px);
    background: rgba(255,255,255,0.05);
  }

  .btn--vip{
    border-color: rgba(212,175,55,0.26);
    background: rgba(212,175,55,0.10);
  }
  .btn--vip:hover{
    border-color: rgba(212,175,55,0.40);
    background: rgba(212,175,55,0.14);
  }

  .btn--ghost{
    background: rgba(255,255,255,0.03);
    border-color: rgba(255,255,255,0.10);
  }

  .btn--sm{
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 0.92rem;
  }

  .muted{ opacity: 0.7; }
  .small{ font-size: 0.9rem; }

  .footer{
    margin-top: 14px;
    opacity: 0.55;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 0.70rem;
    text-align:center;
    position: relative;
    z-index: 1;
  }

  .film{
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.38;
    mix-blend-mode: overlay;
    background:
      radial-gradient(1200px 600px at 15% 10%, rgba(212,175,55,0.08), transparent 60%),
      radial-gradient(900px 600px at 88% 0%, rgba(60,180,140,0.06), transparent 65%),
      repeating-linear-gradient(
        0deg,
        rgba(255,255,255,0.018) 0px,
        rgba(255,255,255,0.018) 1px,
        rgba(0,0,0,0.00) 2px,
        rgba(0,0,0,0.00) 6px
      );
    animation: scan 9s linear infinite;
  }

  @keyframes scan {
    0%   { transform: translateY(0px); }
    100% { transform: translateY(12px); }
  }

  .is-vinyl .hero{
    background:
      radial-gradient(900px 500px at 18% 0%, rgba(212,175,55,0.10), transparent 55%),
      radial-gradient(900px 500px at 90% 0%, rgba(255,255,255,0.04), transparent 60%),
      rgba(0,0,0,0.22);
  }
  .is-vinyl .chip,
  .is-vinyl .next,
  .is-vinyl .board,
  .is-vinyl .row{
    background: rgba(0,0,0,0.20);
  }
  .is-vinyl .film{
    opacity: 0.52;
    mix-blend-mode: soft-light;
    animation: scan 7.5s linear infinite;
    filter: contrast(1.05) saturate(0.95);
  }

  @media (max-width: 780px) {
    .lounge{ padding: 16px; }
    .h1{ font-size: 1.85rem; }
    .next-body{ grid-template-columns: 44px minmax(0, 1fr); }
    .next-actions{ justify-content:flex-start; }
  }

  /* --- Tighten Next Up rail --- */
.next{
  padding: 12px 14px;
  border-radius: 16px;
}

.next-head{
  margin-bottom: 8px;
}

.next-head .label{
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  opacity: 0.60;
}

/* Make the row feel like a single unit */
.next-body{
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

/* Logo slightly smaller + sharper */
.logo{
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

/* Text hierarchy: strong headline, subtle subline */
.next-title{
  font-size: 1.02rem;
  font-weight: 950;
  letter-spacing: 0.2px;
  line-height: 1.1;
}

.next-sub{
  font-size: 0.86rem;
  margin-top: 2px;
  opacity: 0.72;
}

.next-sub .eventname{
  opacity: 0.95;
  font-weight: 800;
}

/* Buttons: slimmer + less tall */
.next-actions{
  gap: 8px;
}

.next-actions .btn--sm{
  padding: 7px 11px;
  border-radius: 12px;
  font-size: 0.90rem;
}

/* Make VIP button feel more “pill” and less blocky */
.next-actions .btn--vip.btn--sm{
  border-color: rgba(212,175,55,0.30);
  background: rgba(212,175,55,0.11);
}

/* Keep everything from breathing too much on wide screens */
@media (min-width: 900px){
  .next{
    padding: 10px 14px;
  }
}

</style>
