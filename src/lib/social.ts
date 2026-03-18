// 裂变 & 社交系统 - 分享、邀请、成就

import { prisma } from './prisma'

/**
 * 分享记录
 */
export interface ShareRecord {
  id: string
  storyId: string
  userId: string
  platform: 'zhihu' | 'wechat' | 'weibo' | 'link'
  sharedAt: Date
  referralCode: string
  clicks: number
  joins: number
}

/**
 * 邀请记录
 */
export interface InvitationRecord {
  id: string
  storyId: string
  inviterId: string
  inviteeId: string | null
  code: string
  status: 'pending' | 'accepted' | 'expired'
  createdAt: Date
  expiresAt: Date
  acceptedAt: Date | null
  reward: string | null
}

/**
 * 成就定义
 */
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  condition: string
  reward?: {
    type: 'badge' | 'title' | 'unlock'
    value: string
  }
}

/**
 * 成就列表
 */
export const ACHIEVEMENTS: Achievement[] = [
  // 故事成就
  {
    id: 'first_story',
    name: '初入江湖',
    description: '完成第一个故事',
    icon: '📖',
    rarity: 'common',
    condition: 'complete_story_count >= 1',
  },
  {
    id: 'story_master',
    name: '故事大师',
    description: '完成10个故事',
    icon: '📚',
    rarity: 'rare',
    condition: 'complete_story_count >= 10',
  },
  {
    id: 'legend_teller',
    name: '传奇讲述者',
    description: '完成50个故事',
    icon: '🏆',
    rarity: 'legendary',
    condition: 'complete_story_count >= 50',
  },

  // 结局成就
  {
    id: 'good_ending',
    name: '圆满结局',
    description: '获得一个好结局',
    icon: '✨',
    rarity: 'common',
    condition: 'good_endings >= 1',
  },
  {
    id: 'true_ending',
    name: '真相大白',
    description: '获得一个真结局',
    icon: '🌟',
    rarity: 'epic',
    condition: 'true_endings >= 1',
  },
  {
    id: 'all_endings',
    name: '命运探索者',
    description: '获得所有类型的结局',
    icon: '🎯',
    rarity: 'legendary',
    condition: 'all_ending_types',
  },

  // 社交成就
  {
    id: 'first_share',
    name: '分享达人',
    description: '首次分享故事',
    icon: '📤',
    rarity: 'common',
    condition: 'share_count >= 1',
  },
  {
    id: 'viral_star',
    name: '传播之星',
    description: '分享的故事获得100次点击',
    icon: '🔥',
    rarity: 'rare',
    condition: 'share_clicks >= 100',
  },
  {
    id: 'invitation_master',
    name: '邀请大师',
    description: '成功邀请10位好友',
    icon: '👥',
    rarity: 'epic',
    condition: 'successful_invites >= 10',
  },

  // 角色成就
  {
    id: 'role_perfect',
    name: '完美演绎',
    description: '角色匹配度达到100%',
    icon: '🎭',
    rarity: 'epic',
    condition: 'perfect_role_match',
  },
  {
    id: 'all_roles',
    name: '千面人生',
    description: '扮演过所有类型的角色',
    icon: '🎪',
    rarity: 'legendary',
    condition: 'all_role_types',
  },
]

/**
 * 生成分享码
 */
export function generateShareCode(storyId: string, userId: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  const hash = Buffer.from(`${storyId}:${userId}:${timestamp}`).toString('base64url').substring(0, 8)
  return `${hash}${random}`
}

/**
 * 生成邀请码
 */
export function generateInviteCode(storyId: string, inviterId: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `INVITE-${storyId.substring(0, 4)}-${random}-${timestamp}`.toUpperCase()
}

/**
 * 创建邀请
 */
export async function createInvitation(
  storyId: string,
  inviterId: string
): Promise<InvitationRecord> {
  const code = generateInviteCode(storyId, inviterId)

  // 设置24小时过期
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const invitation = await prisma.storyInvitation.create({
    data: {
      storyId,
      inviterId,
      code,
      status: 'pending',
      expiresAt,
    },
  })

  return {
    id: invitation.id,
    storyId,
    inviterId,
    inviteeId: null,
    code,
    status: 'pending',
    createdAt: invitation.createdAt,
    expiresAt,
    acceptedAt: null,
    reward: null,
  }
}

/**
 * 接受邀请
 */
