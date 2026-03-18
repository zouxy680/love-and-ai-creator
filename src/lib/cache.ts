// 知乎 API 缓存工具（永久缓存）

interface CacheItem<T> {
  data: T
  timestamp: number
}

// 内存缓存（简单实现，生产环境应使用 Redis）
const cache = new Map<string, CacheItem<unknown>>()

/**
 * 获取缓存（永久有效，不过期）
 */
export function getCache<T>(key: string): T | null {
  const item = cache.get(key) as CacheItem<T> | undefined

  if (!item) {
    return null
  }

  console.log(`[Cache] Hit: ${key}`)
  return item.data
}

/**
 * 设置缓存（永久存储）
 */
export function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  })
  console.log(`[Cache] Set: ${key}`)
}

/**
 * 生成缓存键
 */
export function generateCacheKey(prefix: string, params: Record<string, string | number>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  return `${prefix}:${sortedParams}`
}

/**
 * 清除指定缓存
 */
export function clearCache(key: string): boolean {
  return cache.delete(key)
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  cache.clear()
  console.log('[Cache] All cleared')
}

/**
 * 获取或设置缓存（带回调）
 * 如果缓存不存在，调用 fetcher 获取数据并永久缓存
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // 先检查缓存
  const cached = getCache<T>(key)
  if (cached !== null) {
    return cached
  }

  // 缓存未命中，调用 fetcher
  console.log(`[Cache] Miss: ${key}`)
  const data = await fetcher()

  // 存入缓存（永久）
  setCache(key, data)

  return data
}

/**
 * 获取缓存统计
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  }
}
