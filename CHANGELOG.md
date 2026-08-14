# Changelog

## [1.2.0](https://github.com/ben-m-hide/console/compare/console-next-v1.1.0...console-next-v1.2.0) (2026-08-14)


### Features

* add a commit skill for consistent commit/branch/PR conventions ([aecad1a](https://github.com/ben-m-hide/console/commit/aecad1a52c9a887b2a3e205f72735349be98254b))
* add Claude Code skills and a dedicated e2e workspace package ([68e0e3c](https://github.com/ben-m-hide/console/commit/68e0e3cc61d3a14154a6667241487eec6a5e3c23))
* add Hono API workspace, doc suite, and fix real CI/CSP bugs found by review ([a1d30dc](https://github.com/ben-m-hide/console/commit/a1d30dca0f15572d38e485a40ed6900297440bdc))
* **api:** add GET /api/v1/competitions, the first real route ([348bab5](https://github.com/ben-m-hide/console/commit/348bab55e9dd19722624d2ea24e05c5202302d9b))
* **api:** rate limit public endpoints ([c76daf2](https://github.com/ben-m-hide/console/commit/c76daf2501afeb3fe1a3dc71b5bb71c4df76afc5))
* **db:** add Drizzle schema for Phase 2, new packages/db workspace package ([#18](https://github.com/ben-m-hide/console/issues/18)) ([b01b9d4](https://github.com/ben-m-hide/console/commit/b01b9d436e5c490ffa37943d328f0c076149887f))
* **ingestion,api:** ingest players/player_season_stats, add GET /players/compare ([0d509f4](https://github.com/ben-m-hide/console/commit/0d509f432b77607f76fb9c8935ffc8eaabda1444))
* **ingestion:** first real Sportmonks vertical slice — competitions ([6c7c5d6](https://github.com/ben-m-hide/console/commit/6c7c5d63226ca04d033439bd5bab705a5a4326c5))
* **ingestion:** generalize players/stats backfill to Bundesliga, La Liga, Community Shield ([2b7d206](https://github.com/ben-m-hide/console/commit/2b7d2066cb6c2446f6e20f6100d72157a5a96a01))
* **ingestion:** ingest teams and fixtures for each competition's current season ([a935658](https://github.com/ben-m-hide/console/commit/a9356589647cfc68d8a3c2979ccb78c4c4139b88))
* **ingestion:** second real Sportmonks vertical slice — seasons ([928c3eb](https://github.com/ben-m-hide/console/commit/928c3eb591b889ff4d52e3f69af9d1f3b8331d1e))
* migrate to Mantine, harden CI/quality gates, scaffold AWS hosting infra ([93b1b46](https://github.com/ben-m-hide/console/commit/93b1b46d98a985324d96550df61b288dbb542916))
* reconcile PROJECT.md brainstorm and restructure into apps/+packages/ workspaces ([5057f62](https://github.com/ben-m-hide/console/commit/5057f621957ccfb0b7e54424d49e1b31f5bd555e))
* scaffold apps/ingestion and packages/shared ([ab39078](https://github.com/ben-m-hide/console/commit/ab39078bc8987e4118dd40458986edcb838963ba))
* scaffold apps/ingestion and packages/shared ([34a609d](https://github.com/ben-m-hide/console/commit/34a609dd6d1e602c2833cec85dadcf6c339ef022))
* **shared:** add Zod schemas for Phase 1 entities ([#15](https://github.com/ben-m-hide/console/issues/15)) ([803bd9d](https://github.com/ben-m-hide/console/commit/803bd9d6028cab01c843b43d63e3246bf2fbbd91))
* **shared:** add Zod schemas for Phase 1, per-directory CLAUDE.md docs ([#17](https://github.com/ben-m-hide/console/issues/17)) ([eed07f2](https://github.com/ben-m-hide/console/commit/eed07f2329a88c718dadf6050abecefc2465cb0c))
* wire packages/e2e into CI ([27fe9ce](https://github.com/ben-m-hide/console/commit/27fe9ceb16d32071293b1683e19fa53a458ecfae))


### Bug Fixes

* **api:** route the 404 fallback through the error envelope ([f0f567a](https://github.com/ben-m-hide/console/commit/f0f567aee385104fc3a90ab633be957466c8a0de))
* apply inline-type and named-return conventions to ingestion + db client ([e7a91a5](https://github.com/ben-m-hide/console/commit/e7a91a52382010ebebfbce98538154d1b89f9b10))
* **db:** drop competitions.tier — no Sportmonks source, unused ([298890e](https://github.com/ben-m-hide/console/commit/298890e25b061de464c55d68669b1e3979d00f14))
* **db:** drop player_season_stats.xa/xaPer90 — no data source ([673e0d3](https://github.com/ben-m-hide/console/commit/673e0d332e6d8a0e2d37a8d31671090738e056e7))
* **db:** squad_memberships upsert bug + doc gaps found in review ([#22](https://github.com/ben-m-hide/console/issues/22)) ([25ce880](https://github.com/ben-m-hide/console/commit/25ce880388b560a5cbada1d78cd1e1e8abe34490))
* exclude pinned packages from Dependabot grouping ([9746c9c](https://github.com/ben-m-hide/console/commit/9746c9c7d07fb0b159fd75386d5997cf9c7e0eca))
* **ingestion:** rename cryptic map callback param, document framework-idiom carve-out ([7b94112](https://github.com/ben-m-hide/console/commit/7b941127939b9d8e042bb69f6dea88c707922f41))
* pin nanoid to 3.3.18 via overrides, clears bun audit high ([770d6c9](https://github.com/ben-m-hide/console/commit/770d6c9cd1c1dfc98e4b7371e2fb3a68c31954e2))

## [1.1.0](https://github.com/ben-m-hide/console/compare/console-next-v1.0.0...console-next-v1.1.0) (2026-08-12)


### Features

* scaffold apps/ingestion and packages/shared ([ab39078](https://github.com/ben-m-hide/console/commit/ab39078bc8987e4118dd40458986edcb838963ba))
* scaffold apps/ingestion and packages/shared ([34a609d](https://github.com/ben-m-hide/console/commit/34a609dd6d1e602c2833cec85dadcf6c339ef022))
* wire packages/e2e into CI ([27fe9ce](https://github.com/ben-m-hide/console/commit/27fe9ceb16d32071293b1683e19fa53a458ecfae))

## 1.0.0 (2026-08-11)


### Features

* add Claude Code skills and a dedicated e2e workspace package ([68e0e3c](https://github.com/ben-m-hide/console/commit/68e0e3cc61d3a14154a6667241487eec6a5e3c23))
* add Hono API workspace, doc suite, and fix real CI/CSP bugs found by review ([a1d30dc](https://github.com/ben-m-hide/console/commit/a1d30dca0f15572d38e485a40ed6900297440bdc))
* migrate to Mantine, harden CI/quality gates, scaffold AWS hosting infra ([93b1b46](https://github.com/ben-m-hide/console/commit/93b1b46d98a985324d96550df61b288dbb542916))
* reconcile PROJECT.md brainstorm and restructure into apps/+packages/ workspaces ([5057f62](https://github.com/ben-m-hide/console/commit/5057f621957ccfb0b7e54424d49e1b31f5bd555e))


### Bug Fixes

* exclude pinned packages from Dependabot grouping ([9746c9c](https://github.com/ben-m-hide/console/commit/9746c9c7d07fb0b159fd75386d5997cf9c7e0eca))
