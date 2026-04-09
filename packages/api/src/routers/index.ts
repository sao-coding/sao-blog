import type { RouterClient } from "@orpc/server";

import { o, protectedProcedure, publicProcedure } from '@sao-blog/api/index'
import postRouter from "./post";
import noteRouter from "./note";
import commentRouter from "./comment";
import adminPostRouter from "./admin/post";
import adminCategoryRouter from "./admin/category";
import adminTagRouter from "./admin/tag";

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
    category: adminCategoryRouter,
    tag: adminTagRouter,
  })
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
