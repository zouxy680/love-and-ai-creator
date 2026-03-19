import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sendChatMessage, getUserInfo, refreshAccessToken } from '@/lib/secondme'
import { getUserStoryRole } from '@/lib/agent-casting'

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
    const { storyId, message, sceneContext } = body

    if (!storyId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 获取故事信息
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    })

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    // 🎭 获取用户的角色分配
    const roleAssignment = await getUserStoryRole(storyId, userId)
    const rolePrompt = roleAssignment?.customPrompt || ''

    // 构建发送给 AI 的消息
    const systemPrompt = `${rolePrompt || `你是一个互动小说中的角色。`}

【故事背景】
标题：${story.title}
类型：${story.genre}
描述：${story.description}
${sceneContext ? `\n【当前场景】\n${sceneContext.title}\n${sceneContext.content}` : ''}

请根据玩家的输入，以角色的身份做出回应。回应应该：
1. 符合故事氛围和你的角色定位
2. 推动剧情发展
3. 保持角色的一致性
4. 用中文回复
5. 控制回复长度在50-100字以内`

    // 调用 SecondMe A2A Chat API
    let accessToken = user.accessToken

    // 检查 Token 是否过期，尝试刷新
    if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
      console.log('[Chat] Token expired, attempting refresh...')
      if (!user.refreshToken) {
        return NextResponse.json(
          { error: '登录已过期，请重新登录', needRelogin: true },
          { status: 401 }
        )
      }

      try {
        const tokenData = await refreshAccessToken(user.refreshToken)
        accessToken = tokenData.access_token

        // 更新数据库中的 token
        await prisma.user.update({
          where: { id: userId },
          data: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
          },
        })
        console.log('[Chat] Token refreshed successfully')
      } catch (refreshError) {
        console.error('[Chat] Token refresh failed:', refreshError)
        return NextResponse.json(
          { error: '登录已过期，请重新登录', needRelogin: true },
          { status: 401 }
        )
      }
    }

    // 获取用户的 SecondMe 分身信息
    let userInfo
    try {
      userInfo = await getUserInfo(accessToken)
    } catch (userInfoError) {
      console.error('[Chat] Failed to get user info:', userInfoError)
      // 可能是 token 无效，需要重新登录
      return NextResponse.json(
        { error: '获取分身信息失败，请重新登录', needRelogin: true },
        { status: 401 }
      )
    }
    const agentId = userInfo.sub

    // 调用 Chat API
    const chatResponse = await sendChatMessage(
      accessToken,
      agentId,
      `${systemPrompt}\n\n玩家说：${message}`,
      { storyId, sceneContext, roleName: roleAssignment?.characterName }
    )

    const aiResponse = chatResponse.response

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'AI 响应为空，请重试' },
        { status: 500 }
      )
    }

    // 保存消息到数据库
    const chatMessage = await prisma.chatMessage.create({
      data: {
        storyId,
        senderId: user.id,
        senderType: 'user',
        content: message,
      },
    })

    const agentMessage = await prisma.chatMessage.create({
      data: {
        storyId,
        senderId: roleAssignment?.characterId || 'agent',
        senderType: 'agent',
        content: aiResponse,
        metadata: JSON.stringify({
          sceneContext,
          roleName: roleAssignment?.characterName,
          roleType: roleAssignment?.characterRole,
        }),
      },
    })

    return NextResponse.json({
      messageId: agentMessage.id,
      response: aiResponse,
      roleName: roleAssignment?.characterName,
      roleType: roleAssignment?.characterRole,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    const errorMessage = error instanceof Error ? error.message : '请求失败，请重试'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
