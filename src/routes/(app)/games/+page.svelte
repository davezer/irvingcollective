<script>
  import { formatET, isLocked } from '$lib/time.js';
  export let data;

  const label = (t) => ({
    daytona: 'Daytona',
    masters: 'Masters',
    derby: 'Derby',
    madness: 'Madness',
    worldcup: 'World Cup'
  }[t] || t);
</script>

<main class="wrap">
  <header class="head">
    <h1>Games</h1>
    <p class="sub">All lock times shown in Eastern Time.</p>
  </header>

  <section class="grid">
    {#each data.events as e}
      <a class="card" href={`/games/${e.slug}`}>
        <div class="top">
          <div class="title">{e.name}</div>
          <div class="pill {isLocked(e.lock_at) ? 'locked' : 'open'}">
            {isLocked(e.lock_at) ? 'Locked' : 'Open'}
          </div>
        </div>

        <div class="meta">
          <div class="row">
            <span class="k">Type</span>
            <span class="v">{label(e.type)}</span>
          </div>
          <div class="row">
            <span class="k">Lock</span>
            <span class="v">{formatET(e.lock_at)}</span>
          </div>
        </div>
      </a>
    {/each}
  </section>
</main>

<style>
  .wrap { max-width: 980px; margin: 40px auto; padding: 0 16px; }
  .head { margin-bottom: 18px; }
  .sub { margin: 6px 0 0; opacity: .7; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .card { display: block; padding: 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,.12); text-decoration: none; color: inherit; }
  .card:hover { border-color: rgba(255,255,255,.22); }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .title { font-weight: 700; }
  .pill { font-size: 12px; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); opacity: .9; }
  .pill.open { }
  .pill.locked { opacity: .6; }
  .meta { margin-top: 10px; display: grid; gap: 6px; opacity: .8; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .k { opacity: .75; }
  .v { font-variant-numeric: tabular-nums; }
</style>
