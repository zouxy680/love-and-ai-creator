// 知乎 API 工具函数（带永久缓存 + HMAC-SHA256 签名认证）

import crypto from 'crypto'
import { getOrSetCache, generateCacheKey } from './cache'

const ZHIHU_APP_KEY = process.env.ZHIHU_APP_KEY
const ZHIHU_APP_SECRET = process.env.ZHIHU_APP_SECRET
const ZHIHU_API_BASE = process.env.ZHIHU_API_BASE_URL || 'https://openapi.zhihu.com'

// 检查必需的环境变量
function checkZhihuEnv() {
  if (!ZHIHU_APP_KEY || !ZHIHU_APP_SECRET) {
    throw new Error('知乎 API 未配置：缺少 ZHIHU_APP_KEY 或 ZHIHU_APP_SECRET')
  }
}

interface ZhihuApiResponse<T> {
  status: number
  msg: string
  data: T
  error?: {
    name?: string
    code: number
    message: string
  }
}

// 热榜项
interface HotListItem {
  token: string
  title: string
  body: string
  link_url: string
  heat_score: number
  type: string
  published_time_str: string
}

// 搜索结果项
interface SearchResultItem {
  content_id: string
  content_type: string
  title: string
  content_text: string
  url: string
  author_name: string
  author_avatar: string
  vote_up_count: number
  comment_count: number
  edit_time: number
}

/**
 * 生成知乎 API 签名
 * 签名字符串格式: app_key:{app_key}|ts:{timestamp}|logid:{log_id}|extra_info:{extra_info}
 * 使用 HMAC-SHA256 签名，然后 Base64 编码
 */
function generateZhihuSignature(extraInfo: string = ''): {
  timestamp: string
  logId: string
  signature: string
} {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const logId = `request_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  // 构造签名字符串
  const signStr = `app_key:${ZHIHU_APP_KEY}|ts:${timestamp}|logid:${logId}|extra_info:${extraInfo}`

  // HMAC-SHA256 签名
  const hmac = crypto.createHmac('sha256', ZHIHU_APP_SECRET || '')
  hmac.update(signStr)
  const signature = hmac.digest('base64')

  return { timestamp, logId, signature }
}

/**
 * 构造知乎 API 请求头
 */
function buildZhihuHeaders(extraInfo: string = ''): HeadersInit {
  const { timestamp, logId, signature } = generateZhihuSignature(extraInfo)

  return {
    'Content-Type': 'application/json',
    'X-App-Key': ZHIHU_APP_KEY || '',
    'X-Timestamp': timestamp,
    'X-Log-Id': logId,
    'X-Sign': signature,
    'X-Extra-Info': extraInfo,
  }
}

/**
 * 知乎 API 请求函数（带签名认证）
 */
async function zhihuRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  extraInfo: string = ''
): Promise<T> {
  // 检查环境变量
  checkZhihuEnv()

  const url = `${ZHIHU_API_BASE}${endpoint}`
  const headers = {
    ...buildZhihuHeaders(extraInfo),
    ...options.headers,
  }

  console.log(`[Zhihu] Requesting: ${url}`)

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // 处理限流
  if (response.status === 429) {
    throw new Error('Zhihu API rate limit exceeded (10 QPS)')
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Zhihu] API error: ${response.status} - ${errorText}`)
    throw new Error(`Zhihu API error: ${response.status} ${response.statusText}`)
  }

  const data: ZhihuApiResponse<T> = await response.json()

  if (data.status !== 0) {
    throw new Error(`Zhihu API error: ${data.msg || data.error?.message || 'Unknown error'}`)
  }

  return data.data
}

/**
 * 获取知乎热榜（永久缓存）
 * GET /openapi/billboard/list
 */
export async function getZhihuHotList(): Promise<HotListItem[]> {
  const cacheKey = 'zhihu:hot_list'

  return getOrSetCache(
    cacheKey,
    async () => {
      console.log('[Zhihu] Fetching hot list from API...')
      const data = await zhihuRequest<{ list: HotListItem[] }>('/openapi/billboard/list')
      return data.list || []
    }
  )
}

/**
 * 知乎全网搜索（永久缓存，相同 query 不重复请求）
 * GET /openapi/search/global
 */
export async function searchZhihu(
  query: string,
  count: number = 10
): Promise<SearchResultItem[]> {
  const cacheKey = generateCacheKey('zhihu:search', { query, count })

  return getOrSetCache(
    cacheKey,
    async () => {
      console.log(`[Zhihu] Searching for: "${query}" (count: ${count})`)
      const params = new URLSearchParams({
        query,
        count: count.toString(),
      })

      const data = await zhihuRequest<{ has_more: boolean; items: SearchResultItem[] }>(
        `/openapi/search/global?${params.toString()}`
      )
      return data.items || []
    }
  )
}

/**
 * 知乎圈子发帖
 * POST /openapi/publish/pin
 * @param content 帖子内容
 * @param circleId 圈子ID（可选，默认使用第一个可用圈子）
 * @param images 图片URL列表（可选）
 */
export async function publishPin(
  content: string,
  circleId?: string,
  images?: string[]
): Promise<{ id: string; url: string }> {
  // 使用默认圈子ID
  const CIRCLE_IDS = ['2001009660925334090', '2015023739549529606']
  const targetCircleId = circleId || CIRCLE_IDS[0]

  try {
    const body: Record<string, unknown> = {
      content,
      circle_id: targetCircleId,
    }

    if (images && images.length > 0) {
      body.images = images
    }

    const data = await zhihuRequest<{ id: string; url: string }>(
      '/openapi/publish/pin',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      JSON.stringify({ circle_id: targetCircleId }) // extra_info
    )

    return data
  } catch (error) {
    console.error('[Zhihu] Error publishing pin:', error)
    throw error
  }
}

/**
 * 搜索小说/故事相关内容（带缓存）
 */
export async function searchStoryContent(
  genre: string = '悬疑',
  limit: number = 10
): Promise<SearchResultItem[]> {
  const keywords: Record<string, string> = {
    悬疑: '悬疑小说 推理 故事',
    言情: '言情小说 爱情 故事',
    科幻: '科幻小说 未来 故事',
    奇幻: '奇幻小说 魔法 冒险',
  }

  const query = keywords[genre] || `${genre}小说 故事`
  return searchZhihu(query, limit)
}

/**
 * 根据知乎内容生成故事剧本
 */
export async function generateStoryFromZhihu(genre: string): Promise<{
  title: string
  description: string
  genre: string
  sourceUrl?: string
}> {
  const results = await searchStoryContent(genre, 5)

  if (results.length === 0) {
    throw new Error(`未找到${genre}类型的相关内容`)
  }

  const source = results[Math.floor(Math.random() * results.length)]

  return {
    title: `来自知乎的${genre}故事`,
    description: `灵感来源：${source.title}。${source.content_text}`,
    genre,
    sourceUrl: source.url,
  }
}

export type { HotListItem, SearchResultItem }
