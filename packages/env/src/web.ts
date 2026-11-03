import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url(),
    NEXT_PUBLIC_WS_URL: z.string().min(1),
  },
  server: {
    REVALIDATE_SECRET: z.string().min(16),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
  },
  emptyStringAsUndefined: true,
});
