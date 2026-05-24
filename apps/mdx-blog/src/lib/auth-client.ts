import { createAuthClient } from "better-auth/react";
import { apiKeyClient, usernameClient } from "better-auth/client/plugins";
import { env } from "@sao-blog/env/web";

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [usernameClient(), apiKeyClient()],
});
