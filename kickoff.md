# Kickoff write-up: D-MON Presence Dashboard

## Original product prompt that started the spec

This was the initial product-requirements prompt that started the specification process:

```text
Ok, we will create a dashboard that renders data on presence of our Women fieldhockey team in past gamne season of 2025/2026. I will provide multiple sources of data: one is static PDF files that containe match info, so we can learn which members played when and where. Another source will be the Twizzir API with auth, where we can query presence via their agenda for training and matches as well. Note that these are the same matches, but data may be a bit different: in Twizzit (our club ERP) the names are there for those who announced presense (yes, no, unknown). In the PDF export which comes from Sportlink (Federation ERP) this is the names of those who actually played, as approved by the umpire. We need both sources as it might be that there were more players than allowed, and we want to know who wanted to play but didnt get selected as well. We will also analyze training presence via Twizzit. The app will visualize this data in different views: training only, match only, combined etc. The goal of the app is to see which players were most active in the team, and make decision based on that. Data can be persisted and refreshed (new scan of Twizzit API). The PDf analysis can be static and upfront, it doesnt need to be in the app at runtime. Actually, new data could be ingested, but can be a seperate script or agent session. It doenst needto be via the app itself, that can focus on rendering data and providing useful filters.
```

Immediately after that, you asked to proceed by asking questions one by one.

## Implementation handoff prompt

Use this prompt to start a fresh Codex session for implementation:

```text
We are in /home/bavobbr/git/dmon-presence.

Please implement the complete D-MON Presence Dashboard described in SPEC.md.

First, read GOAL.md completely and create/use it as the completion goal for this session. Then read SPEC.md completely and implement the application until the definition of done in GOAL.md is satisfied.

Important constraints:
- Do not commit or expose secrets, source PDFs, team.csv personal data, attendance comments, or generated SQLite/state data.
- Use .env for Twizzit credentials.
- Inspect /home/bavobbr/git/dmon-team-cal for the prior Twizzit login and attendance scraping approach, but do not create a runtime dependency on that repository.
- Keep Twizzit declared availability and Sportlink official appearances separate in the data model, calculations, and UI.
- Use Docker Compose as the supported runtime and verify the finished system through Docker commands.
- Continue unattended until the app is usable locally, tests pass, ingestion works, and the dashboard renders the real imported dataset.
```

## What we set out to do

The goal of this session was not to build the dashboard immediately. The goal was to prepare a strong implementation handoff for a later Codex session: a detailed product and technical specification plus a clear completion goal.

The intended result was a project directory that another Codex session can pick up and implement unattended, without needing to rediscover the decisions made during planning.

## Product idea

We defined a local dashboard for analyzing presence and activity of the D-MON women’s field hockey team during the 2025/2026 season.

The dashboard combines several sources:

- Sportlink PDF match reports, one PDF per match, stored in `data/`
- Twizzit training and match attendance data
- The existing `team.csv` roster export
- Prior Twizzit scraping knowledge from `/home/bavobbr/git/dmon-team-cal`

The key product requirement is that the dashboard must preserve the difference between the data sources:

- Twizzit says what a player declared: yes, no, or unknown.
- Sportlink says who officially appeared on the match sheet.

Those two meanings must stay separate. Twizzit availability is not proof of playing. Sportlink appearance is the official match participation source.

## How we approached it

We worked through the specification one decision at a time. You explicitly asked for questions one by one, so the session was structured as an incremental interview rather than a large up-front questionnaire.

We clarified the major axes of the project:

- target user and deployment model
- source data
- ingestion strategy
- scoring semantics
- treatment of unknown attendance
- roster and substitute handling
- home/away match handling
- dashboard views
- persistence
- configuration
- Docker/runtime expectations
- privacy and git-ignore requirements
- Codex handoff format

The resulting approach was to separate the system into ingestion and rendering:

1. Import the roster from `team.csv`.
2. Parse Sportlink PDFs up front through an ingestion script.
3. Pull and scrape Twizzit data through an ingestion script.
4. Normalize and match the two sources in SQLite.
5. Render a read-only local dashboard from the stored data.

The dashboard itself should not scrape Twizzit or parse PDFs during normal page requests.

## Main decisions made

The application should be local-only, for one user, with no app-level login. It should bind to localhost by default.

The implementation stack should be TypeScript, SvelteKit, Node.js, SQLite, and Docker Compose.

The initial dataset is:

- display team: D-MON Dames
- Twizzit group name: `Dames`
- Sportlink team name: `DMON D-1`
- season: 2025/2026
- start date: 2025-08-25
- end date: 2026-06-01
- timezone: `Europe/Brussels`
- roster file: `team.csv`
- PDF directory: `data/`

The implementation should support future team-season datasets through YAML configuration, rather than hard-coding these values.

The core roster comes from `team.csv`, but only rows where `Functie` is exactly `Speler` count as core players. Staff should be excluded. Players found in Sportlink or Twizzit but not in the core roster are substitutes and should be labelled as such.

Scoring should support separate and combined views. The default combined score is a 50/50 score using:

- Twizzit training presence percentage
- Sportlink official match appearance percentage

Twizzit match availability should be available as comparison data, but should not be combined with Sportlink match appearance by default because that would double-count matches.

Unknown Twizzit attendance counts as absent for presence, but administration quality should be tracked separately. A declared `no` is better than an unknown response from the trainers’ perspective.

Home/away status matters and should be retained. The dashboard should allow home/away breakdowns and support adjustable home/away weighting.

Attendance comments/reasons from Twizzit should be imported and displayed as contextual data.

The dashboard should include:

- ranking overview
- separate training and match views
- combined score view
- player detail
- match detail/comparison
- monthly trend view
- data-quality view

No mobile-specific UI, CSV export, opponent filtering, or historical Twizzit snapshots are required.

## Twizzit and scraping decision

The Twizzit Swagger/API documentation was considered useful, but attendance responses may not be available through the documented API.

Because of that, the spec explicitly references the existing project at:

`/home/bavobbr/git/dmon-team-cal`

That project already contains working logic for logging into the Twizzit website and scraping activity attendance details. The new project should inspect and reuse the minimal proven approach from there, without creating a runtime dependency on that repository.

The `.env` file should contain separate credentials for API and website access:

- `TWIZZIT_API_USERNAME`
- `TWIZZIT_API_PASSWORD`
- `TWIZZIT_SITE_USERNAME`
- `TWIZZIT_SITE_PASSWORD`

Secrets must not be logged, stored in SQLite, or committed.

## Privacy and repository hygiene

We agreed that sensitive local inputs and generated data should be ignored by git.

The project should not commit:

- `.env`
- source PDFs
- `team.csv`
- SQLite databases
- generated state
- personal contact data from the roster
- raw authentication/session data

Only the minimal roster fields needed for analysis should be imported: first name, last name, role, and optional shirt number.

## How the session ended

The planning phase ended with two handoff files in the project:

- [SPEC.md](/home/bavobbr/git/dmon-presence/SPEC.md)
- [GOAL.md](/home/bavobbr/git/dmon-presence/GOAL.md)

`SPEC.md` is the authoritative product and technical specification.

`GOAL.md` is the Codex-oriented completion goal for an unattended implementation session.

This `kickoff.md` file adds the process summary and a reusable starting prompt for the next session.

The project is ready to be handed to a fresh Codex implementation session by pointing it at `GOAL.md` and `SPEC.md`.
