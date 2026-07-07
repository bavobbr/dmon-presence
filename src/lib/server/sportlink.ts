import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { ParsedSportlinkMatch } from '../core/types.js';

const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function clean(s:string){ return s.replace(/\s+/g,' ').trim(); }

export function parseSportlinkText(text:string,teamName:string):ParsedSportlinkMatch {
  const lines=text.split(/\r?\n/);
  const dateMatch=text.match(/(\d{2})-(\d{2})-(\d{4})\s+(?:om|at)\s+(\d{1,2}:\d{2})/i);
  if(!dateMatch) throw new Error('Match date/time not found');
  const teamHeader=lines.find(l=>/^(?:Team|Home):\s*/i.test(l.trim())&&l.includes(teamName));
  if(!teamHeader) throw new Error(`Configured team ${teamName} not found`);
  const homeAway=teamHeader.match(/^\s*Home:\s*(.+?)\s{3,}Away:\s*(.+?)\s*$/i);
  const headers=homeAway?[clean(homeAway[1]),clean(homeAway[2])]:[...teamHeader.matchAll(/Team:\s*(.*?)(?=\s{3,}Team:|$)/gi)].map(m=>clean(m[1]));
  if(headers.length<2){
    const m=teamHeader.match(/^\s*Team:\s*(.+?)\s{3,}Team:\s*(.+?)\s*$/i); if(m) headers.push(clean(m[1]),clean(m[2]));
  }
  const title=text.match(new RegExp(`^(.+?)\\s+-\\s+(.+?),\\s*(?:Game|Wedstrijd)`, 'mi'));
  const homeTeam=headers[0]||clean(title?.[1]??''), awayTeam=headers[1]||clean(title?.[2]??'');
  if(!homeTeam||!awayTeam) throw new Error('Home/away teams not found');
  const side=homeTeam===teamName?'home':awayTeam===teamName?'away':null;
  if(!side) throw new Error(`Configured team ${teamName} is neither home nor away`);
  const start=lines.indexOf(teamHeader)+1; const end=lines.findIndex((l,i)=>i>start&&/^\s*(Staff|Staf)\b/i.test(l));
  const section=lines.slice(start,end>start?end:lines.length);
  const midpoint=Math.max(40,teamHeader.search(/(?:Away|Team):\s*/i)>5?teamHeader.search(/(?:Away|Team):\s*/i):Math.floor(Math.max(...section.map(l=>l.length),120)/2));
  const halves=section.flatMap(l=>[l.slice(0,midpoint),l.slice(midpoint)]);
  // Sportlink emits separate Capt and DP columns. Capt is blank/yes (older
  // exports may use CAP/C); DP is -, yes, or no. Neither changes appearance.
  const row=/^\s*\S+\s+(.+?)\s+(\d{1,3})\s+(?:(yes|CAP|C)\s+)?(?:-|yes|no)\s*$/i;
  const parsedHalves=halves.map(h=>h.match(row)).filter(Boolean) as RegExpMatchArray[];
  const configuredIndex=side==='home'?0:1;
  // Fixed-width reports put home rows in the first half and away rows in the second.
  const selected=section.map(l=>configuredIndex===0?l.slice(0,midpoint):l.slice(midpoint)).map(h=>h.match(row)).filter(Boolean) as RegExpMatchArray[];
  if(!selected.length && parsedHalves.length) throw new Error('Configured-team player rows could not be isolated');
  const score=text.match(/(?:Result|Uitslag|Score)\s+(\d+)\s*[-–]\s*(\d+)/i);
  const competition=text.match(/(?:Competition|Competitie)\s+([^\n]+)/i);
  return { date:`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`,time:dateMatch[4],homeTeam,awayTeam,side,opponent:side==='home'?awayTeam:homeTeam,competition:competition?clean(competition[1]):null,scoreHome:score?Number(score[1]):null,scoreAway:score?Number(score[2]):null,players:selected.map(m=>({name:clean(m[1]),shirtNumber:m[2],captain:Boolean(m[3])})) };
}

export function readSportlinkPdf(path:string,teamName:string){
  const bytes=readFileSync(path); const hash=createHash('sha256').update(bytes).digest('hex');
  const text=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8',timeout:30_000,maxBuffer:5_000_000});
  return {hash,match:parseSportlinkText(text,teamName)};
}
