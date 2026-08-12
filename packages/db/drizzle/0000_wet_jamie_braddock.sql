CREATE TYPE "public"."ingestion_run_status" AS ENUM('running', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TABLE "ball_positions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ball_positions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fixture_id" integer NOT NULL,
	"sportmonks_id" integer NOT NULL,
	"period_id" integer NOT NULL,
	"timer" double precision NOT NULL,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	CONSTRAINT "ball_positions_sportmonks_id_unique" UNIQUE("sportmonks_id")
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "competitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sportmonks_id" integer NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"tier" integer NOT NULL,
	CONSTRAINT "competitions_sportmonks_id_unique" UNIQUE("sportmonks_id")
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fixtures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sportmonks_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"kickoff_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"home_score" integer,
	"away_score" integer,
	CONSTRAINT "fixtures_sportmonks_id_unique" UNIQUE("sportmonks_id")
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ingestion_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" "ingestion_run_status" NOT NULL,
	"competition_id" integer,
	"season_id" integer,
	"fixtures_processed" integer DEFAULT 0 NOT NULL,
	"fixtures_failed" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "match_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fixture_id" integer NOT NULL,
	"sportmonks_event_id" integer NOT NULL,
	"type" text NOT NULL,
	"player_id" integer NOT NULL,
	"related_player_id" integer,
	"minute" integer NOT NULL,
	"outcome" text,
	"body_part" text,
	"situation" text,
	CONSTRAINT "match_events_sportmonks_event_id_unique" UNIQUE("sportmonks_event_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "players_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sportmonks_id" integer NOT NULL,
	"name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"nationality" text NOT NULL,
	"position" text NOT NULL,
	CONSTRAINT "players_sportmonks_id_unique" UNIQUE("sportmonks_id")
);
--> statement-breakpoint
CREATE TABLE "player_season_stats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "player_season_stats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"minutes_played" integer NOT NULL,
	"goals" integer NOT NULL,
	"assists" integer NOT NULL,
	"xg" double precision NOT NULL,
	"xa" double precision NOT NULL,
	"goals_per90" double precision NOT NULL,
	"assists_per90" double precision NOT NULL,
	"xg_per90" double precision NOT NULL,
	"xa_per90" double precision NOT NULL,
	CONSTRAINT "player_season_stats_player_id_team_id_season_id_unique" UNIQUE("player_id","team_id","season_id")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "seasons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sportmonks_id" integer NOT NULL,
	"competition_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_current" boolean NOT NULL,
	CONSTRAINT "seasons_sportmonks_id_unique" UNIQUE("sportmonks_id")
);
--> statement-breakpoint
CREATE TABLE "squad_memberships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "squad_memberships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"player_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"shirt_number" integer,
	"joined_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "teams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sportmonks_id" integer NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"logo_url" text,
	CONSTRAINT "teams_sportmonks_id_unique" UNIQUE("sportmonks_id")
);
--> statement-breakpoint
ALTER TABLE "ball_positions" ADD CONSTRAINT "ball_positions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_related_player_id_players_id_fk" FOREIGN KEY ("related_player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_memberships" ADD CONSTRAINT "squad_memberships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_memberships" ADD CONSTRAINT "squad_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_memberships" ADD CONSTRAINT "squad_memberships_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ball_positions_fixture_id_idx" ON "ball_positions" USING btree ("fixture_id");--> statement-breakpoint
CREATE INDEX "match_events_fixture_id_idx" ON "match_events" USING btree ("fixture_id");--> statement-breakpoint
CREATE INDEX "match_events_fixture_id_type_idx" ON "match_events" USING btree ("fixture_id","type");--> statement-breakpoint
CREATE INDEX "player_season_stats_player_id_season_id_idx" ON "player_season_stats" USING btree ("player_id","season_id");