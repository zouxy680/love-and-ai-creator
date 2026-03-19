import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUserStoryRole, castStoryAgents, saveRoleAssignments } from '@/lib/agent-casting'
import { prisma } from '@/lib/prisma'

/**
 * 获取用户在故事中的角色分配
 * GET /api/stories/role?storyId=xxx
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

    const roleAssignment = await getUserStoryRole(storyId, userId)

    if (!roleAssignment) {
      return NextResponse.json({ error: 'Role assignment not found' }, { status: 404 })
    }

    return NextResponse.json({
      roleAssignment: {
        characterId: roleAssignment.characterId,
        characterName: roleAssignment.characterName,
        characterRole: roleAssignment.characterRole,
        characterDescription: roleAssignment.characterDescription,
        personalityMatch: roleAssignment.personalityMatch,
        customPrompt: roleAssignment.customPrompt,
      },
    })
  } catch (error) {
    console.error('[RoleAPI] Error:', error)
    const errorMessage = error instanceof Error ? error.message : '获取角色分配失败'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * 为故事创建角色分配
 * POST /api/stories/role
 * Body: { storyId: string, participantIds?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { storyId, participantIds } = body

    if (!storyId) {
      return NextResponse.json({ error: 'storyId is required' }, { status: 400 })
    }

    // 如果没有提供参与者列表，使用当前用户
    const participants = participantIds || [userId]

    // 检查故事是否存在
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    })

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    // 执行角色分配
    const assignments = await castStoryAgents(storyId, participants)
    await saveRoleAssignments(assignments)

    return NextResponse.json({
      success: true,
      assignments: assignments.map(a => ({
        userId: a.userId,
        characterId: a.characterId,
        characterName: a.characterName,
        characterRole: a.characterRole,
        personalityMatch: a.personalityMatch,
      })),
    })
  } catch (error) {
    console.error('[RoleAPI] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create role assignments'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
