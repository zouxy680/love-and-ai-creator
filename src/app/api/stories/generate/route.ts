import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { searchZhihu, searchStoryContent } from '@/lib/zhihu'
import { structureStoryFromArticle, structureStoryWithAI } from '@/lib/story-processor'
import { castStoryAgents, saveRoleAssignments } from '@/lib/agent-casting'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { genre, keyword, sourceUrl, sourceTitle, sourceExcerpt, useAI } = body

    let article = {
      title: '',
      excerpt: '',
      content: '',
    }

    // 获取知乎内容
    if (sourceTitle && sourceExcerpt) {
      // 直接使用提供的来源信息
      article = {
        title: sourceTitle,
        excerpt: sourceExcerpt,
        content: sourceExcerpt,
      }
    } else if (keyword) {
      // 搜索知乎内容（带缓存）
      const results = await searchZhihu(keyword, 5)

      if (results.length > 0) {
        const source = results[0]
        article = {
          title: source.title,
          excerpt: source.content_text,
          content: source.content_text,
        }
      } else {
        return NextResponse.json(
          { error: '未找到相关内容，请尝试其他关键词' },
          { status: 404 }
        )
      }
    } else if (genre) {
      // 根据类型搜索（带缓存）
      const results = await searchStoryContent(genre, 5)

      if (results.length > 0) {
        const randomSource = results[Math.floor(Math.random() * results.length)]
        article = {
          title: randomSource.title,
          excerpt: randomSource.content_text,
          content: randomSource.content_text,
        }
      } else {
        return NextResponse.json(
          { error: `未找到${genre}类型的相关内容` },
          { status: 404 }
        )
      }
    } else {
      return NextResponse.json(
        { error: '请提供类型、关键词或来源信息' },
        { status: 400 }
      )
    }

    // AI 结构化处理剧本
    console.log(`[StoryGenerate] Structuring story: "${article.title}"`)

    const structuredStory = useAI
      ? await structureStoryWithAI(article, genre || '悬疑')
      : await structureStoryFromArticle(article, genre || '悬疑')

    // 转换场景格式以适配数据库
    const scenes = structuredStory.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      content: scene.description,
      choices: scene.choices?.map((c) => ({
        text: c.text,
        nextScene: c.nextSceneId,
      })),
    }))

    // 创建剧本
    const story = await prisma.story.create({
      data: {
        title: structuredStory.title,
        description: structuredStory.description,
        genre: structuredStory.genre,
        difficulty: 2,
        content: JSON.stringify({
          scenes,
          characters: structuredStory.characters,
          decisionPoints: structuredStory.decisionPoints,
        }),
      },
    })

    console.log(`[StoryGenerate] Created story: ${story.id}`)

    // 🎭 Agent Casting: 为当前用户分配角色（必须匹配到故事中的角色）
    try {
      const roleAssignments = await castStoryAgents(story.id, [userId])
      await saveRoleAssignments(roleAssignments)
      console.log(`[StoryGenerate] Role assigned: ${roleAssignments[0]?.characterName} (匹配度: ${roleAssignments[0]?.personalityMatch}%)`)

      return NextResponse.json({
        success: true,
        story: {
          id: story.id,
          title: story.title,
          description: story.description,
          genre: story.genre,
          characters: structuredStory.characters,
          scenes: scenes.length,
          roleAssignment: roleAssignments[0] ? {
            characterId: roleAssignments[0].characterId,
            characterName: roleAssignments[0].characterName,
            characterRole: roleAssignments[0].characterRole,
            characterDescription: roleAssignments[0].characterDescription,
            matchScore: roleAssignments[0].personalityMatch,
            matchedShades: roleAssignments[0].matchedShades,
          } : null,
        },
      })
    } catch (castingError) {
      console.error('[StoryGenerate] Agent casting error:', castingError)
      // 角色分配失败，返回错误
      return NextResponse.json(
        {
          error: 'Failed to assign role to user',
          detail: castingError instanceof Error ? castingError.message : 'Unknown error',
          story: {
            id: story.id,
            title: story.title,
            description: story.description,
            genre: story.genre,
            characters: structuredStory.characters,
            scenes: scenes.length,
          },
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[StoryGenerate] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate story'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
