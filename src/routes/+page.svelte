<script lang="ts">
  import { formatMetric, normalizeWeights } from '$lib/core/scoring';
  let { data } = $props();
  let showSubs=$state(false), trainingWeight=$state(50), homeWeight=$state(50), matchSource=$state<'official'|'availability'>('official');
  let mode=$state<'combined'|'training'|'match'>('combined'), sort=$state('score'), direction=$state(-1);
  let lowPresence=$state(50), lowAdmin=$state(70), mismatchThreshold=$state(2), homeAwayThreshold=$state(20);
  function sides(r:any){return matchSource==='official'?[r.metrics.homeAppearances,r.metrics.awayAppearances]:[r.metrics.homeAvailability,r.metrics.awayAvailability]}
  function weighted(metric:any,home:any,away:any){const w=normalizeWeights(home.denominator?homeWeight:0,away.denominator?100-homeWeight:0);return w?Math.round(((home.percentage??0)*w[0]+(away.percentage??0)*w[1])*10)/10:metric.percentage}
  function score(r:any){const match=matchSource==='official'?r.metrics.appearances:r.metrics.availability;const [home,away]=sides(r);const matchPct=weighted(match,home,away);if(mode==='training')return r.metrics.training.percentage;if(mode==='match')return matchPct;const w=normalizeWeights(r.metrics.training.denominator?trainingWeight:0,match.denominator?100-trainingWeight:0);return w?Math.round(((r.metrics.training.percentage??0)*w[0]+(matchPct??0)*w[1])*10)/10:null}
  function value(r:any,key:string){if(key==='score')return score(r)??-1;return r.metrics[key]?.percentage??-1}
  function setSort(key:string){if(sort===key)direction*=-1;else{sort=key;direction=-1}}
  function mismatches(r:any){return r.insights.filter((i:any)=>!['low-training','low-admin'].includes(i.code)&&Number.parseInt(i.detail)>=mismatchThreshold)}
  function mismatchBadge(code:string){return code==='available-not-played'?'Avail ≠ played':code==='played-not-yes'?'Played ≠ reply':'Mismatch'}
  function sideDifference(r:any){const [home,away]=sides(r);return home.percentage!=null&&away.percentage!=null?Math.abs(home.percentage-away.percentage):null}
  let scoreHeading=$derived(mode==='training'?'Training score':mode==='match'?(matchSource==='official'?'Official score':'Availability score'):'Activity score');
  let rows=$derived(data.rows.filter((r:any)=>showSubs||r.kind==='core').sort((a:any,b:any)=>(value(a,sort)-value(b,sort))*direction));
  $effect(()=>{const saved=localStorage.getItem('dmon-controls');if(saved){try{const s=JSON.parse(saved);trainingWeight=s.trainingWeight??50;homeWeight=s.homeWeight??50;matchSource=s.matchSource??'official';lowPresence=s.lowPresence??50;lowAdmin=s.lowAdmin??70;mismatchThreshold=s.mismatchThreshold??2;homeAwayThreshold=s.homeAwayThreshold??20}catch{}}});
  $effect(()=>localStorage.setItem('dmon-controls',JSON.stringify({trainingWeight,homeWeight,matchSource,lowPresence,lowAdmin,mismatchThreshold,homeAwayThreshold})));
</script>

