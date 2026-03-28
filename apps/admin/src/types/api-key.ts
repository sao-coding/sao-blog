export interface ApiKey {
  id: string
  name?: string | null
  start?: string | null
  prefix?: string | null
  key: string
  userId: string
  refillInterval?: number | null
  refillAmount?: number | null
  lastRefillAt?: string | null
  enabled?: boolean
  rateLimitEnabled?: boolean
  rateLimitTimeWindow?: number | null
  rateLimitMax?: number | null
  requestCount?: number | null
  remaining?: number | null
  lastRequest?: string | null
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
  permissions?: string | null
  metadata?: Record<string, unknown> | string | null
}
