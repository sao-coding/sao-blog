import { QueryClient } from '@tanstack/react-query'

export function getContext() {
  // staleTime > 0：loader 已用 ensureQueryData 預先把資料放進 cache 並隨 SSR
  // 一起 dehydrate 給 client；若 staleTime 仍是預設的 0，client 端的 useQuery/
  // useSuspenseQuery 會在 mount 時視為 stale 而立刻重新 fetch 一次，
  // 等於 SSR 資料白抓。設一個非零值讓 hydrate 進來的資料在短時間內視為新鮮。
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  })

  return {
    queryClient,
  }
}
