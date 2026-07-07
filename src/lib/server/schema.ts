export const schema = `
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS datasets (
 id TEXT PRIMARY KEY, display_name TEXT NOT NULL, season TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
 timezone TEXT NOT NULL, config_path TEXT NOT NULL, last_roster_import TEXT, last_sportlink_import TEXT, last_twizzit_import TEXT
);
CREATE TABLE IF NOT EXISTS players (
 id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL, normalized_name TEXT NOT NULL,
 UNIQUE(first_name,last_name)
);
CREATE TABLE IF NOT EXISTS memberships (
 dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE, player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('core','substitute')), role TEXT NOT NULL, shirt_number TEXT,
 PRIMARY KEY(dataset_id,player_id)
);
CREATE TABLE IF NOT EXISTS source_identities (
 dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE, source TEXT NOT NULL CHECK(source IN ('roster','twizzit','sportlink')),
 source_key TEXT NOT NULL, player_id INTEGER NOT NULL REFERENCES players(id), display_name TEXT NOT NULL,
 PRIMARY KEY(dataset_id,source,source_key)
);
CREATE TABLE IF NOT EXISTS events (
 id INTEGER PRIMARY KEY, dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE, event_type TEXT NOT NULL CHECK(event_type IN ('training','match')),
 local_date TEXT NOT NULL, start_at TEXT, end_at TEXT, name TEXT NOT NULL, location TEXT, side TEXT CHECK(side IN ('home','away')),
 opponent TEXT, twizzit_id TEXT, twizzit_scorable INTEGER NOT NULL DEFAULT 0, sportlink_scorable INTEGER NOT NULL DEFAULT 0,
 source_filename TEXT, source_hash TEXT, competition TEXT, score_home INTEGER, score_away INTEGER,
 UNIQUE(dataset_id,twizzit_id), UNIQUE(dataset_id,source_hash)
);
CREATE INDEX IF NOT EXISTS idx_events_dataset_date ON events(dataset_id,local_date);
CREATE TABLE IF NOT EXISTS attendance (
 event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE, player_id INTEGER NOT NULL REFERENCES players(id),
 value TEXT NOT NULL CHECK(value IN ('yes','no','unknown')), comment TEXT, source_value TEXT,
 PRIMARY KEY(event_id,player_id)
);
CREATE TABLE IF NOT EXISTS appearances (
 event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE, player_id INTEGER NOT NULL REFERENCES players(id),
 shirt_number TEXT, captain INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(event_id,player_id)
);
CREATE TABLE IF NOT EXISTS imports (
 id INTEGER PRIMARY KEY, dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE, source TEXT NOT NULL,
 started_at TEXT NOT NULL, completed_at TEXT, status TEXT NOT NULL, summary TEXT
);
CREATE TABLE IF NOT EXISTS quality_issues (
 id INTEGER PRIMARY KEY, dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE, source TEXT NOT NULL, code TEXT NOT NULL,
 severity TEXT NOT NULL CHECK(severity IN ('info','warning','error')), message TEXT NOT NULL, source_ref TEXT,
 resolved INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
`;
