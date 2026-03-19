import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createInvitation, acceptInvitation } from '@/lib/social'

/**
 * 创建邀请
 * POST /api/social/invite
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { storyId, action, code } = body

    if (action === 'create') {
      // 创建邀请
      if (!storyId) {
        return NextResponse.json({ error: 'storyId is required' }, { status: 400 })
      }

      const invitation = await createInvitation(storyId, userId)

      // 生成邀请链接
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const inviteLink = `${baseUrl}/story/${storyId}?invite=${invitation.code}`

      return NextResponse.json({
        success: true,
        invitation: {
          code: invitation.code,
          link: inviteLink,
          expiresAt: invitation.expiresAt || invitation.createdAt,
        },
      })
    } else if (action === 'accept') {
      // 接受邀请
      if (!code) {
        return NextResponse.json({ error: 'code is required' }, { status: 400 })
      }

      const result = await acceptInvitation(code, userId)

      return NextResponse.json(result)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[InviteAPI] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process invitation'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
