// Agent Casting 系统 - 基于 SecondMe 人格匹配故事角色

import { prisma } from './prisma'
import { getNotes } from './secondme'
import type { Character } from './story-processor'

/**
 * SecondMe 用户人格信息
 */
export interface SecondMePersonality {
  name: string           // 用户名称
  shades: string[]       // 兴趣标签（人格特征）
  softMemories: string[] // 软记忆（个人知识库）
}

/**
 * 角色分配结果
 */
export interface StoryRoleAssignment {
  id: string
  storyId: string
  userId: string
  characterId: string          // 故事中的角色 ID
  characterName: string         // 角色名称
  characterRole: string         // 角色类型：protagonist/antagonist/supporting/npc
  characterDescription: string  // 角色描述
  personalityTraits?: string    // 角色性格
  motivation?: string           // 角色动机
  personalityMatch: number      // 匹配度 0-100
  matchedShades: string[]       // 匹配到的 Shades
  customPrompt: string          // 角色扮演提示词
}

/**
 * 获取用户的 SecondMe 人格信息
 */
export async function getUserPersonality(userId: string): Promise<SecondMePersonality> {
  // 从数据库获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // 解析 Shades
  let shades: string[] = []
  if (user.shades) {
    try {
      shades = JSON.parse(user.shades)
    } catch {
      shades = []
    }
  }

  // 获取软记忆（如果有 access token）
  let softMemories: string[] = []
  if (user.accessToken) {
    try {
      const notesResponse = await getNotes(user.accessToken)
      // SecondMe 返回的格式可能是 { notes: [...] } 或直接是数组
      const notes = Array.isArray(notesResponse) ? notesResponse : (notesResponse as { notes?: unknown[] }).notes || []
      softMemories = notes.map((note: unknown) => {
        const n = note as { key?: string; value?: string }
        return n.value || n.key || String(note)
      }).filter(Boolean)
    } catch (error) {
      console.error('[AgentCasting] Failed to get soft memories:', error)
      // 软记忆获取失败不影响主流程
    }
  }

  return {
    name: user.name || '神秘玩家',
    shades,
    softMemories,
  }
}

/**
 * 为故事分配角色
 * 将用户 SecondMe 人格匹配到故事中的某个角色
 */
export async function castStoryAgents(
  storyId: string,
  participantIds: string[]
): Promise<StoryRoleAssignment[]> {
  const assignments: StoryRoleAssignment[] = []

  // 获取故事信息
  const story = await prisma.story.findUnique({
    where: { id: storyId },
  })

  if (!story) {
    throw new Error('Story not found')
  }

  // 解析故事内容，获取角色列表
  let storyContent
  try {
    storyContent = JSON.parse(story.content)
  } catch {
    throw new Error('Failed to parse story content')
  }

  const characters: Character[] = storyContent.characters || []

  if (characters.length === 0) {
    throw new Error('Story has no characters')
  }

  // 为每个参与者分配角色
  for (const userId of participantIds) {
    // 获取用户的 SecondMe 人格信息
    const personality = await getUserPersonality(userId)

    // 找到最适合用户的角色
    const bestMatch = findBestCharacterMatch(personality, characters, assignments)

    if (!bestMatch) {
      throw new Error(`No available character for user ${userId}`)
    }

    // 生成定制化的角色提示词
    const customPrompt = generateRolePrompt(
      bestMatch.character,
      story,
      personality,
      bestMatch.matchedShades,
      bestMatch.score
    )

    assignments.push({
      id: `role-${storyId}-${userId}`,
      storyId,
      userId,
      characterId: bestMatch.character.id,
      characterName: bestMatch.character.name,
      characterRole: bestMatch.character.role,
      characterDescription: bestMatch.character.description,
      personalityTraits: bestMatch.character.personality,
      motivation: bestMatch.character.motivation,
      personalityMatch: bestMatch.score,
      matchedShades: bestMatch.matchedShades,
      customPrompt,
    })
  }

  return assignments
}

