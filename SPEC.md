# D-MON Presence Dashboard — Product and Technical Specification

## 1. Purpose

Build a local, read-only analytics dashboard for evaluating player activity within a field-hockey team during a season. The first dataset is the D-MON women's team for the 2025/2026 season, but the application must support additional team-season datasets through configuration.

The dashboard combines two sources with different meanings:

- **Twizzit** records what players declared: present, absent, or unknown. It covers training sessions and matches.
- **Sportlink match PDFs** record who officially played, as validated on the match sheet.

These facts must remain separate. The dashboard may compare them, but must never present declared availability as proof of actual participation or assume that an available player who did not appear was not selected.

The application helps its sole user understand participation, administration quality, home/away patterns, and objective activity trends. It does not make selection decisions.

## 2. Initial dataset

- Display team: D-MON Dames
- Twizzit group name: `Dames`
- Sportlink team name: `DMON D-1`
- Season: 2025/2026
- Inclusive start date: 2025-08-25
- Inclusive end date: 2026-06-01
- Roster input: `team.csv`
- Sportlink input directory: `data/`
- Timezone: `Europe/Brussels`
- Date presentation: Belgian day-month-year format

The initial configuration must live in a YAML dataset file. Team names, dates, roster path, and PDF directory must not be hard-coded in application logic.

## 3. Users and deployment

- One user only.
- Run locally on Ubuntu 26.04 LTS.
- Desktop interface only; no mobile-specific layout is required.
- English user interface.
- No application authentication is required.
- The dashboard must bind to `127.0.0.1` by default, not all network interfaces.
- Docker Compose is the supported runtime.
- SQLite data must persist in a bind-mounted local `state/` directory.

## 4. Required architecture

Use a TypeScript stack compatible with the existing sibling project `dmon-team-cal`:

- SvelteKit and Svelte for the dashboard
- Node.js on a supported LTS release
- SQLite for persistent normalized data
- TypeScript command-line ingestion
- Docker and Docker Compose

Separate the system into:

1. Roster ingestion
2. Sportlink PDF ingestion
3. Twizzit ingestion and authenticated scraping
4. Cross-source normalization and matching
5. Read-only dashboard and query layer

The dashboard must never scrape Twizzit or parse PDFs during normal page requests.

## 5. Dataset configuration

Support one or more YAML files under `config/datasets/`. Each dataset must define at least:

- Stable dataset ID
- Display name
- Season label
- Inclusive start and end dates
- Timezone
- Twizzit organization ID or discovery setting
- Twizzit group name
- Sportlink team name
- Roster CSV path
- Sportlink PDF directory

Optional matching or classification overrides may be added where necessary, but the initial dataset should work without hand-editing database records.

One SQLite database may contain multiple datasets. The dashboard must provide team and season selectors. Rankings are always calculated within one selected team-season dataset; no cross-team or cross-season ranking is required.

## 6. Credentials and secrets

Twizzit uses separate credentials for its documented API and authenticated website. Both sets must be read from `.env`:

- `TWIZZIT_API_USERNAME`
- `TWIZZIT_API_PASSWORD`
- `TWIZZIT_SITE_USERNAME`
- `TWIZZIT_SITE_PASSWORD`

Use the API credentials only for `/v2/api/*` authentication. Use the site credentials only for the CSRF-aware website login and attendance scraping flow. Do not assume they are interchangeable.

The supplied Swagger documentation URL may be held in `TWIZZIT_DOCUMENTATION_URL` for developer reference. Credentials, session cookies, JWTs, and raw authentication responses must never be logged or stored in SQLite.

`.env`, source PDFs, the personal roster export, and generated state must be git-ignored. Provide a safe `.env.example` containing placeholders only.

## 7. Roster rules and privacy

`team.csv` is a semicolon-delimited Twizzit export with a possible preamble line before its header.

