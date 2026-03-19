import { NextResponse } from 'next/server'
import crypto from 'crypto'

// 调试知乎 API 连接
export async function GET() {
  const ZHIHU_APP_KEY = process.env.ZHIHU_APP_KEY
  const ZHIHU_APP_SECRET = process.env.ZHIHU_APP_SECRET
  const ZHIHU_API_BASE = process.env.ZHIHU_API_BASE_URL || 'https://openapi.zhihu.com'

  interface TestResult {
    url: string
    status?: number
    ok?: boolean
    data?: unknown
    error?: string
    headers?: Record<string, string>
  }

  const tests: TestResult[] = []

  // 检查环境变量配置
  if (!ZHIHU_APP_KEY || !ZHIHU_APP_SECRET) {
    return NextResponse.json({
      error: 'Missing required environment variables',
      config: {
        ZHIHU_APP_KEY: ZHIHU_APP_KEY ? '已设置' : '未设置',
        ZHIHU_APP_SECRET: ZHIHU_APP_SECRET ? '已设置' : '未设置',
        ZHIHU_API_BASE_URL: ZHIHU_API_BASE,
      },
      hint: '请在 .env 文件中配置 ZHIHU_APP_KEY 和 ZHIHU_APP_SECRET',
    }, { status: 400 })
  }

  // 生成签名
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const logId = `request_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const extraInfo = ''
  const signStr = `app_key:${ZHIHU_APP_KEY}|ts:${timestamp}|logid:${logId}|extra_info:${extraInfo}`
  const hmac = crypto.createHmac('sha256', ZHIHU_APP_SECRET)
  hmac.update(signStr)
  const signature = hmac.digest('base64')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-App-Key': ZHIHU_APP_KEY,
    'X-Timestamp': timestamp,
    'X-Log-Id': logId,
    'X-Sign': signature,
    'X-Extra-Info': extraInfo,
  }

  // 测试热榜 API
  const url = `${ZHIHU_API_BASE}/openapi/billboard/list`
  try {
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
      headers: {
        'X-App-Key': ZHIHU_APP_KEY.substring(0, 8) + '...',
        'X-Timestamp': timestamp,
        'X-Log-Id': logId,
        'X-Sign': signature.substring(0, 20) + '...',
      },
      data,
    })
  } catch (error) {
    tests.push({
      url,
      error: error instanceof Error ? error.message : String(error),
      headers: {
        'X-App-Key': ZHIHU_APP_KEY.substring(0, 8) + '...',
        'X-Timestamp': timestamp,
        'X-Log-Id': logId,
        'X-Sign': signature.substring(0, 20) + '...',
      },
    })
  }

  return NextResponse.json({
    config: {
      ZHIHU_APP_KEY: ZHIHU_APP_KEY ? `${ZHIHU_APP_KEY.substring(0, 8)}...` : '未设置',
      ZHIHU_APP_SECRET: ZHIHU_APP_SECRET ? '已设置 (隐藏)' : '未设置',
      ZHIHU_API_BASE_URL: ZHIHU_API_BASE,
    },
    signature: {
      signString: signStr,
      timestamp,
      logId,
    },
    tests,
  }, { status: 200 })
}
