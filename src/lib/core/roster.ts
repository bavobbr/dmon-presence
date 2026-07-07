import { readFileSync } from 'node:fs';
import type { RosterPerson } from './types.js';

function parseLine(line: string): string[] {
  const out: string[] = []; let value = ''; let quoted = false;
  for (let i=0; i<line.length; i++) { const c=line[i]; if (c==='"') { if (quoted && line[i+1]==='"') { value+='"'; i++; } else quoted=!quoted; } else if (c===';' && !quoted) { out.push(value.trim()); value=''; } else value+=c; }
  out.push(value.trim()); return out;
}

export function parseRosterCsv(text: string): { players: RosterPerson[]; staffNames: string[] } {
  const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).map(parseLine);
  const headerIndex = rows.findIndex((r) => r.includes('Voornaam') && r.includes('Naam') && r.includes('Functie'));
  if (headerIndex < 0) throw new Error('Roster header not found');
  const header = rows[headerIndex]; const col = (name:string) => header.indexOf(name);
  const allowed = new Set(['Voornaam','Naam','Functie','Shirt nummer']);
  // The allow-list above is deliberate: no other exported column can enter returned objects.
  if (![...allowed].every((h) => col(h)>=0)) throw new Error('Roster missing required columns');
  const people = rows.slice(headerIndex+1).filter((r) => r[col('Voornaam')] && r[col('Naam')]).map((r) => ({ firstName:r[col('Voornaam')], lastName:r[col('Naam')], role:r[col('Functie')], shirtNumber:r[col('Shirt nummer')] || null }));
  return { players: people.filter((p) => p.role === 'Speler'), staffNames: people.filter((p) => p.role !== 'Speler').map((p) => `${p.firstName} ${p.lastName}`) };
}

export function readRoster(path: string) { return parseRosterCsv(readFileSync(path, 'utf8')); }
