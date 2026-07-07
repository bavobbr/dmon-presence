<script lang="ts">
  let { data } = $props();
  let selected = $state<number | null>(null);
  let showSubstitutes = $state(false);
  $effect(() => { if (selected === null && data.rows.length) selected = data.rows[0].id; });
  let event = $derived(data.rows.find((e: any) => e.id === selected));
  let responses = $derived(event?.responses.filter((response: any) => showSubstitutes || response.kind === 'core') ?? []);
  function count(value: string) { return responses.filter((response: any) => response.value === value).length; }
</script>

<div class="hero"><div><h1>Training sessions</h1><div class="muted">Declared presence and answer administration.</div></div>
  <div><select bind:value={selected}>{#each data.rows as e}<option value={e.id}>{new Date(`${e.date}T12:00`).toLocaleDateString('en-BE')} · {e.name}</option>{/each}</select> <label><input type="checkbox" bind:checked={showSubstitutes}/> Show substitutes</label></div>
</div>
{#if event}
  <div class="grid"><div class="card metric">Yes<strong>{count('yes')}/{responses.length}</strong></div><div class="card metric">No<strong>{count('no')}/{responses.length}</strong></div><div class="card metric">Unknown<strong>{count('unknown')}/{responses.length}</strong></div><div class="card metric">Administration<strong>{count('yes')+count('no')}/{responses.length}</strong></div></div>
  <div class="table-wrap"><table><thead><tr><th>Player</th><th>Twizzit declaration</th><th>Comment</th></tr></thead><tbody>{#each responses as response}<tr><td><a href="/players/{response.id}?dataset={data.datasetId}">{response.firstName} {response.lastName}</a>{#if response.kind==='substitute'} <span class="pill warn">Substitute</span>{/if}</td><td class={response.value}>{response.value}</td><td>{response.comment??'—'}</td></tr>{/each}</tbody></table></div>
  <p class="muted">Yes is declared presence, not independently verified physical attendance.</p>
{:else}<div class="empty">No training sessions available.</div>{/if}
