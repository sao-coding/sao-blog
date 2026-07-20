import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client"
import { env } from "@sao-blog/env/web";

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  plugins: [usernameClient(), apiKeyClient()],
});
