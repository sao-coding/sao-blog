import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_API_URL: z.url(),
		VITE_BLOG_URL: z.url(),
	},
	runtimeEnv: {
		VITE_API_URL: process.env.VITE_API_URL,
		VITE_BLOG_URL: process.env.VITE_BLOG_URL,
	},
	emptyStringAsUndefined: true,
});
