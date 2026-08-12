-- AtosBaby database schema
--
-- Captured by hand (no pg_dump available in the authoring environment) from
-- the `e2e-seed` Neon branch, which was itself branched from `atos-baby-db`
-- production (branch `main`) and then truncated to zero rows. This file is
-- documentation + a disaster-recovery reference for recreating the schema
-- from scratch — it is NOT run automatically by anything. The actual e2e
-- test database is a real Neon branch (see e2e/README.md), not a schema
-- replay of this file.
--
-- If you change the schema in the Neon console, update this file to match
-- in the same PR.

-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE players (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  elo        integer NOT NULL DEFAULT 1000
);

CREATE TABLE matches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_team_a  integer NOT NULL CHECK (score_team_a >= 0),
  score_team_b  integer NOT NULL CHECK (score_team_b >= 0),
  played_at     timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES players(id),
  CONSTRAINT no_draw       CHECK (score_team_a <> score_team_b),
  -- Games are always played to 10 — one side must score exactly 10.
  CONSTRAINT ten_point_win CHECK (score_team_a = 10 OR score_team_b = 10)
);

CREATE INDEX matches_played_at_idx ON matches USING btree (played_at DESC);

CREATE TABLE match_players (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team       character(1) NOT NULL CHECK (team = ANY (ARRAY['A', 'B'])),
  "position" text NOT NULL CHECK ("position" = ANY (ARRAY['attack', 'defense'])),
  elo_before smallint,
  elo_after  smallint,
  CONSTRAINT unique_player_per_match   UNIQUE (match_id, player_id),
  CONSTRAINT unique_position_per_team  UNIQUE (match_id, team, "position")
);

CREATE INDEX match_players_match_id_idx  ON match_players USING btree (match_id);
CREATE INDEX match_players_player_id_idx ON match_players USING btree (player_id);

CREATE TABLE elo_decay_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  week_of    date NOT NULL,
  points     integer NOT NULL DEFAULT -10,
  elo_before integer,
  elo_after  integer,
  applied_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elo_decay_events_player_id_week_of_key UNIQUE (player_id, week_of)
);

-- ============================================================================
-- Views
-- ============================================================================

CREATE VIEW player_stats AS
SELECT
  p.id, p.email, p.first_name, p.last_name,
  count(*) AS matches_played,
  sum(CASE
    WHEN mp.team = 'A' AND m.score_team_a > m.score_team_b THEN 1
    WHEN mp.team = 'B' AND m.score_team_b > m.score_team_a THEN 1
    ELSE 0
  END) AS wins,
  sum(CASE
    WHEN mp.team = 'A' AND m.score_team_a < m.score_team_b THEN 1
    WHEN mp.team = 'B' AND m.score_team_b < m.score_team_a THEN 1
    ELSE 0
  END) AS losses,
  round((100.0 * sum(CASE
    WHEN mp.team = 'A' AND m.score_team_a > m.score_team_b THEN 1
    WHEN mp.team = 'B' AND m.score_team_b > m.score_team_a THEN 1
    ELSE 0
  END)) / count(*), 1) AS win_rate
FROM players p
JOIN match_players mp ON mp.player_id = p.id
JOIN matches m ON m.id = mp.match_id
GROUP BY p.id, p.email, p.first_name, p.last_name;

CREATE VIEW position_stats AS
SELECT
  p.id, p.email, p.first_name, p.last_name, mp."position",
  count(*) AS matches_played,
  sum(CASE
    WHEN mp.team = 'A' AND m.score_team_a > m.score_team_b THEN 1
    WHEN mp.team = 'B' AND m.score_team_b > m.score_team_a THEN 1
    ELSE 0
  END) AS wins,
  sum(CASE
    WHEN mp.team = 'A' AND m.score_team_a < m.score_team_b THEN 1
    WHEN mp.team = 'B' AND m.score_team_b < m.score_team_a THEN 1
    ELSE 0
  END) AS losses,
  round((100.0 * sum(CASE
    WHEN mp.team = 'A' AND m.score_team_a > m.score_team_b THEN 1
    WHEN mp.team = 'B' AND m.score_team_b > m.score_team_a THEN 1
    ELSE 0
  END)) / count(*), 1) AS win_rate
