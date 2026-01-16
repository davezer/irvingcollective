<script>
  let display_name = '';
  let invite_code = '';
  let errorMsg = '';

  async function submit(e) {
    errorMsg = '';
    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: fd
    });

    // login endpoint redirects on success
    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    let j = null;
    try { j = await res.json(); } catch {}
    errorMsg = j?.error || 'Login failed';
  }
</script>

<div class="wrap">
  <h1>ICL Funsies</h1>
  <p class="sub">Enter your invite code to join.</p>

  <form on:submit|preventDefault={submit} class="card">
    <label>
      <span>Display name</span>
      <input name="display_name" bind:value={display_name} autocomplete="nickname" required />
    </label>

    <label>
      <span>Invite code</span>
      <input name="invite_code" bind:value={invite_code} autocomplete="off" required />
    </label>

    {#if errorMsg}
      <p class="err">{errorMsg}</p>
    {/if}

    <button type="submit">Sign in</button>
  </form>
</div>

<style>
  .wrap { max-width: 420px; margin: 10vh auto; padding: 0 16px; }
  h1 { margin: 0 0 6px; }
  .sub { margin: 0 0 18px; opacity: .75; }
  .card { display: grid; gap: 12px; padding: 16px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; }
  label { display: grid; gap: 6px; }
  input { padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: transparent; color: inherit; }
  button { padding: 10px 12px; border-radius: 10px; border: 0; cursor: pointer; }
  .err { margin: 0; color: #ffb4b4; }
</style>
