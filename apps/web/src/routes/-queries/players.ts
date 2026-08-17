import { PlayerSchema } from "@console-next/shared";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

// Mirrors apps/api's default (build-players-query.ts); no shared package
// exports it across the two runtimes.
export const DEFAULT_PAGE_SIZE = 25;

// Confirmed against real data 2026-08-16 (all ~1,991 players scanned), not guessed.
export const PLAYER_POSITIONS = [
	"Attacker",
	"Defender",
	"Goalkeeper",
	"Midfielder",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

// Also the route's validateSearch schema. `.optional()`'s inferred
// `T | undefined`, not a hand-written `search?: string`, is required by
// exactOptionalPropertyTypes — loaderDeps assigns `undefined` for absent params.
export const PlayersSearchSchema = z.object({
	page: z.number().int().positive().catch(1),
	pageSize: z.number().int().positive().catch(DEFAULT_PAGE_SIZE),
	search: z.string().min(1).optional().catch(undefined),
	position: z.enum(PLAYER_POSITIONS).optional().catch(undefined),
});

export type PlayersSearchParams = z.infer<typeof PlayersSearchSchema>;

const PlayerListMetaSchema = z.object({
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	totalPages: z.number().int().nonnegative(),
});

export type PlayerListMeta = z.infer<typeof PlayerListMetaSchema>;

const PlayerListResponseSchema = z.object({
	data: z.array(PlayerSchema),
	meta: PlayerListMetaSchema,
});

type PlayerListResponse = z.infer<typeof PlayerListResponseSchema>;

const fetchPlayers = async (
	params: PlayersSearchParams,
	signal: AbortSignal,
): Promise<PlayerListResponse> => {
	const query = new URLSearchParams({
		page: String(params.page),
		pageSize: String(params.pageSize),
	});
	if (params.search !== undefined) {
		query.set("search", params.search);
	}
	if (params.position !== undefined) {
		query.set("position", params.position);
	}

	const response = await fetch(`${API_URL}/api/v1/players?${query}`, {
		signal,
	});
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}

	const parsed = PlayerListResponseSchema.safeParse(await response.json());
	if (!parsed.success) {
		throw new Error("Response did not match the expected schema");
	}
	return parsed.data;
};

// Key includes the full param set so a search/position/page change is a
// different cache entry (architecture doc §3 gotcha #1).
// No explicit return type: queryOptions()'s skipToken-sentinel overload isn't
// reproducible by hand without breaking useSuspenseQuery assignability — see
// biome.json's override for this directory.
export const playersQueryOptions = (params: PlayersSearchParams) =>
	queryOptions({
		queryKey: ["players", "list", params],
		queryFn: ({ signal }) => fetchPlayers(params, signal),
	});
