# D-MON Presence Dashboard

A local, read-only SvelteKit dashboard for comparing declared Twizzit attendance with official Sportlink match-sheet appearances. These sources have deliberately different meanings: Twizzit records what a player declared; Sportlink records who officially appeared. The application never treats availability as proof of participation or infers selection decisions.

## Prerequisites and setup

- Ubuntu 26.04 LTS (the supported host)
- Docker Engine with the Compose v2 plugin
- The private semicolon-delimited roster export at `team.csv`
- Text-based Sportlink Game Report PDFs under `data/`
- Read-only Twizzit API and website credentials

Copy `.env.example` to `.env` and fill all four credential values. API credentials are used only with `/v2/api/*`; website credentials are used only for the CSRF-aware attendance pages. Do not interchange them.

```bash
cp .env.example .env
mkdir -p state
docker compose build
docker compose run --rm ingest --dataset config/datasets/dmon-dames-2025-2026.yaml
docker compose up dashboard
```

Open <http://127.0.0.1:3000>. Compose publishes only on host loopback. The Node process listens on the container interface solely so Docker port forwarding works; it is not exposed on a public host interface.

Run the complete offline test suite with:

```bash
docker compose run --rm test
```

This runs unit/integration tests, Svelte/TypeScript checks, a production build, and a browser smoke test against a synthetic SQLite database. It never contacts Twizzit.

## Architecture

- `src/lib/core`: configuration, roster parsing, deterministic name matching, date matching, and scoring
- `src/lib/server/sportlink.ts`: PDF text extraction through `pdftotext` and fixed-column Game Report parsing
- `src/lib/server/twizzit-api.ts`: JWT API discovery for organizations, seasons, groups, and season events
- `src/lib/server/twizzit-client.ts` and `twizzit-parser.ts`: bounded-timeout CSRF login, in-memory session cookie, one expiry retry, and embedded attendance parsing
- `src/lib/server/ingestion.ts`: source orchestration, idempotent hashes, normalization, matching, diagnostics, and transactional Twizzit replacement
- `src/lib/server/schema.ts`: normalized SQLite schema with source-specific identities, facts, provenance, imports, and quality issues
- `src/lib/server/queries.ts` and `src/routes`: read-only SQLite queries and SvelteKit views

Normal dashboard requests only query the persisted database. They never scrape Twizzit or parse PDFs. The dashboard opens SQLite read-only. Only ingestion writes `state/presence.sqlite3`.

The site-login and `window.initActivityDetails(...)` extraction approach is adapted from the local `dmon-team-cal` project. This repository contains its own minimal implementation and has no runtime dependency on that project. Network calls use explicit 20-second timeouts, one authentication retry, and a small delay between attendance pages. Cookies, JWTs, credentials, and raw authentication responses are never logged or stored.

## Dataset configuration

Each YAML file under `config/datasets/` describes one independently ranked team-season. Required fields are demonstrated by `dmon-dames-2025-2026.yaml`: stable ID, display name, season, inclusive dates, timezone, organization discovery or ID, Twizzit group, Sportlink team, roster path, and PDF directory.

Classification is explicit. `trainingPatterns` and `matchPatterns` classify named events. `nullNameAsTraining` handles Twizzit's recurring training records whose API name is null. Change these only after inspecting the relevant organization's event metadata. Optional `aliases` map a normalized source name to a roster name, for example:

```yaml
aliases:
  liz example: Élise Example
```

To add a team or season:

1. Copy the example YAML and choose a new stable `id`.
2. Point it to private roster/PDF inputs and set source names and inclusive dates.
3. Add explicit classification patterns or aliases only when diagnostics require them.
4. Run the same ingestion command with the new file.

Multiple dataset records coexist in one database and become available in the team-season selector. Scores never cross dataset boundaries.

## Ingestion behavior

Roster parsing tolerates one preamble line and imports only exact `Speler` rows. Its allow-list contains first name, last name, role, and shirt number; birth dates, contact information, addresses, and all other export fields never enter returned objects or SQLite. Known staff are excluded from substitute discovery.

Sportlink imports each readable PDF independently. A SHA-256 content hash skips unchanged successful files; a changed file is safely replaced. Malformed files do not prevent later files from being inspected, but make the command exit non-zero and create a data-quality issue.

Twizzit refreshes the complete configured season. It discovers the matching season/group through the API, restricts events to that group, then loads attendance read-only through the website session. All attendance pages are fetched before the replacement transaction. If any page or the overall refresh fails, the last complete Twizzit facts remain intact and diagnostics are recorded. Missing individual responses on a successfully loaded event become `unknown`; a failed event never becomes a row of artificial unknown responses.

Sportlink and Twizzit matches join only when exactly one event exists on the same Brussels local calendar date. Ambiguity is never guessed. PDFs without Twizzit still count in official denominators; Twizzit matches without PDFs do not count in official denominators. Both cases appear under Data quality.

## Scoring and controls

Every metric displays `numerator/denominator (percentage)` and shows `N/A` for an empty effective denominator.

- Training presence: Twizzit `yes` / successfully loaded training sessions. No, unknown, and missing individual responses are not present.
- Match availability: Twizzit `yes` / successfully loaded Twizzit matches.
- Official appearances: Sportlink roster appearances / successfully parsed Sportlink matches.
- Training, match, and overall administration: explicit Twizzit yes-or-no answers / applicable successfully loaded events.
- Default combined score: 50% normalized training presence + 50% normalized official appearances.

The ranking controls normalize training/match and home/away weights, can switch the match component from official appearances to exploratory Twizzit availability, and provide training-only, match-only, and combined modes. Official appearances and availability are never added together. Substitutes use the same full-season denominators as core players. Controls and objective thresholds persist only in browser local storage.

Default insight thresholds are 50% for low training presence and 70% for low administration quality. Mismatch observations expose event counts. Insights are transparent observations only; they do not recommend selection.

## Data-quality interpretation

The Data quality view reports failed PDF parses, failed attendance pages, unsupported attendance values, ambiguous matches, unmatched identities, and source gaps. `error` means the ingestion command needs attention; `warning` commonly describes valid source coverage gaps, such as a scheduled Twizzit match for which no official PDF exists yet. Last successful timestamps are source-specific.

After resolving a configuration/input problem, rerun ingestion. Current source issues are regenerated, and unchanged PDFs remain idempotent.

## Maintaining the Twizzit scraper

Twizzit website markup is not a documented attendance API. If it changes:

1. Reproduce the problem with one read-only activity page without logging its HTML.
2. Update the bounded object extractor or attendance mapping in `twizzit-parser.ts`.
3. Replace/add an anonymized `tests/fixtures/twizzit-activity.html` sample. Never commit a real page, comment, cookie, contact ID, or name.
4. Run `docker compose run --rm test` before using the live account once for final verification.

API response key normalization is kept in `twizzit-api.ts`; site session behavior is isolated in `twizzit-client.ts`.

## Privacy, backup, and removal

`team.csv`, `.env`, `data/*.pdf`, and `state/` are git-ignored. They contain personal or secret information and must not be copied into fixtures, logs, screenshots, or commits. The SQLite database contains player names and potentially sensitive attendance comments; treat it with the same care as the source files.

Stop the dashboard before backup, then copy the complete state directory:

```bash
docker compose down
cp -a state "state-backup-$(date +%Y%m%d)"
```

To remove all generated local analytics data:

```bash
docker compose down
rm -rf state
mkdir state
```

This application never writes to Twizzit or Sportlink and provides no editing, scheduled ingestion, authentication, public deployment, export, opponent filtering, or arbitrary date filtering.
