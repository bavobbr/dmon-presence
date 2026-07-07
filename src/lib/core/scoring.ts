import type { Metric, PlayerMetrics } from './types.js';

export function metric(numerator: number, denominator: number): Metric { return { numerator, denominator, percentage: denominator > 0 ? Math.round(numerator / denominator * 1000) / 10 : null }; }
export function normalizeWeights(a: number, b: number): [number,number] | null { const x=Math.max(0,Number(a)||0), y=Math.max(0,Number(b)||0), sum=x+y; return sum ? [x/sum,y/sum] : null; }
export function combinedScore(training: Metric, matches: Metric, trainingWeight=50, matchWeight=50): number | null {
  const weights=normalizeWeights(training.denominator ? trainingWeight : 0, matches.denominator ? matchWeight : 0); if (!weights) return null;
  return Math.round(((training.percentage ?? 0)*weights[0]+(matches.percentage ?? 0)*weights[1])*10)/10;
}
export function formatMetric(m: Metric) { return m.percentage == null ? `${m.numerator}/${m.denominator} (N/A)` : `${m.numerator}/${m.denominator} (${m.percentage.toFixed(1)}%)`; }

export function calculateMetrics(events: Array<{type:'training'|'match'; side:'home'|'away'|null; twizzitScorable:boolean; sportlinkScorable:boolean; attendance?:'yes'|'no'|'unknown'; appeared?:boolean}>): PlayerMetrics {
  const tr=events.filter(e=>e.type==='training'&&e.twizzitScorable), ma=events.filter(e=>e.type==='match'&&e.twizzitScorable), sp=events.filter(e=>e.type==='match'&&e.sportlinkScorable), home=sp.filter(e=>e.side==='home'), away=sp.filter(e=>e.side==='away'), homeMa=ma.filter(e=>e.side==='home'), awayMa=ma.filter(e=>e.side==='away');
  const answered=(e:typeof events[number])=>e.attendance==='yes'||e.attendance==='no';
  return { training:metric(tr.filter(e=>e.attendance==='yes').length,tr.length), availability:metric(ma.filter(e=>e.attendance==='yes').length,ma.length), appearances:metric(sp.filter(e=>e.appeared).length,sp.length), homeAppearances:metric(home.filter(e=>e.appeared).length,home.length), awayAppearances:metric(away.filter(e=>e.appeared).length,away.length), homeAvailability:metric(homeMa.filter(e=>e.attendance==='yes').length,homeMa.length), awayAvailability:metric(awayMa.filter(e=>e.attendance==='yes').length,awayMa.length), trainingAdmin:metric(tr.filter(answered).length,tr.length), matchAdmin:metric(ma.filter(answered).length,ma.length), overallAdmin:metric([...tr,...ma].filter(answered).length,tr.length+ma.length) };
}