- Only rows whose `Functie` is exactly `Speler` define core players.
- Staff are excluded from player statistics.
- Import only first name, last name, role, and optional shirt number.
- Never import or copy birth dates, gender, addresses, postcodes, cities, countries, email addresses, or phone numbers.
- A person appearing in Twizzit or Sportlink but not in the core roster is a substitute.
- A name matching known staff must not be added as a substitute.
- Substitutes are stored and visible but excluded from the default ranking. A `Show substitutes` control reveals them.

Name matching must be deterministic and handle Unicode normalization, case, extra whitespace, and known first-name/last-name ordering differences. Do not silently fuzzy-match ambiguous names. Surface unmatched or ambiguous identities in data-quality results and allow explicit aliases in dataset YAML if needed.

## 8. Sportlink PDF ingestion

Each PDF represents one match. The current exports are text-based Sportlink “Game Report” PDFs; OCR is out of scope.

Extract and retain:

- Match date and time
- Home and away team names
- Whether the configured team was home or away
- Opponent
- Competition metadata when available
- Score when available
- Officially listed players for the configured team
- Shirt number and captain marker when available
- Source filename and content hash

Do not count the opposing team's players. Staff and officials are not player appearances.

The importer must:

- Scan the configured directory
- Be idempotent
- Skip unchanged, successfully imported files using a content hash
- Reprocess a changed file safely
- Continue after an individual malformed PDF
- Produce a clear import summary and non-zero exit status when errors require attention
- Record structured import/data-quality issues

Sportlink matches are matched to Twizzit matches by local calendar date. The initial dataset has at most one match per day. If a future dataset creates an ambiguous date match, do not guess; record a data-quality issue.

If a Sportlink PDF exists without a matching Twizzit event, it still counts toward official appearance statistics and is flagged as missing Twizzit data.

## 9. Twizzit ingestion

The enabled Swagger API supplies organizations, seasons, groups, group contacts, contacts, and events but does not expose attendance responses. Attendance must therefore use the authenticated web-session scraping approach proven in `/home/bavobbr/git/dmon-team-cal`.

Reuse or adapt these concepts from that project:

- CSRF-aware login and authenticated session cookie handling
- Session refresh and one retry after expiry
- Group and agenda discovery
- `/v2/activity/details?activity=<id>&view=info`
- Parsing `window.initActivityDetails(...)`
- Extraction of `attendanceContacts` and `attendances`
- Attendance type IDs/names and free-text comments

Do not create a runtime dependency on the sibling repository. Copy and adapt the minimal implementation with attribution in developer documentation where appropriate.

Import only events associated with the configured Twizzit group. Classify training sessions and matches; ignore meetings, social activities, and other agenda items. Classification must be explicit, testable, and overridable in dataset YAML if Twizzit naming changes.

For each included event retain:

- Twizzit event ID
- Event type: training or match
- Start/end date and time
- Name and location/address when available
- Home/away and opponent for matches when available
- Each relevant contact's attendance value: yes, no, or unknown
- Optional attendance comment

An absent attendance record for a core player on an otherwise successfully loaded event means `unknown`.

Each run refreshes the entire configured season and atomically replaces the current Twizzit state for that dataset. Historical answer snapshots are not retained. A failed refresh must not destroy the last complete dataset.

If an entire event cannot be scraped, exclude that event from score denominators and create a prominent data-quality issue. Never convert a scrape failure into `unknown` for every player.

If a Twizzit match has no matching Sportlink PDF, flag it during ingestion and exclude it from official-appearance scoring.

## 10. Suggested normalized data model

The implementation may refine names, but must represent these concepts explicitly:

- Datasets/team-seasons
- Players and dataset memberships (`core` or `substitute`)
- Player source identities and aliases
- Events (`training` or `match`)
- Source-specific event identities
- Twizzit attendance responses and comments
- Sportlink official appearances
- Source imports and content hashes
- Structured data-quality issues with severity and resolution state

Preserve source provenance on derived records. Avoid opaque JSON blobs for facts used in scoring and filtering.

## 11. Scoring definitions

All percentages must also show their numerator and denominator, for example `12/17 (70.6%)`.

### 11.1 Training presence

For successfully imported Twizzit training sessions:

- `yes` = present
- `no` = not present
- `unknown` or missing individual response = not present

