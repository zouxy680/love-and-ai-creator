import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserAchievements, ACHIEVEMENTS } from '@/lib/social'

/**
 * 获取用户成就
 * GET /api/social/achievements
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await getUserAchievements(userId)

    return NextResponse.json({
      achievements: result.achievements,
      stats: result.stats,
      availableAchievements: ACHIEVEMENTS,
    })
  } catch (error) {
    console.error('[AchievementsAPI] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get achievements' },
      { status: 500 }
    )
  }
}
