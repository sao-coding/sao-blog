import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);


// import { ORPCError, os } from "@orpc/server";

// import type { Context } from "./context";

// import { getLogger, type LoggerContext } from '@orpc/experimental-pino'

// // interface ORPCContext extends LoggerContext {} 



// type ORPCContext = Context & LoggerContext;

// export const o = os.$context<ORPCContext>();

// const withRequestLogging = o.middleware(async ({ context, next }) => {
//   const logger = getLogger(context);
//   logger?.info('Processing request');

//   return next();
// });

// export const publicProcedure = o.use(withRequestLogging);

// // export const publicProcedure = o;

// const requireAuth = o.middleware(async ({ context, next }) => {
//   if (!context.session?.user) {
//     throw new ORPCError("UNAUTHORIZED");
//   }
//   return next({
//     context: {
//       session: context.session,
//     },
//   });
// });

// export const protectedProcedure = publicProcedure.use(requireAuth);