/**
 * 基于 Shades 和软记忆匹配最适合的角色
 */
function findBestCharacterMatch(
  personality: SecondMePersonality,
  characters: Character[],
  alreadyAssigned: StoryRoleAssignment[]
): { character: Character; score: number; matchedShades: string[] } | null {
  // 过滤掉已被分配的角色
  const assignedIds = new Set(alreadyAssigned.map(a => a.characterId))
  const availableCharacters = characters.filter(c => !assignedIds.has(c.id))

  if (availableCharacters.length === 0) {
    return null
  }

  let bestCharacter = availableCharacters[0]
  let bestScore = 0
  let bestMatchedShades: string[] = []

  for (const character of availableCharacters) {
    const { score, matchedShades } = calculateCharacterMatchScore(personality, character)
    if (score > bestScore) {
      bestScore = score
      bestCharacter = character
      bestMatchedShades = matchedShades
    }
  }

  return { character: bestCharacter, score: bestScore, matchedShades: bestMatchedShades }
}

/**
 * 计算用户 Shades 与角色的匹配度
 */
function calculateCharacterMatchScore(
  personality: SecondMePersonality,
  character: Character
): { score: number; matchedShades: string[] } {
  let score = 50 // 基础分
  const matchedShades: string[] = []

  const charPersonality = (character.personality || '').toLowerCase()
  const charDescription = (character.description || '').toLowerCase()
  const charMotivation = (character.motivation || '').toLowerCase()
  const charFullText = `${charPersonality} ${charDescription} ${charMotivation}`

  // Shades 匹配关键词映射
  const shadeKeywords: Record<string, string[]> = {
    // 性格相关
    '外向': ['热情', '开朗', '活泼', '主角', '英雄'],
    '内向': ['沉稳', '内敛', '神秘', '配角'],
    '理性': ['冷静', '聪明', '智慧', '侦探', '反派'],
    '感性': ['温柔', '细腻', '情感', '浪漫'],
    '冒险': ['勇敢', '大胆', '探索', '冒险家'],
    '谨慎': ['小心', '细心', '谨慎', '谋士'],
    '幽默': ['风趣', '幽默', '搞笑', '喜剧'],
    '深沉': ['深沉', '复杂', '神秘', '哲学家'],

    // 兴趣相关
    '科技': ['科技', '未来', '科幻', 'AI', '机器人'],
    '艺术': ['艺术', '文艺', '美学', '设计师'],
    '文学': ['作家', '诗人', '文人', '书'],
    '历史': ['历史', '古代', '传统', '考古'],
    '推理': ['推理', '侦探', '悬疑', '解谜'],
    '爱情': ['爱情', '浪漫', '情侣', '恋人'],
    '奇幻': ['奇幻', '魔法', '神话', '精灵'],
    '恐怖': ['恐怖', '惊悚', '鬼怪', '黑暗'],
  }

  // 遍历用户的 Shades
  for (const shade of personality.shades) {
    const shadeLower = shade.toLowerCase()

    // 直接匹配角色描述中的关键词
    if (charFullText.includes(shadeLower)) {
      score += 15
      matchedShades.push(shade)
      continue
    }

    // 通过关键词映射匹配
    for (const [key, keywords] of Object.entries(shadeKeywords)) {
      // 检查 shade 是否包含关键词或其变体
      const shadeVariants = [key, ...keywords]
      const matchesShade = shadeVariants.some(v =>
        shadeLower.includes(v.toLowerCase()) || v.toLowerCase().includes(shadeLower)
      )

      if (matchesShade) {
        // 检查角色描述是否匹配任何相关关键词
        const matchesCharacter = keywords.some(k => charFullText.includes(k.toLowerCase()))
        if (matchesCharacter) {
          score += 10
          matchedShades.push(shade)
          break
        }
      }
    }
  }

  // 软记忆匹配（作为补充）
  for (const memory of personality.softMemories.slice(0, 5)) { // 只检查前5条
    const memoryLower = memory.toLowerCase()
    if (charFullText.includes(memoryLower) ||
        charPersonality.includes(memoryLower)) {
      score += 5
    }
  }

  // 角色类型基础分调整
  const role = character.role
  if (role === 'protagonist') {
    // 主角：偏好有明确性格标签的用户
    if (personality.shades.length >= 3) score += 10
  } else if (role === 'antagonist') {
    // 反派：偏好理性、深沉的用户
    if (personality.shades.some(s =>
      ['理性', '深沉', '冷静', '聪明'].some(k => s.includes(k))
    )) {
      score += 15
    }
  } else if (role === 'supporting') {
    // 配角：各种人格都可以
    score += 5
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    matchedShades: Array.from(new Set(matchedShades)) // 去重
  }
}