`training presence = yes responses / scorable training sessions`

This is declared presence, not verified physical attendance, and the UI must say so.

### 11.2 Match availability

For successfully imported Twizzit matches:

- `yes` = available
- `no` = unavailable
- `unknown` or missing individual response = not available

`match availability = yes responses / scorable Twizzit matches`

This score remains separate from official appearances.

### 11.3 Official match appearances

For successfully imported Sportlink matches:

`official appearance = matches on whose configured-team roster the player appears / scorable Sportlink matches`

This is the default match component used by the combined score.

### 11.4 Administration quality

An explicit `yes` or `no` is an answered event. `unknown` is unanswered.

Show separately:

- Training administration quality
- Match administration quality
- Overall Twizzit administration quality

`administration quality = explicit yes-or-no responses / scorable Twizzit events`

Administration quality is not part of the default activity score.

### 11.5 Combined activity score

Default:

`combined = 50% training presence + 50% official match appearances`

Both components are normalized percentages before weighting, so a larger number of training sessions does not dominate the score.

Dashboard controls must allow the user to:

- Adjust training-versus-match weighting
- Adjust home-versus-away match weighting
- Switch the match component from official Sportlink appearances to Twizzit match availability for exploratory analysis

The selected match source replaces the other source; official appearances and availability are never added together in one score.

Weights must be validated and normalized. A configuration with no effective denominator must show `N/A`, not zero. Scoring controls and insight settings may persist in browser local storage only; server-side persistence is not required.

Substitutes, when shown, use the same full-dataset denominators as core players for transparent comparison.

## 12. Objective insights

Generate only transparent, rule-based observations. Examples include:

- High or low declared training presence
- High or low administration quality
- Meaningful home-versus-away appearance difference
- Frequent `yes` match responses without an official appearance
- Official appearances despite `no` or `unknown` Twizzit responses

Do not generate subjective recommendations about whom to select. Every insight must expose the underlying counts or percentages. Thresholds must be adjustable in the dashboard, have sensible documented defaults, and may persist in browser local storage.

## 13. Required dashboard views

### 13.1 Ranking overview — default route

- Default sort: descending combined activity score
- Core players only by default
- Show-substitutes toggle
- Combined score plus separate training presence, official appearances, match availability, and administration metrics
- Counts and percentages
- Home and away appearance breakdown
- Configurable scoring controls
- Objective insight labels
- Sortable metric columns

Do not add player-name search, opponent filtering, CSV export, or arbitrary within-season date filtering.

### 13.2 Monthly trend

- Aggregate by calendar month within the selected season
- Team average by default
- Optionally select one player for comparison
- Clearly distinguish declared Twizzit presence/availability from official Sportlink appearances

### 13.3 Player detail

- Summary metrics and objective insights
- Chronological history of every included training session and match
- Twizzit response and comment
- Official appearance status
- Home/away and opponent for matches
- Clear source labels and missing-data indicators

### 13.4 Match detail and comparison

Show Twizzit availability beside Sportlink official participation. Group or label players as:

- Available and officially played
- Available but not recorded as played
- Officially played despite `no`
- Officially played despite `unknown`
- Unavailable or unknown and did not play

Never label “available but not recorded as played” as “not selected” without a source that proves selection status.

### 13.5 Training view

- Session list and monthly summary
- Per-player yes/no/unknown values
- Comments when present
- Declared-presence and administration-quality summaries

### 13.6 Data-quality view

Show actionable issues, including:

- Failed PDF parses
- Failed Twizzit event scrapes
- Twizzit matches missing Sportlink PDFs
- Sportlink matches missing Twizzit events
- Unmatched or ambiguous players
- Ambiguous event matches
- Unsupported or unknown attendance values
- Last successful import timestamps

## 14. Filtering behavior

- Dataset selector chooses one team-season.
- Statistics cover the complete configured season; there is no arbitrary date-range filter.
- Provide training-only, match-only, and combined ranking modes.
- Home/away views and weighting must recompute applicable match statistics.
- Opponent filtering is not required.

