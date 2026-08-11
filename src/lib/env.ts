import { z } from "zod";

const envSchema = z.object({
	MODE: z.string(),
	BASE_URL: z.string(),
	DEV: z.boolean(),
	PROD: z.boolean(),
	SSR: z.boolean(),
});

export const env = envSchema.parse(import.meta.env);
