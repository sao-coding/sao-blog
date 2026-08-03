const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

// Nitro 的 defineCachedFunction 把回傳值序列化成 JSON 存進 storage，Date 物件
// 在 cache-hit 時會變回純字串（cache-miss 當次仍是原本的 Date 物件），造成同一
// 個 loader 兩種型別交錯出現。這裡把兩種情況都收斂成 Date，讓下游 `.toISOString()`
// 之類的呼叫不會因為命中快取與否而爆炸。
export function reviveDates<T>(value: T): T {
  if (value instanceof Date) return value
  if (Array.isArray(value)) return value.map(reviveDates) as unknown as T
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      ;(value as Record<string, unknown>)[key] = reviveDates(
        (value as Record<string, unknown>)[key],
      )
    }
    return value
  }
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    return new Date(value) as unknown as T
  }
  return value
}
