import { z } from "zod";

export const createApiResponseSchema = <
  T extends z.ZodTypeAny,
  M extends z.ZodTypeAny = z.ZodUndefined
>(
  dataSchema: T,
  metaSchema?: M
) =>
  z.discriminatedUnion("status", [
    z.object({
      status: z.literal("success"),
      message: z.string(),
      meta: metaSchema ? metaSchema.optional() : z.undefined().optional(),
      data: dataSchema,
    }),
    z.object({
      status: z.literal("error"),
      message: z.string(),
      meta: metaSchema ? metaSchema.optional() : z.undefined().optional(),
      data: z.null(),
    }),
  ]);