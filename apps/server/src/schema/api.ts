import { z } from "zod";

export const createApiResponseSchema = <
  T extends z.ZodTypeAny,
  M extends z.ZodTypeAny = z.ZodUndefined
>(
  dataSchema: T,
  metaSchema?: M
) =>
  z.object({
    status: z.enum(["success", "error"]),
    message: z.string(),
    meta: metaSchema ? metaSchema.optional() : z.undefined().optional(),
    data: dataSchema,
  });