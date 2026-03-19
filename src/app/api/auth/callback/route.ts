import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getUserInfo, getUserShades } from '@/lib/secondme'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('[OAuth] Error from SecondMe:', error)
      return NextResponse.redirect(
        new URL(`/login?error=${error}`, request.url)
      )
    }

    if (!code) {
      console.error('[OAuth] No code in callback')
      return NextResponse.redirect(
        new URL('/login?error=no_code', request.url)
      )
    }

    // 交换 Token
    console.log('[OAuth] Exchanging code for token...')
    let tokenData
    try {
      tokenData = await exchangeCodeForToken(code)
      console.log('[OAuth] Token exchange successful')
    } catch (tokenError) {
      console.error('[OAuth] Token exchange failed:', tokenError)
      return NextResponse.redirect(
        new URL(`/login?error=token_failed&details=${encodeURIComponent(String(tokenError))}`, request.url)
      )
    }

    const { access_token, refresh_token, expires_in } = tokenData

    // 获取用户信息
    console.log('[OAuth] Getting user info...')
    let userInfo
    try {
      userInfo = await getUserInfo(access_token)
      console.log('[OAuth] User info retrieved:', userInfo.sub)
    } catch (userError) {
      console.error('[OAuth] Get user info failed:', userError)
      return NextResponse.redirect(
        new URL(`/login?error=userinfo_failed&details=${encodeURIComponent(String(userError))}`, request.url)
      )
    }

    const { sub: secondMeId, name, email, picture, bio } = userInfo

    // 获取 Shades（人格特质）- 必须成功
    let shades: string[] = userInfo.shades || []
    console.log('[OAuth] Getting user shades...')
    try {
      const freshShades = await getUserShades(access_token)
      if (freshShades.length > 0) {
        shades = freshShades
        console.log('[OAuth] Shades retrieved:', shades.length, 'items')
      } else if (shades.length === 0) {
        // 如果 API 返回空且 user info 也没有 shades，报错
        return NextResponse.redirect(
          new URL('/login?error=no_shades&details=无法获取您的人格特质，请确保 SecondMe 账号已完善个人资料', request.url)
        )
      }
    } catch (shadeError) {
      console.error('[OAuth] Failed to get shades:', shadeError)
      if (shades.length === 0) {
        return NextResponse.redirect(
          new URL(`/login?error=shades_failed&details=${encodeURIComponent(String(shadeError))}`, request.url)
        )
      }
      // 如果 user info 有 shades，可以继续
      console.log('[OAuth] Using shades from user info as fallback')
    }

    // 计算过期时间
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000)

    // 保存或更新用户到数据库
    console.log('[OAuth] Saving user to database...')
    let user
    try {
      user = await prisma.user.upsert({
        where: { secondMeId },
        create: {
          secondMeId,
          email: email || null,
          name: name || null,
          avatar: picture || null,
          bio: bio || null,
          shades: shades.length > 0 ? JSON.stringify(shades) : null,
          accessToken: access_token,
          refreshToken: refresh_token || null,
          tokenExpiresAt,
        },
        update: {
          email: email || null,
          name: name || null,
          avatar: picture || null,
          bio: bio || null,
          shades: shades.length > 0 ? JSON.stringify(shades) : null,
          accessToken: access_token,
          refreshToken: refresh_token || null,
          tokenExpiresAt,
        },
      })
      console.log('[OAuth] User saved:', user.id)
    } catch (dbError) {
      console.error('[OAuth] Database error:', dbError)
      return NextResponse.redirect(
        new URL(`/login?error=db_failed&details=${encodeURIComponent(String(dbError))}`, request.url)
      )
    }

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

    console.log('[OAuth] Login successful, redirecting to dashboard')
    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/login?error=auth_failed&details=${encodeURIComponent(String(error))}`, request.url)
    )
  }
}
