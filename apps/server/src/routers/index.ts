import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "@/orpc/index";
import postRouter from "./post";
import noteRouter from "./note";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  post: postRouter,
  note: noteRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
