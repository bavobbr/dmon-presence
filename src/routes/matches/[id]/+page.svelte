<script lang="ts">
  let { data } = $props();
  let showSubstitutes = $state(false);
  const sections=[['availablePlayed','Available and officially played'],['availableNotPlayed','Available but not recorded as played'],['playedNo','Officially played despite no'],['playedUnknown','Officially played despite unknown'],['notPlayed','Unavailable or unknown and did not play']];
  function players(key:string){return data.groups[key].filter((player:any)=>showSubstitutes||player.kind==='core')}
</script>

<div class="hero">
  <div><h1>{data.match.name}</h1><div class="muted">{new Date(`${data.match.date}T12:00`).toLocaleDateString('en-BE')} · {data.match.side??'unknown side'} · {data.match.opponent??'unknown opponent'}</div></div>
  <label><input type="checkbox" bind:checked={showSubstitutes}/> Show substitutes</label>
</div>
{#if !data.match.twizzitScorable||!data.match.sportlinkScorable}<div class="notice">One source is missing or failed. Comparisons show explicit missing-data states.</div>{/if}
<div class="grid">{#each sections as section}<section class="card"><h3>{section[1]}</h3>{#each players(section[0]) as player}<div><a href="/players/{player.id}?dataset={data.datasetId}">{player.firstName} {player.lastName}</a> <span class="muted">{player.attendance??'unknown'}{player.comment?` · ${player.comment}`:''}</span></div>{/each}{#if !players(section[0]).length}<span class="muted">None</span>{/if}</section>{/each}</div>
<p class="muted">“Not recorded as played” only describes the official match sheet. It does not imply a selection decision.</p>
