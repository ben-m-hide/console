import { PlayerSchema } from "@console-next/shared";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

// Mirrors apps/api's default (build-players-query.ts) — no shared package
// exports this across the two runtimes, so it is duplicated with a comment
// rather than invented independently.
export const DEFAULT_PAGE_SIZE = 25;

// Confirmed against real data 2026-08-16 (all ~1,991 players scanned across
// every page) rather than guessed — Sportmonks' position strings for this
// dataset are exactly these four, no others observed.
export const PLAYER_POSITIONS = [
	"Attacker",
	"Defender",
	"Goalkeeper",
	"Midfielder",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

// Also the route's validateSearch schema. Using Zod's own .optional() output
// type (`T | undefined`) rather than a hand-written `search?: string` matters
// here — exactOptionalPropertyTypes rejects assigning `undefined` to the
// latter, and loaderDeps below does exactly that for an absent param.
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

// Key includes the full param set, so a search/position/page change is a
// genuinely different cache entry — this is what makes useSuspenseQuery pick
// up a loader-driven navigation reactively (architecture doc §3 gotcha #1).
// No explicit return type here — see biome.json's override for this
// directory. queryOptions() is overloaded on a skipToken sentinel that a hand
// -written annotation can't reproduce without breaking assignability to
// useSuspenseQuery; TS's own inference from the object literal is the only
// type that stays precise enough to satisfy it.
export const playersQueryOptions = (params: PlayersSearchParams) =>
	queryOptions({
		queryKey: ["players", "list", params],
		queryFn: ({ signal }) => fetchPlayers(params, signal),
	});
