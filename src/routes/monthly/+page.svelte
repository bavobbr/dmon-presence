<script lang="ts">
  let { data } = $props();
  let playerId = $state<string | number>('');
  let showSubstitutes = $state(false);
  let visiblePlayers = $derived(data.data.players.filter((player: any) => showSubstitutes || player.kind === 'core'));
  let selectedPlayer = $derived(data.data.players.find((player: any) => String(player.id) === String(playerId)));
  $effect(() => { if (!showSubstitutes && selectedPlayer?.kind === 'substitute') playerId = ''; });

  function playerMetric(month: any, key: string): number | null {
    const row = month.players.find((player: any) => String(player.playerId) === String(playerId));
    return row?.metrics[key]?.percentage ?? null;
  }

  function percentage(value: number | null | undefined): string {
    return value == null ? 'N/A' : `${value.toFixed(1)}%`;
  }
</script>

<div class="hero">
  <div><h1>Monthly trend</h1><div class="muted">Calendar-month averages across the configured season.</div></div>
  <div><label>Compare player <select bind:value={playerId}><option value="">Team average only</option>{#each visiblePlayers as player}<option value={player.id}>{player.name}</option>{/each}</select></label> <label><input type="checkbox" bind:checked={showSubstitutes}/> Show substitutes</label></div>
</div>

<div class="card"><div class="history">
  {#each data.data.months as month}
    <div class="row">
      <strong>{new Date(`${month.month}-02`).toLocaleDateString('en-BE',{month:'long',year:'numeric'})}</strong>
      <span>Team</span>
      <div><small>Declared training: {percentage(month.team.training)}</small><div class="bar"><i style:width={`${month.team.training??0}%`}></i></div></div>
      <div>Twizzit availability: {percentage(month.team.availability)}</div>
      <div>Official appearances: {percentage(month.team.appearances)}</div>
      {#if selectedPlayer}
        <span></span><span>{selectedPlayer.name}</span>
        <div>Training: {percentage(playerMetric(month,'training'))}</div>
        <div>Availability: {percentage(playerMetric(month,'availability'))}</div>
        <div>Official: {percentage(playerMetric(month,'appearances'))}</div>
      {/if}
    </div>
  {/each}
</div>{#if !data.data.months.length}<div class="empty">{data.isAll?'Pick a specific team to view monthly trends.':'No scorable months available.'}</div>{/if}</div>
