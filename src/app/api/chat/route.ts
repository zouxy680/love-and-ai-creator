import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sendChatMessage, getUserInfo } from '@/lib/secondme'
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
    let aiResponse: string

    try {
      // 检查 Token 是否过期
      if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
        console.log('[Chat] Token expired, using fallback response')
        aiResponse = generateRoleBasedResponse(message, story.genre, roleAssignment)
      } else {
        // 获取用户的 SecondMe 分身信息
        const userInfo = await getUserInfo(user.accessToken)
        const agentId = userInfo.sub // 使用用户的 SecondMe ID 作为 agent ID

        const chatResponse = await sendChatMessage(
          user.accessToken,
          agentId,
          `${systemPrompt}\n\n玩家说：${message}`,
          { storyId, sceneContext, roleName: roleAssignment?.characterName }
        )

        aiResponse = chatResponse.response || '...'
      }
    } catch (apiError) {
      console.error('[Chat] SecondMe API error:', apiError)
      // 如果 API 调用失败，使用基于角色的模拟回复
      aiResponse = generateRoleBasedResponse(message, story.genre, roleAssignment)
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 基于角色的回复生成（当 API 不可用时）
function generateRoleBasedResponse(
  message: string,
  genre: string,
  roleAssignment: { characterRole?: string; characterName?: string } | null
): string {
  const roleType = roleAssignment?.characterRole || 'supporting'
  const characterName = roleAssignment?.characterName || '某人'

  const roleResponses: Record<string, string[]> = {
    'protagonist': [
      `"有意思..." ${characterName}若有所思地看着你，"这个细节很关键。"`,
      `"让我仔细想想。" ${characterName}开始分析局势。`,
      `"你的观察很敏锐。" ${characterName}点点头，"我们正在接近真相。"`,
    ],
    'antagonist': [
      `"哦？有意思。" ${characterName}露出一丝玩味的笑容，"你比我想象的聪明。"`,
      `"别得意太早。" ${characterName}冷冷地说，"这只是开始。"`,
      `"你的判断...出乎我的意料。" ${characterName}微微眯起眼睛。`,
    ],
    'supporting': [
      `${characterName}缓缓点头："每一个选择都会带来不同的道路。"`,
      `"记住，" ${characterName}说道，"答案往往藏在细节中。"`,
      `"你的判断是对的，" ${characterName}说道，"继续相信你的直觉。"`,
    ],
    'npc': [
      `"嗯？你问这个？" ${characterName}看起来有些紧张。`,
      `"我...我知道的不多，但..." ${characterName}犹豫地说道。`,
      `${characterName}左右看了看，压低声音："这里不方便说..."`,
    ],
  }

  const responses = roleResponses[roleType] || [
    `${characterName}点点头："我明白了，让我们继续吧。"`,
    `"好的。" ${characterName}回应道，"我们下一步该怎么做？"`,
    `${characterName}沉思片刻："这个决定很重要..."`,
  ]

  return responses[Math.floor(Math.random() * responses.length)]
}

// 备用回复生成（当 API 不可用时）
function generateFallbackResponse(message: string, genre: string): string {
  const responses: Record<string, string[]> = {
    悬疑: [
      '你的选择让局势变得更加扑朔迷离了...',
      '这个决定可能会带来意想不到的后果。',
      '黑暗中似乎有什么在注视着你。',
    ],
    言情: [
      '你的话语让空气中弥漫着甜蜜的气息。',
      '对方的眼神中闪烁着复杂的光芒。',
      '这一刻仿佛时间都静止了。',
    ],
    科幻: [
      '系统的指示灯闪烁着未知的信息。',
      '你的行动触发了连锁反应。',
      '数据流中出现了异常的波动...',
    ],
    默认: [
      '故事继续发展着...',
      '你的选择影响了命运的走向。',
      '接下来会发生什么呢？',
    ],
  }

  const category = responses[genre] || responses['默认']
  return category[Math.floor(Math.random() * category.length)]
}
