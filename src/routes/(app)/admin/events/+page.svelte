<script>
  export let data;
</script>

<h1 class="page-title">Admin: Events</h1>

<div class="card">
  <table class="table">
    <thead>
      <tr>
        <th>Event</th>
        <th>Type</th>
        <th>Start</th>
        <th>Results</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each data.events as e}
        <tr>
          <td>{e.name}</td>
          <td>{e.type}</td>
          <td>{e.start_at}</td>
          <td>
            {#if e.resultsPublished}
              Published {e.resultsPublishedAt}
            {:else}
              —
            {/if}
          </td>
          <td>
            <a class="btn" href={`/admin/events/${e.slug}/results`}>Manage</a>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
