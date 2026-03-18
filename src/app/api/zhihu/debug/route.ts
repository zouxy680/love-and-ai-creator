import { NextResponse } from 'next/server'

// 调试知乎 API 连接
export async function GET() {
  const ZHIHU_API_BASE = process.env.ZHIHU_API_BASE_URL
  const ZHIHU_API_TOKEN = process.env.ZHIHU_API_TOKEN
  const ZHIHU_API_KEY = process.env.ZHIHU_API_KEY

  const tests: Array<{ url: string; status?: number; ok?: boolean; data?: unknown; error?: string }> = []

  // 测试不同的 base URL
  const baseUrls = [
    'https://www.zhihu.com/api',
    'https://www.zhihu.com',
    'https://api.zhihu.com',
  ]

  for (const baseUrl of baseUrls) {
    const url = `${baseUrl}/openapi/billboard/list`
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (ZHIHU_API_TOKEN) {
        headers['authorization'] = `Bearer ${ZHIHU_API_TOKEN}`
      }
      if (ZHIHU_API_KEY) {
        headers['x-api-key'] = ZHIHU_API_KEY
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = text.substring(0, 500)
      }

      tests.push({
        url,
        status: response.status,
        ok: response.ok,
        data,
      })
    } catch (error) {
      tests.push({
        url,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    config: {
      base_url: ZHIHU_API_BASE,
      has_token: !!ZHIHU_API_TOKEN,
      has_key: !!ZHIHU_API_KEY,
    },
    tests,
  }, { status: 200 })
}
