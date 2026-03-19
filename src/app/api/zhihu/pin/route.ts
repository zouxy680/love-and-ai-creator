import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { publishPin } from '@/lib/zhihu'
import { prisma } from '@/lib/prisma'
import { createNote } from '@/lib/secondme'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, circleId, images, saveToMemory } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // 发布到知乎圈子
    const result = await publishPin(content, circleId, images)

    // 如果需要保存到 Key Memory
    if (saveToMemory) {
      await createNote(
        user.accessToken,
        `zhihu_pin_${result.id}`,
        content,
        'social'
      )
    }

    return NextResponse.json({
      success: true,
      pinId: result.id,
      url: result.url,
    })
  } catch (error) {
    console.error('Error publishing pin:', error)
    const errorMessage = error instanceof Error ? error.message : '发布失败，请重试'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
