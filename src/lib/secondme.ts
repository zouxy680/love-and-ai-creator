// SecondMe OAuth 和 API 工具函数

// 环境变量 - 带默认值和错误检查
const SECONDME_CLIENT_ID = process.env.SECONDME_CLIENT_ID
const SECONDME_CLIENT_SECRET = process.env.SECONDME_CLIENT_SECRET
const SECONDME_REDIRECT_URI = process.env.SECONDME_REDIRECT_URI
const SECONDME_OAUTH_AUTHORIZE_URL = process.env.SECONDME_OAUTH_AUTHORIZE_URL || 'https://go.second.me/oauth/'
const SECONDME_OAUTH_TOKEN_URL = process.env.SECONDME_OAUTH_TOKEN_URL || 'https://api.mindverse.com/gate/lab/api/oauth/token/code'
const SECONDME_OAUTH_REFRESH_URL = process.env.SECONDME_OAUTH_REFRESH_URL || 'https://api.mindverse.com/gate/lab/api/oauth/token/refresh'
const SECONDME_USERINFO_URL = process.env.SECONDME_USERINFO_URL || 'https://api.mindverse.com/gate/lab/api/secondme/user/info'
const SECONDME_CHAT_URL = process.env.SECONDME_CHAT_URL || 'https://api.mindverse.com/gate/lab/api/secondme/chat/stream'
const SECONDME_NOTE_URL = process.env.SECONDME_NOTE_URL || 'https://api.mindverse.com/gate/lab/api/secondme/note/add'

// 检查必需的环境变量
function checkRequiredEnvVars() {
  const missing: string[] = []
  if (!SECONDME_CLIENT_ID) missing.push('SECONDME_CLIENT_ID')
  if (!SECONDME_CLIENT_SECRET) missing.push('SECONDME_CLIENT_SECRET')
  if (!SECONDME_REDIRECT_URI) missing.push('SECONDME_REDIRECT_URI')

  if (missing.length > 0) {
    console.error('[SecondMe] Missing required environment variables:', missing.join(', '))
    return false
  }
  return true
}

// 生成随机状态字符串
export function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 获取 SecondMe OAuth 授权 URL
// 注意：OAUTH_AUTHORIZE_URL 已包含完整路径，直接拼接 ? 和参数
export function getSecondMeAuthUrl(): string {
  if (!checkRequiredEnvVars()) {
    // 返回一个错误页面 URL 或者抛出错误
    return '/login?error=missing_env_vars'
  }

  const params = new URLSearchParams({
    client_id: SECONDME_CLIENT_ID!,
    redirect_uri: SECONDME_REDIRECT_URI!,
    response_type: 'code',
    scope: 'user.info user.info.shades note.add chat',
    state: generateState(),
  })

  const authUrl = `${SECONDME_OAUTH_AUTHORIZE_URL}?${params.toString()}`
  console.log('[SecondMe] Generated auth URL with redirect_uri:', SECONDME_REDIRECT_URI)

  return authUrl
}

// 使用授权码交换 Token
// 响应格式: { code: 0, data: { accessToken, refreshToken, expiresIn, ... } }
export async function exchangeCodeForToken(code: string) {
  if (!checkRequiredEnvVars()) {
    throw new Error('Missing required environment variables')
  }

  console.log('[SecondMe] Exchanging code for token, redirect_uri:', SECONDME_REDIRECT_URI)

  const response = await fetch(SECONDME_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SECONDME_REDIRECT_URI!,
      client_id: SECONDME_CLIENT_ID!,
      client_secret: SECONDME_CLIENT_SECRET!,
    }),
  })

  const result = await response.json()

  console.log('[SecondMe] Token exchange response:', JSON.stringify(result, null, 2))

  if (result.code !== 0 || !result.data) {
    throw new Error(`Failed to exchange code for token: ${result.message || JSON.stringify(result)}`)
  }

  return {
    access_token: result.data.accessToken,
    refresh_token: result.data.refreshToken,
    expires_in: result.data.expiresIn,
  }
}

// 刷新 Token
export async function refreshAccessToken(refreshToken: string) {
  if (!SECONDME_CLIENT_ID || !SECONDME_CLIENT_SECRET) {
    throw new Error('Missing SECONDME_CLIENT_ID or SECONDME_CLIENT_SECRET')
  }

  const response = await fetch(SECONDME_OAUTH_REFRESH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: SECONDME_CLIENT_ID,
      client_secret: SECONDME_CLIENT_SECRET,
    }),
  })

  const result = await response.json()

  if (result.code !== 0 || !result.data) {
    throw new Error(`Failed to refresh token: ${result.message || JSON.stringify(result)}`)
  }

  return {
    access_token: result.data.accessToken,
    refresh_token: result.data.refreshToken,
    expires_in: result.data.expiresIn,
  }
}

// 获取用户信息
// 响应格式: { code: 0, data: { email, name, avatarUrl, route, ... } }
export async function getUserInfo(accessToken: string) {
  const response = await fetch(SECONDME_USERINFO_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  const result = await response.json()

  if (result.code !== 0 || !result.data) {
    throw new Error(`Failed to get user info: ${result.message || JSON.stringify(result)}`)
  }

  // 映射到统一格式
  return {
    sub: result.data.route || result.data.id,
    name: result.data.name,
    email: result.data.email,
    picture: result.data.avatarUrl,
    bio: result.data.bio,
    shades: result.data.shades,
  }
}

// A2A Chat API
export async function sendChatMessage(
  accessToken: string,
  agentId: string,
  message: string,
  context?: Record<string, unknown>
) {
  const response = await fetch(SECONDME_CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: agentId,
      message,
      context,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to send chat message: ${error}`)
  }

  return response.json()
}

// Key Memory - 读取（获取用户软记忆）
// 响应格式: { code: 0, data: { list: [...] } }
export async function getNotes(accessToken: string, category?: string) {
  const SECONDME_API_BASE_URL = process.env.SECONDME_API_BASE_URL || 'https://api.mindverse.com/gate/lab'
  const url = `${SECONDME_API_BASE_URL}/api/secondme/user/softmemory${category ? `?category=${category}` : ''}`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  const result = await response.json()

  if (result.code !== 0) {
    throw new Error(`Failed to get notes: ${result.message || JSON.stringify(result)}`)
  }

  // 返回 list 数组
  return result.data?.list || []
}

// Key Memory - 写入
export async function createNote(
  accessToken: string,
  key: string,
  value: string,
  category?: string
) {
  const response = await fetch(SECONDME_NOTE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      value,
      category,
    }),
  })

  const result = await response.json()

  if (result.code !== 0) {
    throw new Error(`Failed to create note: ${result.message || JSON.stringify(result)}`)
  }

  return result.data
}
