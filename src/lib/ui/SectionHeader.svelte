<script>
  export let kicker = '';
  export let title = '';
</script>

<div class="sh">
  <div class="left">
    {#if kicker}<div class="kicker">{kicker}</div>{/if}
    {#if title}<h2 class="h2">{title}</h2>{/if}
  </div>
  <div class="right">
    <slot />
  </div>
</div>

<style>
  .sh {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }
  .right {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
</style>
