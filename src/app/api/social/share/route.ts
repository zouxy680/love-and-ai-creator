import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateShareLink, getShareStats } from '@/lib/social'

/**
 * 分享故事 - 生成分享链接
 * POST /api/social/share
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { storyId, characterName, endingType } = body

    if (!storyId) {
      return NextResponse.json({ error: 'Missing storyId' }, { status: 400 })
    }

    // 生成分享链接
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const { link, code } = await generateShareLink(storyId, userId, baseUrl, {
      characterName,
      endingType,
    })

    return NextResponse.json({
      success: true,
      url: link,
      code,
    })
  } catch (error) {
    console.error('[ShareAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    )
  }
}

/**
 * 获取分享统计
 * GET /api/social/share?storyId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storyId = request.nextUrl.searchParams.get('storyId')

    if (!storyId) {
      return NextResponse.json({ error: 'storyId is required' }, { status: 400 })
    }

    const stats = await getShareStats(storyId, userId)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[ShareAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    )
  }
}