export async function acceptInvitation(
  code: string,
  inviteeId: string
): Promise<{ success: boolean; storyId?: string; error?: string }> {
  const invitation = await prisma.storyInvitation.findUnique({
    where: { code },
  })

  if (!invitation) {
    return { success: false, error: '邀请码不存在' }
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: '邀请码已失效' }
  }

  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    await prisma.storyInvitation.update({
      where: { id: invitation.id },
      data: { status: 'expired' },
    })
    return { success: false, error: '邀请码已过期' }
  }

  // 不能接受自己的邀请
  if (invitation.inviterId === inviteeId) {
    return { success: false, error: '不能使用自己的邀请码' }
  }

  // 更新邀请状态
  await prisma.storyInvitation.update({
    where: { id: invitation.id },
    data: {
      inviteeId,
      status: 'accepted',
      acceptedAt: new Date(),
    },
  })

  // 给邀请者奖励
  await grantInvitationReward(invitation.inviterId)

  return { success: true, storyId: invitation.storyId }
}

/**
 * 授予邀请奖励
 */
async function grantInvitationReward(inviterId: string): Promise<void> {
  // 统计成功邀请数
  const inviteCount = await prisma.storyInvitation.count({
    where: { inviterId, status: 'accepted' },
  })

  // 解锁成就
  if (inviteCount === 1) {
    await unlockAchievement(inviterId, 'first_share')
  }
  if (inviteCount >= 10) {
    await unlockAchievement(inviterId, 'invitation_master')
  }
}

/**
 * 解锁成就
 */
export async function unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)
  if (!achievement) return false

  // 检查是否已解锁
  const existing = await prisma.achievement.findFirst({
    where: { userId, achievementId },
  })

  if (existing) return false

  // 解锁成就
  await prisma.achievement.create({
    data: {
      userId,
      achievementId,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      rarity: achievement.rarity,
      metadata: JSON.stringify(achievement.reward || {}),
    },
  })

  console.log(`[Social] Achievement unlocked: ${achievement.name} for user ${userId}`)
  return true
}

/**
 * 获取用户成就
 */
export async function getUserAchievements(userId: string): Promise<{
  achievements: Array<{
    id: string
    name: string
    description: string
    icon: string
    rarity: string
    unlockedAt: Date
  }>
  stats: {
    total: number
    common: number
    rare: number
    epic: number
    legendary: number
  }
}> {
  const achievements = await prisma.achievement.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  const stats = {
    total: achievements.length,
    common: achievements.filter(a => a.rarity === 'common').length,
    rare: achievements.filter(a => a.rarity === 'rare').length,
    epic: achievements.filter(a => a.rarity === 'epic').length,
    legendary: achievements.filter(a => a.rarity === 'legendary').length,
  }

  return {
    achievements: achievements.map(a => ({
      id: a.achievementId,
      name: a.name,
      description: a.description,
      icon: a.icon,
      rarity: a.rarity,
      unlockedAt: a.createdAt,
    })),
    stats,
  }
}

/**
 * 获取分享统计
 */
export async function getShareStats(storyId: string, userId: string): Promise<{
  shareCount: number
  totalClicks: number
  totalJoins: number
  invitations: {
    total: number
    pending: number
    accepted: number
  }
}> {
  const [shares, invitations] = await Promise.all([
    prisma.storyShare.findMany({
      where: { storyId, userId },
    }),
    prisma.storyInvitation.findMany({
      where: { storyId, inviterId: userId },
    }),
  ])

  return {
    shareCount: shares.length,
    totalClicks: shares.reduce((sum, s) => sum + (s.clicks || 0), 0),
    totalJoins: shares.reduce((sum, s) => sum + (s.joins || 0), 0),
    invitations: {
      total: invitations.length,
      pending: invitations.filter(i => i.status === 'pending').length,
      accepted: invitations.filter(i => i.status === 'accepted').length,
    },
  }
}

/**
 * 生成分享链接
 */
export async function generateShareLink(
  storyId: string,
  userId: string,
  baseUrl: string,
  metadata?: {
    characterName?: string
    endingType?: string
  }
): Promise<{
  link: string
  code: string
}> {
  const code = generateShareCode(storyId, userId)
  const link = `${baseUrl}/share/${code}`

  // 记录分享
  await prisma.storyShare.create({
    data: {
      storyId,
      userId,
      platform: 'link',
      code,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })

  return { link, code }
}
