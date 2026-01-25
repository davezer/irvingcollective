<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  export let data; // contains { user } from (app)/+layout.server.js

  let adminDD;

  function closeAdminDD() {
    adminDD?.removeAttribute('open');
  }

  function toggleAdminDD(forceOpen) {
    if (!adminDD) return;
    if (forceOpen === true) adminDD.setAttribute('open', '');
    else if (forceOpen === false) adminDD.removeAttribute('open');
    else adminDD.toggleAttribute('open');
  }

  onMount(() => {
    function onDocPointerDown(e) {
      if (!adminDD?.hasAttribute('open')) return;
      const t = e.target;
      if (t instanceof Node && adminDD.contains(t)) return; // click inside dropdown
      closeAdminDD(); // click outside
    }

    function onDocKeyDown(e) {
      if (e.key === 'Escape') closeAdminDD();
    }

    document.addEventListener('pointerdown', onDocPointerDown, true);
    document.addEventListener('keydown', onDocKeyDown, true);

    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown, true);
      document.removeEventListener('keydown', onDocKeyDown, true);
    };
  });

  $: path = $page.url.pathname;
  const isActive = (href) => path === href || (href !== '/' && path.startsWith(href + '/'));

  let mobileOpen = false;

  // close menu when route changes
  $: $page.url.pathname, (mobileOpen = false);

  const primaryLinks = [
    { href: '/games', label: 'Games' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/schedule', label: 'Schedule' }
  ];
</script>

<div class="shell">
  <header class="topbar">
    <div class="topbar-inner">
      <!-- Brand -->
      <a class="brand" href="/">
        <div class="brand-title">Irving Collective</div>
        <div class="brand-tag">Offseason Lounge</div>
      </a>

      <!-- Desktop nav -->
      <nav class="primary-nav desktop-only" aria-label="Primary">
        {#each primaryLinks as l}
          <a class={"navlink " + (isActive(l.href) ? 'active' : '')} href={l.href}>
            {l.label}
          </a>
        {/each}
      </nav>

      <!-- Mobile: control row (hamburger left, user right) -->
      <div class="control-row">
        <div class="mobile-only">
          <button
            class={"hamburger " + (mobileOpen ? 'is-open' : '')}
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            on:click={() => (mobileOpen = !mobileOpen)}
          >
            <span class="hamburger__glyph" aria-hidden="true">
              <span class="hamburger__bar"></span>
              <span class="hamburger__bar"></span>
              <span class="hamburger__bar"></span>
            </span>
          </button>
        </div>

        <div class="user">
          <div class="user-chip" title="Signed in">
            <span class="user-dot" aria-hidden="true"></span>
            <span class="user-name">{data?.user?.displayName}</span>
            {#if data?.user?.role === 'admin'}
              <span class="user-role">Admin</span>
            {/if}
          </div>

          <form method="POST" action="/api/auth/logout">
            <button class="btn btn--ghost" type="submit">Logout</button>
          </form>
        </div>
      </div>

      <!-- Mobile drawer: full-width row under the top bar -->
      {#if mobileOpen}
        <div id="mobile-nav" class="mobile-drawer" role="dialog" aria-label="Menu">
          <div class="mobile-drawer__inner">
            {#each primaryLinks as l}
              <a class={"mobile-link " + (isActive(l.href) ? 'active' : '')} href={l.href}>
                {l.label}
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </header>

  <main class="container">
    <slot />
  </main>
</div>

<style>
  /* Shell */
  .shell { min-height: 100vh; }

  /* Topbar */
  .topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(10px);
    background: rgba(7, 8, 10, 0.62);
    border-bottom: 1px solid rgba(255,255,255,0.10);
  }

  .topbar-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 14px 18px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
  }

  /* Brand */
  .brand {
    text-decoration: none;
    color: inherit;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 10px;
    border-radius: 16px;
    border: 1px solid transparent;
  }

  .brand:hover {
    border-color: rgba(214,177,94,0.25);
    background: rgba(214,177,94,0.06);
  }

  .brand-title {
    font-family: ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Garamond, Georgia, serif;
    letter-spacing: 0.5px;
    font-size: 18px;
    line-height: 1.1;
  }

  .brand-tag {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    opacity: 0.6;
  }

  /* Responsive helpers */
  .desktop-only { display: flex; }
  .mobile-only { display: none; }
  @media (max-width: 720px) {
    .desktop-only { display: none; }
    .mobile-only { display: block; }
  }

  /* Desktop nav */
  .primary-nav { gap: 16px; align-items: center; justify-content: center; }
  .navlink {
    font-weight: 800;
    opacity: 0.8;
    text-decoration: none;
    padding: 8px 10px;
    border-radius: 12px;
    border: 1px solid transparent;
    transition: border-color 0.15s ease, background 0.15s ease, opacity 0.15s ease;
  }
  .navlink:hover { opacity: 1; border-color: rgba(255,255,255,0.10); background: rgba(255,255,255,0.03); }
  .navlink.active { opacity: 1; border-color: rgba(212,175,55,0.22); background: rgba(212,175,55,0.08); }

  /* Mobile control row */
  .control-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  }

  /* User area */
  .user {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: flex-end;
  }

  .user-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.03);
    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
  }

  .user-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #2fd07f;
    box-shadow: 0 0 0 3px rgba(47,208,127,0.14);
  }

  .user-name {
    opacity: 0.92;
    font-weight: 650;
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-role {
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #f5d58a;
    border-left: 1px solid rgba(255,255,255,0.10);
    padding-left: 10px;
    opacity: 0.9;
  }

  /* Button fallback */
  .btn {
    appearance: none;
    border: 1px solid rgba(255,255,255,0.14);
    background: transparent;
    color: rgba(255,255,255,0.9);
    padding: 10px 12px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 650;
    transition: border-color 0.14s ease, background 0.14s ease, transform 0.12s ease;
  }

  .btn:hover {
    border-color: rgba(214,177,94,0.35);
    background: rgba(214,177,94,0.08);
    color: rgba(255,255,255,0.95);
  }

  .btn--ghost { background: transparent; }

  /* ✅ Sleek hamburger */
  .hamburger{
    width: 44px;
    height: 44px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.10);
    background:
      radial-gradient(120% 120% at 20% 20%, rgba(255,255,255,0.06), transparent 55%),
      rgba(0,0,0,0.22);
    display:grid;
    place-items:center;
    padding: 0;
    cursor:pointer;
    transition: border-color 160ms ease, background 160ms ease, transform 140ms ease, box-shadow 160ms ease;
    box-shadow:
      0 18px 45px rgba(0,0,0,0.35),
      inset 0 0 0 1px rgba(255,255,255,0.03);
  }

  .hamburger:hover{
    border-color: rgba(212,175,55,0.28);
    background:
      radial-gradient(120% 120% at 20% 20%, rgba(212,175,55,0.10), transparent 55%),
      rgba(0,0,0,0.22);
    box-shadow:
      0 20px 55px rgba(0,0,0,0.42),
      inset 0 0 0 1px rgba(212,175,55,0.07);
  }

  .hamburger:active{
    transform: translateY(1px);
  }

  .hamburger:focus-visible{
    outline: none;
    box-shadow:
      0 18px 50px rgba(0,0,0,0.40),
      0 0 0 3px rgba(212,175,55,0.18),
      inset 0 0 0 1px rgba(255,255,255,0.03);
  }

  .hamburger__glyph{
    width: 18px;
    display:grid;
    gap: 4px;
  }

  .hamburger__bar{
    width: 18px;
    height: 2px;
    border-radius: 999px;
    background: rgba(255,255,255,0.86);
    display:block;
    transform-origin: center;
    transition: transform 160ms ease, opacity 160ms ease, background 160ms ease;
  }

  .hamburger.is-open .hamburger__bar:nth-child(1){
    transform: translateY(6px) rotate(45deg);
    background: rgba(212,175,55,0.92);
  }
  .hamburger.is-open .hamburger__bar:nth-child(2){
    opacity: 0;
  }
  .hamburger.is-open .hamburger__bar:nth-child(3){
    transform: translateY(-6px) rotate(-45deg);
    background: rgba(212,175,55,0.92);
  }

  /* Mobile drawer */
  .mobile-drawer {
    grid-column: 1 / -1;
    margin-top: 10px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.10);
    background: rgba(0,0,0,0.35);
    overflow: hidden;
  }

  .mobile-drawer__inner {
    display: grid;
    padding: 10px;
    gap: 8px;
  }

  .mobile-link {
    padding: 12px 12px;
    border-radius: 14px;
    text-decoration: none;
    font-weight: 900;
    opacity: 0.88;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(0,0,0,0.16);
    transition: border-color 0.15s ease, background 0.15s ease, opacity 0.15s ease, transform 0.12s ease;
  }

  .mobile-link:hover {
    opacity: 1;
    border-color: rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    transform: translateY(-1px);
  }

  .mobile-link.active {
    border-color: rgba(212,175,55,0.22);
    background: rgba(212,175,55,0.08);
    opacity: 1;
  }

  /* Container fallback */
  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 22px 18px 42px;
  }

  /* Mobile layout tweaks */
  @media (max-width: 860px) {
    .topbar-inner {
      grid-template-columns: 1fr;
      grid-auto-rows: auto;
      align-items: stretch;
    }

    /* Brand gets its own full-width row */
    .brand {
      justify-self: start;
      width: fit-content;
    }

    /* Control row becomes full-width below brand */
    .control-row {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between; /* hamburger left, user right */
      gap: 12px;
    }

    .user {
      gap: 8px;
    }

    .user-chip {
      padding: 7px 10px;
    }

    .btn {
      padding: 9px 10px;
    }
  }

  @media (max-width: 420px) {
    .user-name { max-width: 110px; }
  }
</style>
