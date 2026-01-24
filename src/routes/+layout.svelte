<script>
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <!-- 16x16 tab icon -->
  <link rel="icon" type="image/png" sizes="16x16" href="/Favicon 16 x16.png" />

  <!-- (optional but recommended) also provide 32x32 so browsers choose best -->
  <link rel="icon" type="image/png" sizes="32x32" href="/Favicon 32 x32.png" />
</svelte:head>

{@render children()}
