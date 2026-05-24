import { createAuthClient } from "better-auth/react"
import { env } from "@sao-blog/env/admin";

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: env.ADMIN_API_URL
})