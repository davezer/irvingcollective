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
</script>

<div class="shell">
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="/games">
        <div class="brand-title">Irving Collective</div>
        <div class="brand-tag">Offseason Lounge</div>
      </a>

      <nav class="nav">
        <div class="nav-main">
          <a href="/games" class:active={isActive('/games')}>Games</a>
          <a href="/leaderboard" class:active={isActive('/leaderboard')}>Leaderboard</a>
          <a href="/schedule" class:active={isActive('/schedule')}>Schedule</a>
          <a href="/irvingcoin" class:active={isActive('/irvingcoin')}>IrvingCoin</a>
        </div>

       {#if data?.user?.role === 'admin'}
        <details class="nav-dd" bind:this={adminDD}>
          <summary
            class="nav-dd__summary"
            aria-label="Admin menu"
            on:click|preventDefault={() => toggleAdminDD()}
          >
            Admin <span class="nav-dd__chev" aria-hidden="true">▾</span>
          </summary>

          <div class="nav-dd__menu" role="menu">
            <a
              role="menuitem"
              href="/admin/events"
              class:active={isActive('/admin/events')}
              on:click={closeAdminDD}
            >
              Events
            </a>

            <a
              role="menuitem"
              href="/admin/users"
              class:active={isActive('/admin/users')}
              on:click={closeAdminDD}
            >
              Users
            </a>

            <a
              role="menuitem"
              href="/admin/invites"
              class:active={isActive('/admin/invites')}
              on:click={closeAdminDD}
            >
              Invites
            </a>
          </div>
        </details>
      {/if}
      </nav>


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
  </header>

  <main class="container">
    <slot />
  </main>
</div>

<style>
  /* Shell */
  .shell { min-height: 100vh; }

  /* Topbar (works with global app.css if present; these are safe overrides) */
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
    padding: 6px 8px;
    border-radius: 14px;
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

  /* Nav */
  .nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

  .nav a {
    text-decoration: none;
    color: rgba(255,255,255,0.75);
    font-weight: 650;
    letter-spacing: 0.02em;
    padding: 8px 10px;
    border-radius: 999px;
    border: 1px solid transparent;
    transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
  }

  .nav a:hover {
    color: rgba(255,255,255,0.92);
    border-color: rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.03);
  }

  .nav a.active {
    color: #f5d58a;
    border-color: rgba(214,177,94,0.35);
    background: rgba(214,177,94,0.10);
  }
/* keep main links grouped */
.nav-main {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

/* --- Admin dropdown --- */
.nav-dd {
  position: relative;
  display: inline-block;
}

.nav-dd > summary {
  list-style: none;
}
.nav-dd > summary::-webkit-details-marker {
  display: none;
}

.nav-dd__summary {
  cursor: pointer;
  user-select: none;

  padding: 10px 12px;
  border-radius: 999px;
  line-height: 1;

  display: inline-flex;
  align-items: center;
  gap: 8px;

  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.03);

  transition: border-color 0.18s ease, background 0.18s ease, transform 0.10s ease;
}

.nav-dd__summary:hover {
  border-color: rgba(214, 177, 94, 0.28);
  background: rgba(214, 177, 94, 0.06);
  transform: translateY(-1px);
}

.nav-dd[open] .nav-dd__summary {
  border-color: rgba(214, 177, 94, 0.40);
  background: rgba(214, 177, 94, 0.10);
}

.nav-dd__chev {
  opacity: 0.8;
  font-size: 12px;
  transform: translateY(1px);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.nav-dd[open] .nav-dd__chev {
  transform: translateY(1px) rotate(180deg);
  opacity: 0.95;
}

.nav-dd__menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;

  min-width: 190px;
  padding: 10px;

  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.10);

  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(12px);

  box-shadow:
    0 18px 60px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03);

  z-index: 60;

  display: grid;
  gap: 8px;

  /* subtle entrance */
  transform-origin: top right;
  animation: ddIn 120ms ease-out;
}

@keyframes ddIn {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.nav-dd__menu a {
  text-decoration: none;
  color: rgba(255, 255, 255, 0.92);

  padding: 10px 10px;
  border-radius: 12px;

  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);

  transition: border-color 0.18s ease, background 0.18s ease, transform 0.10s ease;
}

.nav-dd__menu a:hover {
  border-color: rgba(214, 177, 94, 0.28);
  background: rgba(214, 177, 94, 0.06);
  transform: translateY(-1px);
}

.nav-dd__menu a.active {
  border-color: rgba(214, 177, 94, 0.48);
  background: rgba(214, 177, 94, 0.12);
}

@media (max-width: 860px) {
  .nav-dd__menu {
    right: auto;
    left: 0;
    transform-origin: top left;
  }
}

/* Mobile: don't let it overflow weirdly */
@media (max-width: 860px) {
  .nav-dd__menu {
    right: auto;
    left: 0;
  }
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

  /* Button styling fallback if global .btn isn't present */
  .btn {
    appearance: none;
    border: 1px solid rgba(255,255,255,0.14);
    background: transparent;
    color: rgba(255,255,255,0.9);
    padding: 10px 12px;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 650;
  }

  .btn:hover {
    border-color: rgba(214,177,94,0.35);
    background: rgba(214,177,94,0.08);
    color: rgba(255,255,255,0.95);
  }

  .btn--ghost {
    background: transparent;
  }

  /* Container fallback if global .container isn't present */
  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 22px 18px 42px;
  }

  @media (max-width: 860px) {
    .topbar-inner {
      grid-template-columns: 1fr;
      align-items: start;
    }
    .nav {
      justify-content: flex-start;
    }
    .user {
      justify-content: flex-start;
    }
  }


</style>
