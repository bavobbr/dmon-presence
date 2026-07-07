# Codex Completion Goal

Implement the complete D-MON Presence Dashboard described in `SPEC.md`.

## Required outcome

Deliver a production-quality local application, ingestion pipeline, Docker Compose setup, automated tests, and documentation that satisfy every acceptance criterion in `SPEC.md`.

Do not stop at scaffolding, a prototype, static mock data, or a written plan. Continue through implementation, data ingestion, verification, and documentation until the application is usable locally.

## Execution instructions

1. Read `SPEC.md` completely before making architectural decisions.
2. Inspect the supplied PDFs and roster export without committing or reproducing sensitive contents.
3. Inspect `/home/bavobbr/git/dmon-team-cal` and reuse the minimal proven Twizzit login and attendance-parsing approach without creating a runtime dependency on that repository.
4. Make reasonable implementation decisions that are consistent with the spec. Record material decisions in the README or concise architecture documentation.
5. Keep Twizzit and Sportlink meanings separate throughout the schema, calculations, API responses, and UI.
6. Implement in vertical increments and run relevant tests after each substantial increment.
7. Use synthetic or anonymized test fixtures. Never place live credentials or supplied personal data in tests, snapshots, logs, or tracked files.
8. Use the live Twizzit account only for the final ingestion verification. Never mutate Twizzit data.
9. Preserve the last complete local dataset if an ingestion attempt fails.
10. Verify the finished system through the documented Docker commands, not only host-installed tools.

## Autonomous decision boundaries

Codex may autonomously choose:

- Internal module organization
- Exact SQLite library and migration mechanism
- Styling, charting, and test libraries
- Component layout and visual design
- Sensible objective-insight defaults
- Internal CLI option names
- Additional tests, indexes, validation, and diagnostics

Codex must not autonomously:

- Change product semantics or scoring definitions
- Send writes or mutations to Twizzit or Sportlink
- Expose the dashboard beyond localhost
- Commit credentials, source PDFs, roster PII, attendance comments, or generated data
- Add subjective selection recommendations
- Omit requirements because live data is inconvenient or a scraper is brittle

If a live external dependency blocks verification, implement and test everything possible with fixtures, preserve a precise diagnostic, and exhaust safe read-only investigation before reporting a blocker.

## Definition of done

The goal is complete only when:

- Every acceptance criterion in `SPEC.md` is demonstrably satisfied.
- All automated tests pass inside Docker.
- The initial dataset can be ingested with the documented command.
- The dashboard opens locally and renders the real imported dataset.
- Rankings and detail views have been manually smoke-tested against representative source records.
- `git status` contains no secret or generated-data leakage once a Git repository exists.
- Documentation enables a fresh session to build, ingest, run, test, and extend the application without unstated knowledge.

When starting the implementation session, create a native Codex completion goal from this file and use `SPEC.md` as the authoritative requirements document.