/**
 * 生成角色扮演提示词
 */
function generateRolePrompt(
  character: Character,
  story: { title: string; description: string; genre: string },
  personality: SecondMePersonality,
  matchedShades: string[],
  matchScore: number
): string {
  const roleDescriptions: Record<string, string> = {
    protagonist: '故事的核心人物，推动剧情发展',
    antagonist: '故事的对手，制造冲突和挑战',
    supporting: '重要的配角，在关键时刻提供帮助',
    npc: '故事中的其他人物，提供信息和线索',
  }

  const shadesContext = matchedShades.length > 0
    ? `\n\n【玩家的人格特质】\n基于该用户的 SecondMe 分身，以下特质与你的角色高度契合：\n${matchedShades.map(s => `- ${s}`).join('\n')}`
    : ''

  return `你是互动小说【${story.title}】中的角色【${character.name}】。

【角色身份】
- 角色定位：${roleDescriptions[character.role] || character.role}
- 角色描述：${character.description}
${character.personality ? `- 性格特点：${character.personality}` : ''}
${character.motivation ? `- 内心动机：${character.motivation}` : ''}

【故事背景】
- 类型：${story.genre}
- 背景：${story.description}
${shadesContext}

【你的使命】
作为${character.name}，你需要：
1. 保持角色的性格一致性，不要跳出角色
2. 用符合角色的语气和方式说话
3. 根据玩家的选择推动故事发展
4. 适时揭示角色的内心想法和情感
5. 回复简洁有力，控制在50-100字以内

【人格匹配】
这位玩家的 SecondMe 分身与你的角色匹配度为 ${matchScore}%。
${matchedShades.length > 0 ? `特别在「${matchedShades.join('、')}」方面有共鸣。` : ''}

请始终以【${character.name}】的身份回应，展现角色魅力，让玩家沉浸在故事中。`
}

/**
 * 获取用户在故事中的角色分配
 */
export async function getUserStoryRole(
  storyId: string,
  userId: string
): Promise<StoryRoleAssignment | null> {
  const participant = await prisma.storyParticipant.findFirst({
    where: { storyId, userId },
  })

  if (!participant || !participant.metadata) {
    return null
  }

  try {
    const metadata = typeof participant.metadata === 'string'
      ? JSON.parse(participant.metadata)
      : participant.metadata
    return metadata.roleAssignment || null
  } catch {
    return null
  }
}

/**
 * 保存角色分配到数据库
 */
export async function saveRoleAssignments(
  assignments: StoryRoleAssignment[]
): Promise<void> {
  for (const assignment of assignments) {
    const existing = await prisma.storyParticipant.findFirst({
      where: { storyId: assignment.storyId, userId: assignment.userId },
    })

    if (existing) {
      await prisma.storyParticipant.update({
        where: { id: existing.id },
        data: {
          role: assignment.characterName,
          metadata: JSON.stringify({ roleAssignment: assignment }),
        },
      })
    } else {
      await prisma.storyParticipant.create({
        data: {
          storyId: assignment.storyId,
          userId: assignment.userId,
          role: assignment.characterName,
          progress: 0,
          status: 'active',
          metadata: JSON.stringify({ roleAssignment: assignment }),
        },
      })
    }
  }
}
