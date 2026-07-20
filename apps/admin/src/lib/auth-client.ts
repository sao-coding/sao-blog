import { createAuthClient } from "better-auth/react"
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client"
import { env } from "@sao-blog/env/admin";

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: env.VITE_API_URL,
    plugins: [usernameClient(), adminClient(), apiKeyClient()],
})
