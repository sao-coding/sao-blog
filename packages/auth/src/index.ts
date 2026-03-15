import { expo } from "@better-auth/expo";
import { db } from "@sao-blog/db";
import * as schema from "@sao-blog/db/schema/index";
import { env } from "@sao-blog/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI, apiKey, admin, username } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [
    ...env.CORS_ORIGIN.map(origin => origin.trim()),
    "sao-blog://",
    ...(env.NODE_ENV === "development"
      ? ["exp://", "exp://**", "exp://192.168.*.*:*/**", "http://localhost:8081"]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: { 
        clientId: process.env.GITHUB_CLIENT_ID as string, 
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  plugins: [    
    admin(),
    username(),
    openAPI(),
    expo(), 
    apiKey({
      enableSessionForAPIKeys: true
    })
  ],
});
