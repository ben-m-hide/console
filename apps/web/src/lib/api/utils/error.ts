import { z } from "zod";

const ApiErrorSchema = z.object({
	error: z.object({
		message: z.string(),
	}),
});

export const getMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

export const getStatus = (error: unknown): number | undefined =>
	z.object({ status: z.number() }).safeParse(error).data?.status;

export const getUrl = (error: unknown): string | undefined =>
	z.object({ url: z.string() }).safeParse(error).data?.url;

export const toApiErrorMessage = (rawMessage: string): string => {
	try {
		const parsed = ApiErrorSchema.safeParse(JSON.parse(rawMessage));
		if (parsed.success) return parsed.data.error.message;
	} catch {
		// Fall back to raw message if JSON parse fails
	}
	return rawMessage;
};
