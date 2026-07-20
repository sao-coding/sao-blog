import type { AppRouterClient } from "@sao-blog/api/routers/index";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { env } from "@sao-blog/env/web";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

export const link = new RPCLink({
  url: `${env.NEXT_PUBLIC_SERVER_URL}/rpc`,
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
  // 伺服器端目前所有直接呼叫 client/orpc 的頁面都是公開唯讀內容，
  // 不需要轉發 next/headers()（那會讓路由被標記為 dynamic，無法走 ISR/Data Cache）。
  headers: async () => {
    return {};
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
