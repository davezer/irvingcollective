<script>
  let mode = 'returning'; // 'returning' | 'signup'
  let username = '';
  let display_name = '';
  let invite_code = '';
  let personal_code = '';

  let errorMsg = '';
  let createdCode = ''; // shown once after signup

  async function submit(e) {
    errorMsg = '';
    createdCode = '';

    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set('mode', mode);

    const res = await fetch('/api/auth/login', { method: 'POST', body: fd });

    // If endpoint returns JSON ok
    let j = null;
    try { j = await res.json(); } catch {}

    if (res.ok && j?.ok) {
      if (j.created_code) {
        createdCode = j.created_code; // show once
        // user is also logged in; you can choose to auto-redirect after they copy
      } else {
        window.location.href = '/';
      }
      return;
    }

    errorMsg = j?.error || `Login failed (${res.status})`;
  }

  function useSignup() { mode = 'signup'; errorMsg = ''; createdCode = ''; }
  function useReturning() { mode = 'returning'; errorMsg = ''; createdCode = ''; }
</script>

<div class="wrap">
  <h1>ICL Funsies</h1>
  <p class="sub">All times shown in Eastern Time.</p>

  <div class="tabs">
    <button type="button" class:active={mode === 'returning'} on:click={useReturning}>Returning</button>
    <button type="button" class:active={mode === 'signup'} on:click={useSignup}>First time</button>
  </div>

  <form on:submit|preventDefault={submit} class="card">
    <label>
      <span>Username</span>
      <input name="username" bind:value={username} autocomplete="username" required />
      <small>Letters/numbers/underscore. We’ll auto-clean it.</small>
    </label>

    {#if mode === 'signup'}
      <label>
        <span>Display name</span>
        <input name="display_name" bind:value={display_name} autocomplete="nickname" required />
      </label>

      <label>
        <span>Invite code (one-time)</span>
        <input name="invite_code" bind:value={invite_code} autocomplete="off" required />
      </label>
    {:else}
      <label>
        <span>Personal code</span>
        <input name="personal_code" bind:value={personal_code} autocomplete="off" required />
      </label>
    {/if}

    {#if errorMsg}
      <p class="err">{errorMsg}</p>
    {/if}

    <button type="submit">
      {mode === 'signup' ? 'Create account' : 'Sign in'}
    </button>
  </form>

  {#if createdCode}
    <div class="reveal">
      <h2>Save your personal code</h2>
      <p class="warn">This is shown once. If you lose it, an admin can reset it.</p>
      <div class="code">{createdCode}</div>
      <button type="button" on:click={() => navigator.clipboard.writeText(createdCode)}>Copy</button>
      <button type="button" class="go" on:click={() => (window.location.href = '/')}>Continue</button>
    </div>
  {/if}
</div>

<style>
  .wrap { max-width: 460px; margin: 10vh auto; padding: 0 16px; }
  .sub { margin: 6px 0 14px; opacity: .7; }
  .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
  .tabs button { padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: transparent; color: inherit; cursor: pointer; opacity: .75; }
  .tabs button.active { opacity: 1; border-color: rgba(255,255,255,.28); }
  .card { display: grid; gap: 12px; padding: 16px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; }
  label { display: grid; gap: 6px; }
  input { padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: transparent; color: inherit; }
  small { opacity: .65; }
  button { padding: 10px 12px; border-radius: 10px; border: 0; cursor: pointer; }
  .err { margin: 0; color: #ffb4b4; }
  .reveal { margin-top: 14px; padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); }
  .warn { margin: 8px 0 10px; opacity: .75; }
  .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 18px; padding: 12px; border-radius: 10px; border: 1px dashed rgba(255,255,255,.22); letter-spacing: 1px; }
  .go { margin-left: 8px; }
</style>
