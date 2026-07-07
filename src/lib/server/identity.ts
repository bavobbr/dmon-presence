import type { AppDatabase } from './db.js';
import { nameKeys, normalizeName, resolveName } from '../core/names.js';

export function ensurePlayer(db:AppDatabase,datasetId:string,source:'roster'|'twizzit'|'sportlink',displayName:string,firstName?:string,lastName?:string,kind:'core'|'substitute'='substitute',role='Speler',shirtNumber:string|null=null,aliases:Record<string,string>={}) {
  const existing=db.prepare(`SELECT p.id,p.first_name firstName,p.last_name lastName FROM players p JOIN memberships m ON m.player_id=p.id WHERE m.dataset_id=?`).all(datasetId) as Array<{id:number;firstName:string;lastName:string}>;
  const sourceKey=normalizeName(displayName);
  const known=db.prepare(`SELECT player_id id FROM source_identities WHERE dataset_id=? AND source=? AND source_key=?`).get(datasetId,source,sourceKey) as {id:number}|undefined;
  if (known) { if(kind==='core')db.prepare(`UPDATE memberships SET kind='core',role=?,shirt_number=COALESCE(?,shirt_number) WHERE dataset_id=? AND player_id=?`).run(role,shirtNumber,datasetId,known.id); return { id:known.id, status:'matched' as const }; }
  const found=resolveName(displayName,existing,aliases);
  if (found.status==='matched') { db.prepare(`INSERT OR IGNORE INTO source_identities VALUES(?,?,?,?,?)`).run(datasetId,source,sourceKey,found.player.id,displayName); return {id:found.player.id,status:'matched' as const}; }
  if (found.status==='ambiguous') { db.prepare(`INSERT INTO quality_issues(dataset_id,source,code,severity,message,source_ref,created_at) VALUES(?,?,?,'error',?,?,?)`).run(datasetId,source,'ambiguous_player',`Ambiguous source identity requires a YAML alias: ${displayName}`,sourceKey,new Date().toISOString()); return {id:null,status:'ambiguous' as const}; }
  if (!firstName || !lastName) {
    const parts=displayName.trim().split(/\s+/); firstName=parts.slice(0,-1).join(' ')||parts[0]; lastName=parts.slice(-1)[0];
  }
  const normalized=nameKeys(firstName,lastName)[0];
  const result=db.prepare(`INSERT INTO players(first_name,last_name,normalized_name) VALUES(?,?,?) ON CONFLICT(first_name,last_name) DO UPDATE SET normalized_name=excluded.normalized_name RETURNING id`).get(firstName,lastName,normalized) as {id:number};
  db.prepare(`INSERT INTO memberships(dataset_id,player_id,kind,role,shirt_number) VALUES(?,?,?,?,?) ON CONFLICT(dataset_id,player_id) DO UPDATE SET kind=CASE WHEN excluded.kind='core' THEN 'core' ELSE memberships.kind END, role=excluded.role, shirt_number=COALESCE(excluded.shirt_number,memberships.shirt_number)`).run(datasetId,result.id,kind,role,shirtNumber);
  db.prepare(`INSERT OR REPLACE INTO source_identities VALUES(?,?,?,?,?)`).run(datasetId,source,sourceKey,result.id,displayName);
  return {id:result.id,status:found.status};
}
