import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { calculateMetrics, metric } from '../src/lib/core/scoring';
import { openDatabase } from '../src/lib/server/db';
import { ensurePlayer } from '../src/lib/server/identity';

const path='/tmp/dmon-source-behavior.sqlite3';
afterEach(()=>rmSync(path,{force:true}));

describe('missing source and identity behavior',()=>{
  it('keeps all source denominators independent and excludes failed events',()=>{
    const result=calculateMetrics([
      {type:'match',side:'home',twizzitScorable:false,sportlinkScorable:true,appeared:true},
      {type:'match',side:'away',twizzitScorable:true,sportlinkScorable:false,attendance:undefined,appeared:false},
      {type:'training',side:null,twizzitScorable:false,sportlinkScorable:false,attendance:'yes'}
    ] as any);
    expect(result.appearances).toEqual(metric(1,1));
    expect(result.availability).toEqual(metric(0,1));
    expect(result.matchAdmin).toEqual(metric(0,1));
    expect(result.training).toEqual(metric(0,0));
  });

  it('classifies source-only people as substitutes and keeps matched roster members core',()=>{
    const db=openDatabase(path);
    db.prepare(`INSERT INTO datasets(id,display_name,season,start_date,end_date,timezone,config_path) VALUES('d','D','S','2025-01-01','2025-12-31','Europe/Brussels','x')`).run();
    const core=ensurePlayer(db,'d','roster','Alex Example','Alex','Example','core');
    const same=ensurePlayer(db,'d','twizzit','Example Alex');
    const guest=ensurePlayer(db,'d','sportlink','Casey Guest');
    expect(same.id).toBe(core.id);
    expect(db.prepare(`SELECT kind FROM memberships WHERE player_id=?`).pluck().get(core.id)).toBe('core');
    expect(db.prepare(`SELECT kind FROM memberships WHERE player_id=?`).pluck().get(guest.id)).toBe('substitute');
    db.close();
  });
});
