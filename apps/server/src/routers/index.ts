import type { RouterClient } from "@orpc/server";

import { o, protectedProcedure, publicProcedure } from "@/orpc/index";
import postRouter from "./post";
import noteRouter from "./note";
import commentRouter from "./comment";
import adminPostRouter from "./admin/post";

export const appRouter = {
  // healthCheck: publicProcedure.handler(() => {
  //   return "OK";
  // }),
  // privateData: protectedProcedure.handler(({ context }) => {
  //   return {
  //     message: "This is private",
  //     user: context.session?.user,
  //   };
  // }),
  post: postRouter,
  note: noteRouter,
  comment: commentRouter,
  admin: o.prefix('/admin').router({
    post: adminPostRouter,
  })
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
