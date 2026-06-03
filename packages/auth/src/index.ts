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
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
    crossSubdomainCookies: {
      enabled: true,
      // domain: "sao-x.com"  // 根網域，含點
    },
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
      // domain: ".sao-x.com",
    },
  },
  plugins: [
    admin(),
    username(),
    openAPI(),
    expo(),
    apiKey({
      enableSessionForAPIKeys: true,
      rateLimit: {
        enabled: false,
      },
    })
  ],
});
