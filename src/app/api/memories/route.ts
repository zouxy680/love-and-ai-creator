import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ memories })
  } catch (error) {
    console.error('Error fetching memories:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { memories } = body as { memories: Array<{ key: string; value: string; category?: string }> }

    if (!Array.isArray(memories)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // 使用 upsert 来创建或更新记忆
    for (const memory of memories) {
      await prisma.memory.upsert({
        where: {
          userId_key: {
            userId,
            key: memory.key,
          },
        },
        create: {
          userId,
          key: memory.key,
          value: memory.value,
          category: memory.category || null,
        },
        update: {
          value: memory.value,
          category: memory.category || null,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving memories:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
