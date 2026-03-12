import * as _orpc_server0 from "@orpc/server";
import { RouterClient } from "@orpc/server";
import * as zod0 from "zod";
import * as better_auth0 from "better-auth";

//#region src/routers/index.d.ts
declare const appRouter: {
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
    getPost: _orpc_server0.DecoratedProcedure<{
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
    }, zod0.ZodObject<{
      id: zod0.ZodString;
    }, better_auth0.$strip>, zod0.ZodObject<{
      status: zod0.ZodEnum<{
        error: "error";
        success: "success";
      }>;
      message: zod0.ZodString;
      meta: zod0.ZodOptional<zod0.ZodUndefined>;
      data: zod0.ZodNullable<zod0.ZodObject<{
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
  };
  note: {
    getNotes: _orpc_server0.DecoratedProcedure<{
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
    }, zod0.ZodObject<{
      id: zod0.ZodOptional<zod0.ZodString>;
    }, better_auth0.$strip>, _orpc_server0.Schema<{
      status: string;
      message: string;
      data: {
        current: {
          id: string;
          title: string;
          mood: string;
          weather: string;
          bookmark: boolean;
          coordinates: string | null;
          location: string | null;
          status: boolean;
          content: string;
          authorId: string;
          topicId: string | null;
          createdAt: Date;
          updatedAt: Date;
        } | null;
        prev: {
          id: string;
          title: string;
          mood: string;
          weather: string;
          bookmark: boolean;
          coordinates: string | null;
          location: string | null;
          status: boolean;
          content: string;
          authorId: string;
          topicId: string | null;
          createdAt: Date;
          updatedAt: Date;
        }[];
        next: never[];
      };
    } | {
      status: string;
      message: string;
      data: {
        id: string;
        title: string;
        createdAt: Date;
        content: string;
        author: {
          id: string;
          username: string | null;
          displayUsername: string | null;
          name: string;
          email: string;
          emailVerified: boolean;
          image: string | null;
          createdAt: Date;
          updatedAt: Date;
          role: string | null;
          banned: boolean | null;
          banReason: string | null;
          banExpires: Date | null;
        } | null;
        topic: {
          id: string;
          name: string;
          slug: string;
          introduce: string;
          description: string;
          color: string | null;
          noteCount: number;
          createdAt: Date;
          updatedAt: Date;
        } | null;
      }[];
    }, {
      status: string;
      message: string;
      data: {
        current: {
          id: string;
          title: string;
          mood: string;
          weather: string;
          bookmark: boolean;
          coordinates: string | null;
          location: string | null;
          status: boolean;
          content: string;
          authorId: string;
          topicId: string | null;
          createdAt: Date;
          updatedAt: Date;
        } | null;
        prev: {
          id: string;
          title: string;
          mood: string;
          weather: string;
          bookmark: boolean;
          coordinates: string | null;
          location: string | null;
          status: boolean;
          content: string;
          authorId: string;
          topicId: string | null;
          createdAt: Date;
          updatedAt: Date;
        }[];
        next: never[];
      };
    } | {
      status: string;
      message: string;
      data: {
        id: string;
        title: string;
        createdAt: Date;
        content: string;
        author: {
          id: string;
          username: string | null;
          displayUsername: string | null;
          name: string;
          email: string;
          emailVerified: boolean;
          image: string | null;
          createdAt: Date;
          updatedAt: Date;
          role: string | null;
          banned: boolean | null;
          banReason: string | null;
          banExpires: Date | null;
        } | null;
        topic: {
          id: string;
          name: string;
          slug: string;
          introduce: string;
          description: string;
          color: string | null;
          noteCount: number;
          createdAt: Date;
          updatedAt: Date;
        } | null;
      }[];
    }>, Record<never, never>, Record<never, never>>;
    getNoteLatest: _orpc_server0.DecoratedProcedure<{
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
    }, _orpc_server0.Schema<unknown, unknown>, _orpc_server0.Schema<{
      status: string;
      message: string;
      data: {
        id: string | null;
      };
    }, {
      status: string;
      message: string;
      data: {
        id: string | null;
      };
    }>, Record<never, never>, Record<never, never>>;
    getNote: _orpc_server0.DecoratedProcedure<{
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
    }, zod0.ZodObject<{
      id: zod0.ZodString;
    }, better_auth0.$strip>, _orpc_server0.Schema<{
      status: string;
      message: string;
      data: {
        id: string;
        title: string;
        mood: string;
        weather: string;
        bookmark: boolean;
        coordinates: string | null;
        location: string | null;
        status: boolean;
        content: string;
        authorId: string;
        topicId: string | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
    }, {
      status: string;
      message: string;
      data: {
        id: string;
        title: string;
        mood: string;
        weather: string;
        bookmark: boolean;
        coordinates: string | null;
        location: string | null;
        status: boolean;
        content: string;
        authorId: string;
        topicId: string | null;
        createdAt: Date;
        updatedAt: Date;
      } | null;
    }>, Record<never, never>, Record<never, never>>;
  };
  comment: {
    getComments: _orpc_server0.DecoratedProcedure<{
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
    }, zod0.ZodObject<{
      type: zod0.ZodEnum<{
        post: "post";
        note: "note";
        page: "page";
        recently: "recently";
      }>;
      refId: zod0.ZodString;
    }, better_auth0.$strip>, zod0.ZodObject<{
      status: zod0.ZodEnum<{
        error: "error";
        success: "success";
      }>;
      message: zod0.ZodString;
      meta: zod0.ZodOptional<zod0.ZodUndefined>;
      data: zod0.ZodArray<zod0.ZodObject<{
        id: zod0.ZodUUID;
        refType: zod0.ZodEnum<{
          post: "post";
          note: "note";
          page: "page";
          recently: "recently";
        }>;
        refId: zod0.ZodString;
        displayUsername: zod0.ZodString;
        email: zod0.ZodString;
        website: zod0.ZodNullable<zod0.ZodString>;
        content: zod0.ZodString;
        thread: zod0.ZodNullable<zod0.ZodString>;
        likes: zod0.ZodNumber;
        dislikes: zod0.ZodNumber;
        deleted: zod0.ZodBoolean;
        pin: zod0.ZodBoolean;
        source: zod0.ZodEnum<{
          guest: "guest";
          google: "google";
          github: "github";
        }>;
        userId: zod0.ZodNullable<zod0.ZodString>;
        ip: zod0.ZodNullable<zod0.ZodString>;
        agent: zod0.ZodNullable<zod0.ZodString>;
        location: zod0.ZodNullable<zod0.ZodString>;
        createdAt: zod0.ZodDate;
        updatedAt: zod0.ZodDate;
      }, better_auth0.$strip>>;
    }, better_auth0.$strip>, Record<never, never>, Record<never, never>>;
    createComment: _orpc_server0.DecoratedProcedure<_orpc_server0.MergedInitialContext<{
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
      type: zod0.ZodEnum<{
        post: "post";
        note: "note";
        page: "page";
      }>;
      refId: zod0.ZodString;
      displayUsername: zod0.ZodString;
      email: zod0.ZodString;
      source: zod0.ZodEnum<{
        guest: "guest";
        google: "google";
        github: "github";
      }>;
      content: zod0.ZodString;
      thread: zod0.ZodOptional<zod0.ZodString>;
    }, better_auth0.$strip>, _orpc_server0.Schema<{
      status: string;
      message: string;
      data: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        displayUsername: string;
        email: string;
        pin: boolean;
        location: string | null;
        refType: "post" | "note" | "page" | "recently";
        refId: string;
        website: string | null;
        thread: string | null;
        likes: number;
        dislikes: number;
        deleted: boolean;
        source: "guest" | "google" | "github";
        userId: string | null;
        ip: string | null;
        agent: string | null;
      } | undefined;
    }, {
      status: string;
      message: string;
      data: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        displayUsername: string;
        email: string;
        pin: boolean;
        location: string | null;
        refType: "post" | "note" | "page" | "recently";
        refId: string;
        website: string | null;
        thread: string | null;
        likes: number;
        dislikes: number;
        deleted: boolean;
        source: "guest" | "google" | "github";
        userId: string | null;
        ip: string | null;
        agent: string | null;
      } | undefined;
    }>, Record<never, never>, Record<never, never>>;
    deleteComment: _orpc_server0.DecoratedProcedure<_orpc_server0.MergedInitialContext<{
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
      id: zod0.ZodUUID;
    }, better_auth0.$strip>, _orpc_server0.Schema<{
      status: string;
      message: string;
    }, {
      status: string;
      message: string;
    }>, Record<never, never>, Record<never, never>>;
    likeComment: _orpc_server0.DecoratedProcedure<_orpc_server0.MergedInitialContext<{
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
      id: zod0.ZodUUID;
      like: zod0.ZodBoolean;
    }, better_auth0.$strip>, _orpc_server0.Schema<{
      status: string;
      message: string;
      data?: undefined;
    } | {
      status: string;
      message: string;
      data: {
        userId: string;
        commentId: string;
        like: boolean;
      };
    }, {
      status: string;
      message: string;
      data?: undefined;
    } | {
      status: string;
      message: string;
      data: {
        userId: string;
        commentId: string;
        like: boolean;
      };
    }>, Record<never, never>, Record<never, never>>;
  };
};
type AppRouter = typeof appRouter;
type AppRouterClient = RouterClient<typeof appRouter>;
//#endregion
export { AppRouter, AppRouterClient, appRouter };