FROM players p
JOIN match_players mp ON mp.player_id = p.id
JOIN matches m ON m.id = mp.match_id
GROUP BY p.id, p.email, p.first_name, p.last_name, mp."position";

CREATE VIEW duo_stats AS
SELECT
  p1.id AS player_a_id, p1.email AS player_a_email, p1.first_name AS player_a_first_name, p1.last_name AS player_a_last_name,
  p2.id AS player_b_id, p2.email AS player_b_email, p2.first_name AS player_b_first_name, p2.last_name AS player_b_last_name,
  count(*) AS matches_played,
  sum(CASE
    WHEN mp1.team = 'A' AND m.score_team_a > m.score_team_b THEN 1
    WHEN mp1.team = 'B' AND m.score_team_b > m.score_team_a THEN 1
    ELSE 0
  END) AS wins,
  sum(CASE
    WHEN mp1.team = 'A' AND m.score_team_a < m.score_team_b THEN 1
    WHEN mp1.team = 'B' AND m.score_team_b < m.score_team_a THEN 1
    ELSE 0
  END) AS losses,
  round((100.0 * sum(CASE
    WHEN mp1.team = 'A' AND m.score_team_a > m.score_team_b THEN 1
    WHEN mp1.team = 'B' AND m.score_team_b > m.score_team_a THEN 1
    ELSE 0
  END)) / count(*), 1) AS win_rate
FROM match_players mp1
JOIN match_players mp2 ON mp2.match_id = mp1.match_id AND mp2.team = mp1.team AND mp2.player_id > mp1.player_id
JOIN players p1 ON p1.id = mp1.player_id
JOIN players p2 ON p2.id = mp2.player_id
JOIN matches m ON m.id = mp1.match_id
GROUP BY p1.id, p1.email, p1.first_name, p1.last_name, p2.id, p2.email, p2.first_name, p2.last_name;

CREATE VIEW match_details AS
SELECT
  m.id, m.score_team_a, m.score_team_b, m.played_at,
  max(CASE WHEN mp.team = 'A' AND mp."position" = 'attack'  THEN p.id::text END) AS team_a_attacker_id,
  max(CASE WHEN mp.team = 'A' AND mp."position" = 'attack'  THEN p.first_name END) AS team_a_attacker_first_name,
  max(CASE WHEN mp.team = 'A' AND mp."position" = 'attack'  THEN p.last_name END)  AS team_a_attacker_last_name,
  max(CASE WHEN mp.team = 'A' AND mp."position" = 'defense' THEN p.id::text END) AS team_a_defender_id,
  max(CASE WHEN mp.team = 'A' AND mp."position" = 'defense' THEN p.first_name END) AS team_a_defender_first_name,
  max(CASE WHEN mp.team = 'A' AND mp."position" = 'defense' THEN p.last_name END)  AS team_a_defender_last_name,
  max(CASE WHEN mp.team = 'B' AND mp."position" = 'attack'  THEN p.id::text END) AS team_b_attacker_id,
  max(CASE WHEN mp.team = 'B' AND mp."position" = 'attack'  THEN p.first_name END) AS team_b_attacker_first_name,
  max(CASE WHEN mp.team = 'B' AND mp."position" = 'attack'  THEN p.last_name END)  AS team_b_attacker_last_name,
  max(CASE WHEN mp.team = 'B' AND mp."position" = 'defense' THEN p.id::text END) AS team_b_defender_id,
  max(CASE WHEN mp.team = 'B' AND mp."position" = 'defense' THEN p.first_name END) AS team_b_defender_first_name,
  max(CASE WHEN mp.team = 'B' AND mp."position" = 'defense' THEN p.last_name END)  AS team_b_defender_last_name
FROM matches m
JOIN match_players mp ON mp.match_id = m.id
JOIN players p ON p.id = mp.player_id
GROUP BY m.id, m.score_team_a, m.score_team_b, m.played_at;
