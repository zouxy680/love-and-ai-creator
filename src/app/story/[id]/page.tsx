import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import StoryClient from './StoryClient'
import { getUserStoryRole, castStoryAgents, saveRoleAssignments } from '@/lib/agent-casting'

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ invite?: string; ref?: string }>
}) {
  const { id } = await params
  const { invite, ref } = await searchParams
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    // 保存重定向地址，登录后返回
    const redirectUrl = invite
      ? `/story/${id}?invite=${invite}`
      : ref
        ? `/story/${id}?ref=${ref}`
        : `/story/${id}`
    redirect(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    redirect('/login')
  }

  // 处理邀请链接
  if (invite) {
    try {
      const invitation = await prisma.storyInvitation.findUnique({
        where: { code: invite },
      })

      if (invitation && invitation.status === 'pending') {
        // 更新邀请状态
        await prisma.storyInvitation.update({
          where: { id: invitation.id },
          data: {
            inviteeId: user.id,
            status: 'accepted',
            acceptedAt: new Date(),
          },
        })
        console.log(`[Story] Invitation accepted: ${invite}`)
      }
    } catch (error) {
      console.error('[Story] Failed to process invitation:', error)
    }
  }

  // 处理分享链接点击统计
  if (ref) {
    try {
      await prisma.storyShare.update({
        where: { code: ref },
        data: { clicks: { increment: 1 } },
      })
    } catch {
      // 忽略统计错误
    }
  }

  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      chats: {
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
    },
  })

  if (!story) {
    redirect('/stories')
  }

  // 查找或创建参与记录
  let participant = await prisma.storyParticipant.findUnique({
    where: {
      userId_storyId: {
        userId: user.id,
        storyId: story.id,
      },
    },
  })

  if (!participant) {
    participant = await prisma.storyParticipant.create({
      data: {
        userId: user.id,
        storyId: story.id,
        role: '主角',
        status: 'active',
      },
    })
  }

  // 🎭 获取或创建角色分配
  let roleAssignment = await getUserStoryRole(story.id, user.id)

  if (!roleAssignment) {
    // 如果没有角色分配，创建一个新的
    try {
      const assignments = await castStoryAgents(story.id, [user.id])
      await saveRoleAssignments(assignments)
      roleAssignment = assignments[0]
      console.log(`[Story] Created role assignment: ${roleAssignment?.characterName}`)
    } catch (error) {
      console.error('[Story] Failed to create role assignment:', error)
    }
  }

  // 解析剧本内容
  let storyContent = null
  try {
    storyContent = JSON.parse(story.content)
  } catch {
    storyContent = { scenes: [] }
  }

  return (
    <StoryClient
      story={story}
      storyContent={storyContent}
      participant={participant}
      user={user}
      messages={story.chats}
      roleAssignment={roleAssignment}
    />
  )
}
