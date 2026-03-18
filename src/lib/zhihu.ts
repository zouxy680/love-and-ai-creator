// 知乎 API 工具函数（带永久缓存 + HMAC-SHA256 签名认证）

import crypto from 'crypto'
import { getOrSetCache, generateCacheKey } from './cache'

const ZHIHU_APP_KEY = process.env.ZHIHU_APP_KEY
const ZHIHU_APP_SECRET = process.env.ZHIHU_APP_SECRET
const ZHIHU_API_BASE = process.env.ZHIHU_API_BASE_URL || 'https://openapi.zhihu.com'

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
      try {
        console.log('[Zhihu] Fetching hot list from API...')
        const data = await zhihuRequest<{ list: HotListItem[] }>('/openapi/billboard/list')
        return data.list || []
      } catch (error) {
        console.error('[Zhihu] Error fetching hot list, using mock data:', error)
        return getMockHotList()
      }
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
      try {
        console.log(`[Zhihu] Searching for: "${query}" (count: ${count})`)
        const params = new URLSearchParams({
          query,
          count: count.toString(),
        })

        const data = await zhihuRequest<{ has_more: boolean; items: SearchResultItem[] }>(
          `/openapi/search/global?${params.toString()}`
        )
        return data.items || []
      } catch (error) {
        console.error('[Zhihu] Error searching, using mock data:', error)
        return getMockSearchResults(query)
      }
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
} | null> {
  try {
    const results = await searchStoryContent(genre, 5)

    if (results.length === 0) {
      return null
    }

    const source = results[Math.floor(Math.random() * results.length)]

    return {
      title: `来自知乎的${genre}故事`,
      description: `灵感来源：${source.title}。${source.content_text}`,
      genre,
      sourceUrl: source.url,
    }
  } catch (error) {
    console.error('[Zhihu] Error generating story:', error)
    return null
  }
}

// 模拟数据 - 当 API 不可用时使用
function getMockHotList(): HotListItem[] {
  console.log('[Zhihu] Using mock hot list data')
  return [
    {
      token: '1',
      title: '如何评价最近爆火的悬疑小说？',
      body: '一部优秀的悬疑小说应该如何构建紧张感和反转？读者最喜欢什么样的悬疑故事？',
      link_url: 'https://www.zhihu.com/question/1',
      heat_score: 1000000,
      type: 'QUESTION',
      published_time_str: '2026-03-18 10:00:00',
    },
    {
      token: '2',
      title: '分享一个让你印象深刻的故事',
      body: '生活中总有一些意想不到的转折，让人回味无穷。你有没有听过让你印象深刻的故事？',
      link_url: 'https://www.zhihu.com/question/2',
      heat_score: 800000,
      type: 'QUESTION',
      published_time_str: '2026-03-18 09:00:00',
    },
    {
      token: '3',
      title: '科幻小说中的哪些设定让你惊叹？',
      body: '从时间旅行到平行宇宙，科幻作家的想象力令人折服。分享那些让你惊叹的科幻设定。',
      link_url: 'https://www.zhihu.com/question/3',
      heat_score: 600000,
      type: 'QUESTION',
      published_time_str: '2026-03-18 08:00:00',
    },
    {
      token: '4',
      title: '一个让人泪目的爱情故事',
      body: '真正的爱情是什么样子？分享那些让你感动落泪的爱情故事。',
      link_url: 'https://www.zhihu.com/question/4',
      heat_score: 550000,
      type: 'QUESTION',
      published_time_str: '2026-03-18 07:00:00',
    },
    {
      token: '5',
      title: '悬疑推理：一个完美的密室案件',
      body: '门窗紧锁，没有外人进入的痕迹，受害者却离奇死亡。这是怎么做到的？',
      link_url: 'https://www.zhihu.com/question/5',
      heat_score: 450000,
      type: 'QUESTION',
      published_time_str: '2026-03-18 06:00:00',
    },
  ]
}

function getMockSearchResults(query: string): SearchResultItem[] {
  console.log(`[Zhihu] Using mock search results for: "${query}"`)
  return [
    {
      content_id: '1',
      content_type: 'Answer',
      title: `关于"${query}"的深度解析`,
      content_text: `这是一篇关于${query}的文章，详细探讨了其中的奥秘，从多个角度分析了相关内容...`,
      url: 'https://www.zhihu.com/xxx/1',
      author_name: '知乎用户',
      author_avatar: '',
      vote_up_count: 1000,
      comment_count: 50,
      edit_time: Date.now(),
    },
    {
      content_id: '2',
      content_type: 'Article',
      title: `${query}：一个不为人知的故事`,
      content_text: `很少有人知道，关于${query}还有这样一段往事...这个故事发生在很久以前...`,
      url: 'https://www.zhihu.com/xxx/2',
      author_name: '故事讲述者',
      author_avatar: '',
      vote_up_count: 800,
      comment_count: 30,
      edit_time: Date.now(),
    },
    {
      content_id: '3',
      content_type: 'Answer',
      title: `如何理解${query}？`,
      content_text: `这是一个很有趣的问题。关于${query}，我认为可以从以下几个角度来看...`,
      url: 'https://www.zhihu.com/xxx/3',
      author_name: '专业人士',
      author_avatar: '',
      vote_up_count: 500,
      comment_count: 20,
      edit_time: Date.now(),
    },
  ]
}

export type { HotListItem, SearchResultItem }
