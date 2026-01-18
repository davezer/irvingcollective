<script>
  export let data;
</script>

<main style="max-width: 720px; margin: 48px auto; padding: 0 16px;">
  <h1>Welcome, {data.user.displayName} </h1>
  <p style="opacity:.75; margin-top:6px;">
    Role: <strong>{data.user.role}</strong>
  </p>

  <form method="POST" action="/api/auth/logout" style="margin-top: 20px;">
    <button type="submit">Logout</button>
  </form>

  <hr style="margin: 28px 0; opacity:.2;" />

  <p style="opacity:.85;">
    Next up: Daytona 500
  </p>
</main>
