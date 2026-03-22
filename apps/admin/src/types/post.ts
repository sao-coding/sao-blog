import type { InferClientOutputs } from "@orpc/client";
import { client } from "@/utils/orpc";

type RouterOutputs = InferClientOutputs<typeof client>;
export type Posts = RouterOutputs["post"]["getPosts"]["data"];