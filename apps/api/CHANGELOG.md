# Changelog

## [1.1.0](https://github.com/ben-m-hide/console/compare/api-v1.0.0...api-v1.1.0) (2026-08-14)


### Features

* **api:** add GET /api/v1/competitions, the first real route ([348bab5](https://github.com/ben-m-hide/console/commit/348bab55e9dd19722624d2ea24e05c5202302d9b))
* **api:** rate limit public endpoints ([c76daf2](https://github.com/ben-m-hide/console/commit/c76daf2501afeb3fe1a3dc71b5bb71c4df76afc5))
* **ingestion,api:** ingest players/player_season_stats, add GET /players/compare ([0d509f4](https://github.com/ben-m-hide/console/commit/0d509f432b77607f76fb9c8935ffc8eaabda1444))
* **shared:** add Zod schemas for Phase 1, per-directory CLAUDE.md docs ([#17](https://github.com/ben-m-hide/console/issues/17)) ([eed07f2](https://github.com/ben-m-hide/console/commit/eed07f2329a88c718dadf6050abecefc2465cb0c))


### Bug Fixes

* **api:** route the 404 fallback through the error envelope ([f0f567a](https://github.com/ben-m-hide/console/commit/f0f567aee385104fc3a90ab633be957466c8a0de))

## 1.0.0 (2026-08-11)


### Features

* reconcile PROJECT.md brainstorm and restructure into apps/+packages/ workspaces ([5057f62](https://github.com/ben-m-hide/console/commit/5057f621957ccfb0b7e54424d49e1b31f5bd555e))
