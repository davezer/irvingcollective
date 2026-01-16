<script>
  export let data; // contains { user } from (app)/+layout.server.js
</script>

<div class="shell">
  <header class="topbar">
    <a class="brand" href="/">ICL Offseason Fun</a>

    <nav class="nav">
  <a href="/games">Games</a>
  <a href="/leaderboard" class="muted">Leaderboard</a>
  <a href="/schedule" class="muted">Schedule</a>
  <a href="/irvingcoin" class="muted">IrvingCoin</a>

  {#if data?.user?.role === 'admin'}
    <a href="/admin/users" class="muted">Users</a>
    <a href="/admin/invites" class="muted">Invites</a>
  {/if}
</nav>

    <div class="user">
      <span class="name">{data.user.displayName}</span>
      <form method="POST" action="/api/auth/logout">
        <button type="submit">Logout</button>
      </form>
    </div>
  </header>

  <main class="content">
    <slot />
  </main>
</div>

<style>
  .shell { min-height: 100vh; }
  .topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,.12);
    backdrop-filter: blur(10px);
    background: rgba(0,0,0,.25);
  }
  .brand { font-weight: 800; text-decoration: none; color: inherit; letter-spacing: .2px; }
  .nav { display: flex; gap: 14px; justify-content: center; }
  .nav a { text-decoration: none; color: inherit; opacity: .9; }
  .nav a:hover { opacity: 1; }
  .muted { opacity: .65; }
  .user { display: flex; align-items: center; gap: 10px; }
  .name { opacity: .85; }
  button { padding: 7px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: transparent; color: inherit; cursor: pointer; }
  button:hover { border-color: rgba(255,255,255,.25); }
  .content { padding: 18px 0; }
</style>
