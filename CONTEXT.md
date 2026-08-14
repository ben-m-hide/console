# console-next — Football Analytics

Domain language for the football-analytics platform: ingesting competition/match data from Sportmonks, storing it in Postgres, and serving match-report/player-comparison views. Single context — no `CONTEXT-MAP.md` needed.

## Language

**Competition**:
A tournament or league a Team competes in across one or more Seasons (e.g. "Premier League"). Sourced from Sportmonks' `League` entity — this project canonicalizes on "Competition" throughout the schema, code, and docs.
_Avoid_: League (Sportmonks' own term for the same entity — fine when quoting their API/docs directly, not otherwise)

**Season**:
A single competitive cycle of a Competition (e.g. "2025/26 Premier League"), with a start/end date and a current-or-not flag.
_Avoid_: Campaign, year

**Team**:
A club that competes in Fixtures. Reference data only — no roster is implied by the Team record itself (see SquadMembership).
_Avoid_: Club

**Player**:
An individual footballer. Reference data only — their participation for a given Team/Season is tracked separately (see SquadMembership).

**SquadMembership**:
The link between a Player, a Team, and a Season, including shirt number and join/leave dates. Exists specifically to handle mid-season transfers cleanly — one Player can have two SquadMemberships in the same Season if they moved clubs.
_Avoid_: Roster, transfer

**Fixture**:
A single scheduled match between two Teams within a Season, with kickoff time, status, and score.
_Avoid_: Match, game

**MatchEvent**:
A single in-match occurrence tied to a Fixture — a pass, shot, touch, or defensive action — carrying a type, minute, and (where applicable) outcome/body part/situation/related player (e.g. a pass's receiver). Does not carry pitch coordinates or per-event xG — confirmed absent from Sportmonks' data.
_Avoid_: Event (too generic outside this context)

**BallPosition**:
One sampled point (x/y, minute, period) in a Fixture's whole-match ball-tracking feed. Not tied to any Player or team side — a single shared trajectory, not a per-player touch map.
_Avoid_: Ball coordinate, tracking point

**PlayerSeasonStats**:
A materialized, per-Player-per-Team-per-Season aggregate of a Player's stats (goals, assists, minutes, xG, xA, and their per-90 equivalents), recomputed during ingestion rather than queried live. Keyed by Player+Team+Season, not Player+Season alone, specifically to give a mid-season transfer its own row per club stint.
_Avoid_: Season stats, aggregate

**IngestionRun**:
An audit record of one execution of the ingestion job, in one of four states — `running`, `success`, `partial`, `failed` — plus per-Fixture processed/failed counts. `partial` exists specifically so one bad Fixture doesn't collapse a mostly-successful run into a single failure bit.
_Avoid_: Sync, job run

**Sportmonks ID**:
The identifier Sportmonks assigns to an entity in its own system, stored alongside — never replacing — this project's own internal identity-column id. Every Sportmonks-sourced table upserts on its Sportmonks ID rather than blind-inserting; this is the mechanism idempotent re-ingestion depends on.
_Avoid_: External ID, source ID

**Percentile Baseline**:
The reference population a Player's stat is ranked against on the Player Comparison view: same position, same Competition, same Season, minimum 450 minutes played.
_Avoid_: Peer group, cohort