<div class="hero"><div><h1>Activity ranking</h1><div class="muted">Declared presence and official participation, kept as separate facts.</div></div></div>
{#if !data.datasetId}<div class="empty">No dataset has been ingested yet.</div>{:else}
<section class="controls">
  <label>Ranking mode<select bind:value={mode}><option value="combined">Combined</option><option value="training">Training only</option><option value="match">Matches only</option></select></label>
  <label>Match source<select bind:value={matchSource}><option value="official">Official Sportlink appearances</option><option value="availability">Twizzit availability</option></select></label>
  <label>Training weight: {trainingWeight}%<input type="range" min="0" max="100" bind:value={trainingWeight}/></label>
  <label>Home match weight: {homeWeight}%<input type="range" min="0" max="100" bind:value={homeWeight}/></label>
  <label><span>Players</span><span><input aria-label="Show substitutes" type="checkbox" bind:checked={showSubs}/> Show substitutes</span></label>
  <label>Low presence threshold<input type="number" min="0" max="100" bind:value={lowPresence}/></label>
  <label>Low admin threshold<input type="number" min="0" max="100" bind:value={lowAdmin}/></label>
  <label>Mismatch count threshold<input type="number" min="1" bind:value={mismatchThreshold}/></label>
  <label>Home/away difference<input type="number" min="0" max="100" bind:value={homeAwayThreshold}/></label>
</section>
<div class="table-wrap"><table><thead><tr><th>Player</th>{#if data.isAll}<th>Team</th>{/if}<th onclick={()=>setSort('score')} title={matchSource==='official'?'Uses official Sportlink appearances':'Uses declared Twizzit availability'}>{scoreHeading}</th><th onclick={()=>setSort('training')}>Training presence</th><th onclick={()=>setSort('appearances')}>Official appearances</th><th onclick={()=>setSort('availability')}>Match availability</th><th onclick={()=>setSort('homeAppearances')}>Home appearances</th><th onclick={()=>setSort('awayAppearances')}>Away appearances</th><th onclick={()=>setSort('overallAdmin')}>Admin</th><th>Objective insights</th></tr></thead><tbody>
{#each rows as r}<tr><td><a href="/players/{r.id}?dataset={r.teamId??data.datasetId}"><strong>{r.firstName} {r.lastName}</strong></a>{#if r.kind==='substitute'} <span class="pill warn">Substitute</span>{/if}</td>{#if data.isAll}<td>{r.teamName}</td>{/if}<td class="score">{score(r)==null?'N/A':`${score(r).toFixed(1)}%`}</td><td>{formatMetric(r.metrics.training)}</td><td>{formatMetric(r.metrics.appearances)}</td><td>{formatMetric(r.metrics.availability)}</td><td>{formatMetric(r.metrics.homeAppearances)}</td><td>{formatMetric(r.metrics.awayAppearances)}</td><td title={`Training: ${formatMetric(r.metrics.trainingAdmin)} · Match: ${formatMetric(r.metrics.matchAdmin)} · Overall: ${formatMetric(r.metrics.overallAdmin)}`}>{formatMetric(r.metrics.overallAdmin)}</td><td>
  {#if (r.metrics.training.percentage??100)<lowPresence}<span class="pill warn insight-badge" title={`Low declared training presence: ${formatMetric(r.metrics.training)}`} aria-label={`Low declared training presence: ${formatMetric(r.metrics.training)}`}>Training ↓</span>{/if}
  {#if (r.metrics.overallAdmin.percentage??100)<lowAdmin}<span class="pill warn insight-badge" title={`Low administration quality: ${formatMetric(r.metrics.overallAdmin)}`} aria-label={`Low administration quality: ${formatMetric(r.metrics.overallAdmin)}`}>Admin ↓</span>{/if}
  {#if sideDifference(r)!=null&&sideDifference(r)!>=homeAwayThreshold}{@const side=sides(r)}<span class="pill insight-badge" title={`Home/away difference: ${formatMetric(side[0])} versus ${formatMetric(side[1])}`} aria-label={`Home/away difference: ${formatMetric(side[0])} versus ${formatMetric(side[1])}`}>H/A Δ</span>{/if}
  {#each mismatches(r) as i}<span class="pill insight-badge" title={`${i.label}: ${i.detail}`} aria-label={`${i.label}: ${i.detail}`}>{mismatchBadge(i.code)}</span>{/each}
</td></tr>{/each}</tbody></table></div>
<p class="muted">Training presence and match availability are Twizzit declarations, not proof of physical participation. Official appearances come only from Sportlink match sheets. Percentages use the complete configured season’s scorable events.</p>{/if}

<style>.insight-badge{cursor:help;letter-spacing:.01em}</style>
