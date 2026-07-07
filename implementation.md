# Implementation write-up: D-MON Presence Dashboard

## Starting point

This implementation session started from the planning work captured in [kickoff.md](/home/bavobbr/git/dmon-presence/kickoff.md), [SPEC.md](/home/bavobbr/git/dmon-presence/SPEC.md), and [GOAL.md](/home/bavobbr/git/dmon-presence/GOAL.md).

The important setup was that the dashboard was not meant to be a generic attendance toy app. It had a very specific data story:

- Twizzit records what players declared for trainings and matches.
- Sportlink PDFs record who officially appeared on the match sheet.
- The team roster defines the core team.
- Players appearing in the source data but not in the roster are substitutes.

The main rule from the specification was that these meanings had to stay separate. A Twizzit “yes” means available or present according to the club administration. A Sportlink appearance means the player officially played. The dashboard may compare those facts, but it must not collapse them into one vague attendance number.

## How the work was started

The session began by turning [GOAL.md](/home/bavobbr/git/dmon-presence/GOAL.md) into the active completion target.

The execution instruction was to continue until the system was actually usable, not merely planned or scaffolded. That meant the work had to include:

- reading the full specification;
- implementing the application;
- ingesting the initial data;
- keeping sensitive local files out of git;
- testing the ingestion and dashboard;
- verifying the Docker-based runtime;
- documenting how to run and maintain it.

The specification was treated as the authoritative source. When implementation choices were needed, they were made inside the boundaries described in the goal: keep the product semantics intact, avoid exposing private data, do not mutate external systems, and make reasonable technical decisions where the spec intentionally left room.

## What was built in the first implementation phase

The first phase produced the complete local dashboard application.

The project was implemented with the stack selected during planning:

- SvelteKit and TypeScript for the dashboard;
- SQLite for normalized local persistence;
- command-line ingestion scripts;
- Docker Compose as the supported runtime;
- a YAML dataset configuration for the D-MON Dames 2025/2026 season.

The implementation separated ingestion from rendering. The dashboard reads from SQLite. It does not parse PDFs or scrape Twizzit during normal page loads.

The ingestion pipeline was built in three main parts:

1. Import the core roster from `team.csv`, keeping only the fields needed for analysis.
2. Parse Sportlink match PDFs and store official match appearances.
3. Load Twizzit events and attendance responses, using the prior scraping approach from the sibling project as a reference without creating a runtime dependency.

The data model preserves the different source meanings. It stores datasets, players, core/substitute membership, events, Twizzit attendance, Sportlink appearances, imports, aliases, and data-quality issues.

The dashboard views were then built around those normalized facts:

- activity ranking;
- training-focused view;
- match-focused view;
- monthly trends;
- player detail pages;
- match detail pages;
- data-quality view.

The first completed version also included documentation and test coverage. Because Docker was required by the goal, the app was verified through the documented Docker workflow, including ingestion, tests, and a local smoke test of the dashboard with the real imported dataset.

## What the first version already handled

The completed baseline handled the core product concerns from the specification:

- Twizzit training presence stayed separate from Sportlink official appearances.
- Twizzit match availability stayed available as comparison data.
- Combined activity scoring used the intended default: training presence plus official match appearance.
- Unknown Twizzit answers counted as not present for presence scoring, while administration quality was tracked separately.
- Home and away match information was retained.
- Substitutes were stored and visible without being treated as normal core-team members by default.
- Data-quality issues were surfaced instead of silently guessing ambiguous or missing information.
- Sensitive inputs and generated state were kept out of the repository.

At that point the application was usable locally and had a documented run path.

## Adjustments after using the real dashboard

After the first version worked, real use exposed several practical issues. These were not failures of the original direction; they were the kind of details that only became obvious once the real data and real screens were visible.

### Captain rows in Sportlink PDFs

One bug appeared in the Sportlink parser: players marked as captain in the Sportlink data could be missed.

The example that exposed this was Lare Hofman. She appeared in match data, but the statistics showed zero appearances. The cause was that the PDF row format had extra captain-related columns that the parser did not handle correctly.

The parser was updated to understand those captain markers, the tests were extended, and the existing local database was re-ingested. After that, captain rows counted correctly as official appearances.

### Home and away needed to be more visible

The first dashboard retained home/away data, but it was not visible enough in the ranking table.

The ranking view was changed to show home and away appearances in separate columns. This made the split easier to scan without opening detail pages.

### Objective insights were too verbose

The original objective insights were useful but visually too heavy. They made the ranking table feel noisy.

The insight text was replaced with compact badges. The dashboard still exposes the explanation, but mostly through hover text and accessible labels. The result is a leaner overview that still flags the important conditions:

- lower training presence;
- lower administration quality;
- home/away imbalance;
- available but not appearing;
- appearing without a matching positive Twizzit reply.

### Monthly trend selected-player bug

The monthly trend view initially showed `Training: N/A%` for every selected player.

That came from a selector mismatch between string and numeric player identifiers. The selected player was not being matched correctly, so the UI had no usable training percentage to display.

The selector handling was fixed, and the formatting was adjusted so unavailable values show as `N/A`, not `N/A%`.

### Core players versus substitutes

The original spec said substitutes should be visible but not mixed into the core-team ranking by default. After using more views, it became clear that this rule needed to apply more consistently across the application.

Several views were adjusted so they focus on core team players by default:

- monthly trend player selection;
- match detail;
- training view;
- related summaries and denominators.

Each of those views can still show substitutes when requested. The key change is that substitutes no longer blend into the normal team view unless the user explicitly asks for them.

### Substitute scoring in match-only ranking

Another issue appeared in the activity ranking when ranking on matches only. Substitutes could display match participation data but still show a zero score.

The underlying reason was semantic: the selected match source mattered. Sportlink official appearances and Twizzit match availability are different measures, and substitutes often only appear in the Sportlink side.

The UI was adjusted to make the active score source clearer. The score header now changes based on the selected ranking mode, so it is visible whether the score is based on activity, training, official appearances, or availability.

### Layout width and noisy admin column

The dashboard also needed more room on large screens. The ranking table could show a horizontal scrollbar even when the browser had enough available width.

The global layout width was increased, and the activity ranking table was made less noisy by simplifying the administration column. The table now shows the overall administration metric directly, while the training/match/overall breakdown remains available on hover.

## Current shape of the application

The result is a local, data-backed dashboard that follows the original product semantics and has already been adjusted based on real use.

The implementation now has two layers of maturity:

1. The planned baseline from [SPEC.md](/home/bavobbr/git/dmon-presence/SPEC.md): ingestion, persistence, scoring, views, Docker runtime, tests, and documentation.
2. The post-implementation refinements from live use: parser fixes, clearer home/away reporting, leaner insights, better substitute handling, monthly trend fixes, and improved table layout.

The most important design decision remained unchanged throughout the session: the dashboard keeps declared availability, declared training presence, and official match appearances as separate facts. That is what makes the data useful instead of just producing one misleading attendance percentage.

