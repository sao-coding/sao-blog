import * as _orpc_server0 from "@orpc/server";
import { RouterClient } from "@orpc/server";
import * as zod0 from "zod";
import * as better_auth0 from "better-auth";

//#region src/routers/index.d.ts
declare const appRouter: {
  healthCheck: _orpc_server0.DecoratedProcedure<{
    session: {
      session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined | undefined;
        userAgent?: string | null | undefined | undefined;
        impersonatedBy?: string | null | undefined;
      };
      user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        banned: boolean | null | undefined;
        role?: string | null | undefined;
        banReason?: string | null | undefined;
        banExpires?: Date | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
      };
    } | null;
  } & Record<never, never>, {
    session: {
      session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined | undefined;
        userAgent?: string | null | undefined | undefined;
        impersonatedBy?: string | null | undefined;
      };
      user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        banned: boolean | null | undefined;
        role?: string | null | undefined;
        banReason?: string | null | undefined;
        banExpires?: Date | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
      };
    } | null;
  }, _orpc_server0.Schema<unknown, unknown>, _orpc_server0.Schema<string, string>, Record<never, never>, Record<never, never>>;
  privateData: _orpc_server0.DecoratedProcedure<_orpc_server0.MergedInitialContext<{
    session: {
      session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined | undefined;
        userAgent?: string | null | undefined | undefined;
        impersonatedBy?: string | null | undefined;
      };
      user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        banned: boolean | null | undefined;
        role?: string | null | undefined;
        banReason?: string | null | undefined;
        banExpires?: Date | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
      };
    } | null;
  } & Record<never, never>, {
    session: {
      session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined | undefined;
        userAgent?: string | null | undefined | undefined;
        impersonatedBy?: string | null | undefined;
      };
      user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        banned: boolean | null | undefined;
        role?: string | null | undefined;
        banReason?: string | null | undefined;
        banExpires?: Date | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
      };
    } | null;
  } & Record<never, never>, {
    session: {
      session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined | undefined;
        userAgent?: string | null | undefined | undefined;
        impersonatedBy?: string | null | undefined;
      };
      user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        banned: boolean | null | undefined;
        role?: string | null | undefined;
        banReason?: string | null | undefined;
        banExpires?: Date | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
      };
    } | null;
  }>, _orpc_server0.MergedCurrentContext<{
    session: {
      session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined | undefined;
        userAgent?: string | null | undefined | undefined;
        impersonatedBy?: string | null | undefined;
      };
      user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        banned: boolean | null | undefined;
        role?: string | null | undefined;
        banReason?: string | null | undefined;
        banExpires?: Date | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
      };
    } | null;
  }, {
    session: {
      session: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null | undefined | undefined;
        userAgent?: string | null | undefined | undefined;
        impersonatedBy?: string | null | undefined;
      };
      user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        banned: boolean | null | undefined;
        role?: string | null | undefined;
        banReason?: string | null | undefined;
        banExpires?: Date | null | undefined;
        username?: string | null | undefined;
        displayUsername?: string | null | undefined;
      };
    };
  }>, _orpc_server0.Schema<unknown, unknown>, _orpc_server0.Schema<{
    message: string;
    user: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      email: string;
      emailVerified: boolean;
      name: string;
      image?: string | null | undefined | undefined;
      banned: boolean | null | undefined;
      role?: string | null | undefined;
      banReason?: string | null | undefined;
      banExpires?: Date | null | undefined;
      username?: string | null | undefined;
      displayUsername?: string | null | undefined;
    };
  }, {
    message: string;
    user: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      email: string;
      emailVerified: boolean;
      name: string;
      image?: string | null | undefined | undefined;
      banned: boolean | null | undefined;
      role?: string | null | undefined;
      banReason?: string | null | undefined;
      banExpires?: Date | null | undefined;
      username?: string | null | undefined;
      displayUsername?: string | null | undefined;
    };
  }>, Record<never, never>, Record<never, never>>;
  post: {
    getPosts: _orpc_server0.DecoratedProcedure<{
      session: {
        session: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          expiresAt: Date;
          token: string;
          ipAddress?: string | null | undefined | undefined;
          userAgent?: string | null | undefined | undefined;
          impersonatedBy?: string | null | undefined;
        };
        user: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          email: string;
          emailVerified: boolean;
          name: string;
          image?: string | null | undefined | undefined;
          banned: boolean | null | undefined;
          role?: string | null | undefined;
          banReason?: string | null | undefined;
          banExpires?: Date | null | undefined;
          username?: string | null | undefined;
          displayUsername?: string | null | undefined;
        };
      } | null;
    } & Record<never, never>, {
      session: {
        session: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          expiresAt: Date;
          token: string;
          ipAddress?: string | null | undefined | undefined;
          userAgent?: string | null | undefined | undefined;
          impersonatedBy?: string | null | undefined;
        };
        user: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          email: string;
          emailVerified: boolean;
          name: string;
          image?: string | null | undefined | undefined;
          banned: boolean | null | undefined;
          role?: string | null | undefined;
          banReason?: string | null | undefined;
          banExpires?: Date | null | undefined;
          username?: string | null | undefined;
          displayUsername?: string | null | undefined;
        };
      } | null;
    }, _orpc_server0.Schema<unknown, unknown>, zod0.ZodObject<{
      status: zod0.ZodEnum<{
        error: "error";
        success: "success";
      }>;
      message: zod0.ZodString;
      meta: zod0.ZodOptional<zod0.ZodUndefined>;
      data: zod0.ZodArray<zod0.ZodObject<{
        id: zod0.ZodString;
        title: zod0.ZodString;
        summary: zod0.ZodNullable<zod0.ZodString>;
        content: zod0.ZodString;
        slug: zod0.ZodString;
        cover: zod0.ZodNullable<zod0.ZodString>;
        status: zod0.ZodEnum<{
          draft: "draft";
          published: "published";
          archived: "archived";
        }>;
        viewCount: zod0.ZodNumber;
        likeCount: zod0.ZodNumber;
        commentCount: zod0.ZodNumber;
        allowComments: zod0.ZodBoolean;
        pin: zod0.ZodBoolean;
        pinOrder: zod0.ZodNumber;
        createdAt: zod0.ZodDate;
        updatedAt: zod0.ZodDate;
        category: zod0.ZodNullable<zod0.ZodObject<{
          id: zod0.ZodString;
          name: zod0.ZodString;
          slug: zod0.ZodString;
          description: zod0.ZodNullable<zod0.ZodString>;
          color: zod0.ZodNullable<zod0.ZodString>;
          parentId: zod0.ZodNullable<zod0.ZodString>;
          sortOrder: zod0.ZodNumber;
          postCount: zod0.ZodNumber;
          createdAt: zod0.ZodDate;
          updatedAt: zod0.ZodDate;
        }, better_auth0.$strip>>;
        tags: zod0.ZodArray<zod0.ZodObject<{
          id: zod0.ZodString;
          name: zod0.ZodString;
          slug: zod0.ZodString;
          description: zod0.ZodNullable<zod0.ZodString>;
          color: zod0.ZodNullable<zod0.ZodString>;
          postCount: zod0.ZodOptional<zod0.ZodNumber>;
          createdAt: zod0.ZodDate;
          updatedAt: zod0.ZodDate;
        }, better_auth0.$strip>>;
        author: zod0.ZodObject<{
          id: zod0.ZodString;
          username: zod0.ZodNullable<zod0.ZodString>;
          displayUsername: zod0.ZodNullable<zod0.ZodString>;
          name: zod0.ZodNullable<zod0.ZodString>;
          email: zod0.ZodString;
          emailVerified: zod0.ZodBoolean;
          image: zod0.ZodNullable<zod0.ZodString>;
          role: zod0.ZodNullable<zod0.ZodString>;
          banned: zod0.ZodNullable<zod0.ZodBoolean>;
          banReason: zod0.ZodNullable<zod0.ZodString>;
          banExpires: zod0.ZodNullable<zod0.ZodDate>;
          createdAt: zod0.ZodDate;
          updatedAt: zod0.ZodDate;
        }, better_auth0.$strip>;
      }, better_auth0.$strip>>;
    }, better_auth0.$strip>, Record<never, never>, Record<never, never>>;
    createPost: _orpc_server0.DecoratedProcedure<_orpc_server0.MergedInitialContext<{
      session: {
        session: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          expiresAt: Date;
          token: string;
          ipAddress?: string | null | undefined | undefined;
          userAgent?: string | null | undefined | undefined;
          impersonatedBy?: string | null | undefined;
        };
        user: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          email: string;
          emailVerified: boolean;
          name: string;
          image?: string | null | undefined | undefined;
          banned: boolean | null | undefined;
          role?: string | null | undefined;
          banReason?: string | null | undefined;
          banExpires?: Date | null | undefined;
          username?: string | null | undefined;
          displayUsername?: string | null | undefined;
        };
      } | null;
    } & Record<never, never>, {
      session: {
        session: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          expiresAt: Date;
          token: string;
          ipAddress?: string | null | undefined | undefined;
          userAgent?: string | null | undefined | undefined;
          impersonatedBy?: string | null | undefined;
        };
        user: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          email: string;
          emailVerified: boolean;
          name: string;
          image?: string | null | undefined | undefined;
          banned: boolean | null | undefined;
          role?: string | null | undefined;
          banReason?: string | null | undefined;
          banExpires?: Date | null | undefined;
          username?: string | null | undefined;
          displayUsername?: string | null | undefined;
        };
      } | null;
    } & Record<never, never>, {
      session: {
        session: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          expiresAt: Date;
          token: string;
          ipAddress?: string | null | undefined | undefined;
          userAgent?: string | null | undefined | undefined;
          impersonatedBy?: string | null | undefined;
        };
        user: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          email: string;
          emailVerified: boolean;
          name: string;
          image?: string | null | undefined | undefined;
          banned: boolean | null | undefined;
          role?: string | null | undefined;
          banReason?: string | null | undefined;
          banExpires?: Date | null | undefined;
          username?: string | null | undefined;
          displayUsername?: string | null | undefined;
        };
      } | null;
    }>, _orpc_server0.MergedCurrentContext<{
      session: {
        session: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          expiresAt: Date;
          token: string;
          ipAddress?: string | null | undefined | undefined;
          userAgent?: string | null | undefined | undefined;
          impersonatedBy?: string | null | undefined;
        };
        user: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          email: string;
          emailVerified: boolean;
          name: string;
          image?: string | null | undefined | undefined;
          banned: boolean | null | undefined;
          role?: string | null | undefined;
          banReason?: string | null | undefined;
          banExpires?: Date | null | undefined;
          username?: string | null | undefined;
          displayUsername?: string | null | undefined;
        };
      } | null;
    }, {
      session: {
        session: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          expiresAt: Date;
          token: string;
          ipAddress?: string | null | undefined | undefined;
          userAgent?: string | null | undefined | undefined;
          impersonatedBy?: string | null | undefined;
        };
        user: {
          id: string;
          createdAt: Date;
          updatedAt: Date;
          email: string;
          emailVerified: boolean;
          name: string;
          image?: string | null | undefined | undefined;
          banned: boolean | null | undefined;
          role?: string | null | undefined;
          banReason?: string | null | undefined;
          banExpires?: Date | null | undefined;
          username?: string | null | undefined;
          displayUsername?: string | null | undefined;
        };
      };
    }>, zod0.ZodObject<{
      title: zod0.ZodString;
      content: zod0.ZodString;
    }, better_auth0.$strip>, _orpc_server0.Schema<{}, {}>, Record<never, never>, Record<never, never>>;
  };
};
type AppRouter = typeof appRouter;
type AppRouterClient = RouterClient<typeof appRouter>;
//#endregion
export { AppRouter, AppRouterClient, appRouter };