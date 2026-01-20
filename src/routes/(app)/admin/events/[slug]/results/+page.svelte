<script>
  import { getAdminResultsComponent } from '$lib/games/adminResults/index.js';
  import { eventDisplay } from '$lib/events/displayNames';

  export let data;

  $: event = data?.event;
  $: names = eventDisplay(event);

  $: Admin = getAdminResultsComponent(event?.type);
</script>

<div class="page-wide">
  <div class="card card--glow">
    <div class="kicker">Admin</div>
    <div class="section-head">
      <div>
        <div class="h2" style="margin:0;">Results</div>
        <div class="muted" style="margin-top:6px;">
          {names.title}{#if names.subtitle} · {names.subtitle}{/if}
        </div>
      </div>
      {#if event?.type}
        <span class="pill">Type: {event.type}</span>
      {/if}
    </div>
  </div>
</div>

<div class="spacer"></div>

{#if !Admin}
  <div class="page-wide">
    <div class="card">
      <div class="section-head">
        <h2 class="h2">Not wired</h2>
        <span class="pill">Unsupported</span>
      </div>
      <p class="subtle" style="margin-top: 10px;">
        No AdminResults component registered for <code>{event?.type}</code>.
      </p>
    </div>
  </div>
{:else}
  <svelte:component this={Admin} {data} />
{/if}

<style>
  .page-wide {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 24px;
    box-sizing: border-box;
  }
  @media (max-width: 640px) {
    .page-wide { padding: 0 14px; }
  }
  .spacer { height: 16px; }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }
</style>
