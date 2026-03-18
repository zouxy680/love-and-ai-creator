// SecondMe OAuth 和 API 工具函数

const SECONDME_CLIENT_ID = process.env.SECONDME_CLIENT_ID!
const SECONDME_CLIENT_SECRET = process.env.SECONDME_CLIENT_SECRET!
const SECONDME_REDIRECT_URI = process.env.SECONDME_REDIRECT_URI!
const SECONDME_OAUTH_AUTHORIZE_URL = process.env.SECONDME_OAUTH_AUTHORIZE_URL!
const SECONDME_OAUTH_TOKEN_URL = process.env.SECONDME_OAUTH_TOKEN_URL!
const SECONDME_USERINFO_URL = process.env.SECONDME_USERINFO_URL!
const SECONDME_CHAT_URL = process.env.SECONDME_CHAT_URL!
const SECONDME_NOTE_URL = process.env.SECONDME_NOTE_URL!

// 生成随机状态字符串
export function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 获取 SecondMe OAuth 授权 URL
export function getSecondMeAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: SECONDME_CLIENT_ID,
    redirect_uri: SECONDME_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile chat note',
    state: generateState(),
  })

  return `${SECONDME_OAUTH_AUTHORIZE_URL}?${params.toString()}`
}

// 使用授权码交换 Token
export async function exchangeCodeForToken(code: string) {
  const response = await fetch(SECONDME_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SECONDME_REDIRECT_URI,
      client_id: SECONDME_CLIENT_ID,
      client_secret: SECONDME_CLIENT_SECRET,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for token: ${error}`)
  }

  return response.json()
}

// 获取用户信息
export async function getUserInfo(accessToken: string) {
  const response = await fetch(SECONDME_USERINFO_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user info: ${error}`)
  }

  return response.json()
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

// Key Memory - 读取
export async function getNotes(accessToken: string, category?: string) {
  const url = new URL(SECONDME_NOTE_URL)
  if (category) {
    url.searchParams.set('category', category)
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get notes: ${error}`)
  }

  return response.json()
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

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create note: ${error}`)
  }

  return response.json()
}
