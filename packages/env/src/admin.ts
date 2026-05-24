import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "ADMIN_",
	client: {
		ADMIN_API_URL: z.url(),
		ADMIN_BLOG_URL: z.url(),
	},
	runtimeEnv: {
		ADMIN_API_URL: process.env.ADMIN_API_URL,
		ADMIN_BLOG_URL: process.env.ADMIN_BLOG_URL,
	},
	emptyStringAsUndefined: true,
});
