import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getUserInfo } from '@/lib/secondme'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${error}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=no_code', request.url)
      )
    }

    // 交换 Token
    const tokenData = await exchangeCodeForToken(code)
    const { access_token, refresh_token, expires_in } = tokenData

    // 获取用户信息
    const userInfo = await getUserInfo(access_token)
    const { sub: secondMeId, name, email, picture, bio, shades } = userInfo

    // 计算过期时间
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000)

    // 保存或更新用户到数据库
    const user = await prisma.user.upsert({
      where: { secondMeId },
      create: {
        secondMeId,
        email: email || null,
        name: name || null,
        avatar: picture || null,
        bio: bio || null,
        shades: shades ? JSON.stringify(shades) : null,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        tokenExpiresAt,
      },
      update: {
        email: email || null,
        name: name || null,
        avatar: picture || null,
        bio: bio || null,
        shades: shades ? JSON.stringify(shades) : null,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        tokenExpiresAt,
      },
    })

    // 创建响应并设置 cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url))

    // 设置用户ID cookie (httpOnly for security)
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/login?error=auth_failed', request.url)
    )
  }
}