## 15. Docker and commands

Provide documented commands equivalent to:

```bash
docker compose build
docker compose run --rm ingest --dataset config/datasets/dmon-dames-2025-2026.yaml
docker compose up dashboard
docker compose run --rm test
```

Exact service names may differ only if the README documents equally simple commands. The dashboard must be reachable on a documented localhost URL. Source inputs should be mounted read-only; only `state/` should require persistent writes.

## 16. Reliability and observability

- Ingestion must be repeatable and transactional.
- Log progress and concise summaries without secrets or sensitive payloads.
- Apply explicit network timeouts and bounded retries.
- Respect Twizzit rate limits; avoid unnecessary repeated requests.
- Cache a session only for the lifetime needed by an ingestion run.
- Return non-zero process status for incomplete or failed ingestion while preserving successfully diagnosed issues.
- The dashboard must continue to serve the last complete data after a failed refresh.

## 17. Testing requirements

Use synthetic or anonymized fixtures in version control; never commit the supplied personal roster or real PDFs.

At minimum, implement:

- Unit tests for roster parsing and PII field exclusion
- Unit tests for Sportlink PDF text parsing, including home and away reports
- Fixture-based tests for Twizzit's embedded attendance parser
- Tests for yes/no/unknown mapping and missing individual responses
- Tests for player normalization, aliases, substitutes, and staff exclusion
- Tests for date-based cross-source event matching and ambiguity handling
- Tests for every scoring formula, weights, empty denominators, and rounding
- Tests for administration-quality calculations
- Tests for ingestion idempotency and atomic replacement
- Tests for all specified missing-source and failed-event behavior
- Dashboard integration tests for the default ranking, dataset selection, scoring controls, and detail navigation
- At least one end-to-end smoke test running against a seeded synthetic SQLite database

The full test suite must run inside Docker without access to live Twizzit.

## 18. Documentation requirements

Provide a README covering:

- Architecture and source semantics
- Prerequisites
- `.env` setup
- Dataset YAML setup
- Docker build, ingestion, dashboard, and test commands
- How to add another team or season
- Scoring formulas and defaults
- Data-quality interpretation
- Twizzit scraper maintenance and fixture update procedure
- Privacy warning for roster exports, PDFs, comments, and the SQLite database
- Backup/removal of local state

## 19. Explicitly out of scope

- Editing attendance or player data in the dashboard
- Writing anything back to Twizzit or Sportlink
- Live scraping from dashboard requests
- Scheduled ingestion
- Historical snapshots of changed Twizzit answers
- OCR for scanned PDFs
- Multi-user access or application authentication
- Public/network deployment
- Mobile-specific UX
- CSV/Excel export
- Opponent filtering
- Arbitrary within-season date filtering
- Subjective player-selection recommendations

## 20. Acceptance criteria

The implementation is complete only when:

1. Docker Compose builds successfully on Ubuntu 26.04 LTS.
2. The documented ingestion command imports the configured roster, every readable PDF in `data/`, and the complete Twizzit season.
3. Re-running ingestion is safe and does not duplicate records.
4. Failed refreshes do not destroy the last complete Twizzit dataset.
5. No roster PII beyond names, role, and shirt number is stored.
6. Core players and substitutes are classified according to this specification.
7. Twizzit declarations and Sportlink appearances remain distinct and traceable.
8. Missing or failed source data is excluded from the correct denominator and shown in data quality.
9. The default ranking uses the 50/50 training-presence and official-appearance score.
10. All separate metrics, administration quality, counts, percentages, and home/away splits are visible.
11. Dashboard weighting, source toggle, substitute toggle, and insight thresholds work and recalculate results correctly.
12. Monthly trends, player details, match comparisons, training details, and data-quality views work.
13. Multiple configured team-season datasets can coexist and be selected independently.
14. The dashboard binds to localhost and reads persisted SQLite data.
15. The complete automated test suite passes in Docker without live external access.
16. No credentials, session values, source PDFs, personal roster exports, or generated databases are committed.
17. README instructions are sufficient for a clean local setup and for adding another dataset.
