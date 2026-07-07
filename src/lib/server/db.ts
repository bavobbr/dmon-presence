import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { schema } from './schema.js';

export function databasePath() { return resolve(process.env.STATE_DIR ?? 'state', 'presence.sqlite3'); }
export function openDatabase(path=databasePath()) {
  mkdirSync(dirname(path), { recursive:true });
  const db = new Database(path); db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON'); db.exec(schema); return db;
}
export function openReadonlyDatabase(path=databasePath()) { return new Database(path, { readonly:true, fileMustExist:true }); }

export type AppDatabase = ReturnType<typeof openDatabase>;
export function now() { return new Date().toISOString(); }
export function issue(db:AppDatabase,datasetId:string,source:string,code:string,severity:'info'|'warning'|'error',message:string,sourceRef?:string) {
  db.prepare(`INSERT INTO quality_issues(dataset_id,source,code,severity,message,source_ref,created_at) VALUES(?,?,?,?,?,?,?)`).run(datasetId,source,code,severity,message,sourceRef??null,now());
}
