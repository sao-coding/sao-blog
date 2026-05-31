import { queryOptions } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import type { ApiKey } from '@/types/api-key'

export const apiKeysQueryKey = ['admin', 'api-keys'] as const

export const apiKeysQueryOptions = () =>
  queryOptions({
    queryKey: apiKeysQueryKey,
    queryFn: async (): Promise<ApiKey[]> => {
      const { data, error } = await authClient.apiKey.list()
      if (error) {
        throw new Error(error.message ?? '取得 API 金鑰列表失敗')
      }
      return (data ?? []) as unknown as ApiKey[]
    },
  })
