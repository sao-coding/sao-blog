import type { RouterClient } from "@orpc/server";

import { adminProcedure } from '@sao-blog/api/index'
import postRouter from "./post";
import noteRouter from "./note";
import timelineRouter from "./timeline";
import commentRouter from "./comment";
import thinkingRouter from "./thinking";
import homeRouter from "./home";
import adminPostRouter from "./admin/post";
import adminCategoryRouter from "./admin/category";
import adminTagRouter from "./admin/tag";
import adminNoteRouter from "./admin/note";
import adminTopicRouter from "./admin/topic";
import adminCommentRouter from "./admin/comment";
import adminDashboardRouter from "./admin/dashboard";
import adminThinkingRouter from "./admin/thinking";
import adminStorageConfigRouter from "./admin/storage-config";
import adminFileRouter from "./admin/file";
import linkPreviewRouter from "./link-preview";
import topicRouter from "./topic";
import menuRouter from "./menu";

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
  timeline: timelineRouter,
  comment: commentRouter,
  thinking: thinkingRouter,
  home: homeRouter,
  linkPreview: linkPreviewRouter,
  topic: topicRouter,
  menu: menuRouter,
  admin: adminProcedure.prefix('/admin').router({
    post: adminPostRouter,
    category: adminCategoryRouter,
    tag: adminTagRouter,
    note: adminNoteRouter,
    topic: adminTopicRouter,
    comment: adminCommentRouter,
    dashboard: adminDashboardRouter,
    thinking: adminThinkingRouter,
    storageConfig: adminStorageConfigRouter,
    file: adminFileRouter,
  })
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
