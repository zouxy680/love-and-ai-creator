// Story Engine - 剧情引擎
// 处理场景转换、多角色互动、结局判定、进度保存

import { prisma } from './prisma'
import type { Scene, Choice, Character } from './story-processor'

/**
 * 故事状态
 */
export interface StoryState {
  storyId: string
  userId: string
  currentSceneId: string
  visitedScenes: string[]
  choices: ChoiceRecord[]
  characterRelationships: Record<string, number> // characterId -> relationship score (-100 to 100)
  flags: Record<string, boolean | string | number> // 故事标记
  startedAt: Date
  updatedAt: Date
}

/**
 * 选择记录
 */
export interface ChoiceRecord {
  sceneId: string
  choiceId: string
  choiceText: string
  timestamp: Date
  consequence?: string
}

/**
 * 结局类型
 */
export type EndingType =
  | 'good'      // 好结局
  | 'neutral'   // 中立结局
  | 'bad'       // 坏结局
  | 'secret'    // 隐藏结局
  | 'true'      // 真结局

/**
 * 结局结果
 */
export interface StoryEnding {
  type: EndingType
  title: string
  description: string
  score: number
  unlockedAchievements: string[]
}

/**
 * 故事引擎
 */
export class StoryEngine {
  private storyId: string
  private userId: string
  private state: StoryState | null = null
  private scenes: Scene[] = []
  private characters: Character[] = []

  constructor(storyId: string, userId: string) {
    this.storyId = storyId
    this.userId = userId
  }

  /**
   * 初始化引擎
   */
  async initialize(): Promise<void> {
    // 加载故事内容
    const story = await prisma.story.findUnique({
      where: { id: this.storyId },
    })

    if (!story) {
      throw new Error('Story not found')
    }

    // 解析故事内容
    try {
      const content = JSON.parse(story.content)
      this.scenes = content.scenes || []
      this.characters = content.characters || []
    } catch (error) {
      console.error('[StoryEngine] Failed to parse story content:', error)
      throw new Error('故事内容格式错误')
    }

    // 加载或创建状态
    await this.loadState()
  }

  /**
   * 加载状态
   */
  private async loadState(): Promise<void> {
    const participant = await prisma.storyParticipant.findFirst({
      where: { storyId: this.storyId, userId: this.userId },
    })

    if (participant && participant.metadata) {
      try {
        const metadata = typeof participant.metadata === 'string'
          ? JSON.parse(participant.metadata)
          : participant.metadata

        this.state = {
          storyId: this.storyId,
          userId: this.userId,
          currentSceneId: metadata.currentSceneId || this.scenes[0]?.id || 'scene-1',
          visitedScenes: metadata.visitedScenes || [],
          choices: metadata.choices || [],
          characterRelationships: metadata.characterRelationships || {},
          flags: metadata.flags || {},
          startedAt: metadata.startedAt ? new Date(metadata.startedAt) : new Date(),
          updatedAt: new Date(),
        }
      } catch {
        await this.createNewState()
      }
    } else {
      await this.createNewState()
    }
  }

  /**
   * 创建新状态
   */
  private async createNewState(): Promise<void> {
    const firstSceneId = this.scenes[0]?.id || 'scene-1'

    this.state = {
      storyId: this.storyId,
      userId: this.userId,
      currentSceneId: firstSceneId,
      visitedScenes: [firstSceneId],
      choices: [],
      characterRelationships: {},
      flags: {},
      startedAt: new Date(),
      updatedAt: new Date(),
    }

    await this.saveState()
  }

  /**
   * 保存状态
   */
  async saveState(): Promise<void> {
    if (!this.state) return

    const participant = await prisma.storyParticipant.findFirst({
      where: { storyId: this.storyId, userId: this.userId },
    })

    const metadata = {
      currentSceneId: this.state.currentSceneId,
      visitedScenes: this.state.visitedScenes,
      choices: this.state.choices,
      characterRelationships: this.state.characterRelationships,
      flags: this.state.flags,
      startedAt: this.state.startedAt,
    }

    // 计算进度
    const progress = Math.round(
      (this.state.visitedScenes.length / this.scenes.length) * 100
    )

    if (participant) {
      await prisma.storyParticipant.update({
        where: { id: participant.id },
        data: {
          progress,
          metadata: JSON.stringify(metadata),
        },
      })
    } else {
      await prisma.storyParticipant.create({
        data: {
          storyId: this.storyId,
          userId: this.userId,
          role: 'player',
          progress,
          status: 'active',
          metadata: JSON.stringify(metadata),
        },
      })
    }
  }

  /**
   * 获取当前场景
   */
  getCurrentScene(): Scene | null {
    if (!this.state) return null
    return this.scenes.find(s => s.id === this.state?.currentSceneId) || null
  }

  /**
   * 获取场景中的角色
   */
  getSceneCharacters(sceneId: string): Character[] {
    const scene = this.scenes.find(s => s.id === sceneId)
    if (!scene || !scene.characters) return []

    return this.characters.filter(c => scene.characters.includes(c.id))
  }

  /**
   * 做出选择
   */
  async makeChoice(choiceId: string): Promise<{
    success: boolean
    nextScene?: Scene
    ending?: StoryEnding
    message?: string
  }> {
    if (!this.state) {
      return { success: false, message: 'Story state not initialized' }
    }

    const currentScene = this.getCurrentScene()
    if (!currentScene) {
      return { success: false, message: 'Current scene not found' }
    }

    // 查找选择
    const choice = currentScene.choices?.find(c => c.id === choiceId)
    if (!choice) {
      return { success: false, message: 'Choice not found' }
    }

    // 记录选择
    this.state.choices.push({
      sceneId: currentScene.id,
      choiceId: choice.id,
      choiceText: choice.text,
      timestamp: new Date(),
      consequence: choice.consequence,
    })

    // 更新角色关系
    if (choice.affectedCharacters) {
      for (const charId of choice.affectedCharacters) {
        this.updateCharacterRelationship(charId, 10)
      }
    }

    // 设置标记
    this.state.flags[`choice_${choiceId}`] = true

    // 检查是否是结局场景
    const nextScene = this.scenes.find(s => s.id === choice.nextSceneId)
    if (!nextScene || !nextScene.choices || nextScene.choices.length === 0) {
      // 到达结局
      this.state.currentSceneId = choice.nextSceneId
      this.state.visitedScenes.push(choice.nextSceneId)
      await this.saveState()

      const ending = await this.determineEnding()
      return { success: true, ending, nextScene }
    }

    // 移动到下一场景
    this.state.currentSceneId = choice.nextSceneId
    if (!this.state.visitedScenes.includes(choice.nextSceneId)) {
      this.state.visitedScenes.push(choice.nextSceneId)
    }
    this.state.updatedAt = new Date()

    await this.saveState()

    return { success: true, nextScene }
  }

  /**
   * 更新角色关系
   */
  updateCharacterRelationship(characterId: string, delta: number): void {
    if (!this.state) return

    const current = this.state.characterRelationships[characterId] || 0
    this.state.characterRelationships[characterId] = Math.max(-100, Math.min(100, current + delta))
  }

  /**
   * 设置标记
   */
  setFlag(key: string, value: boolean | string | number): void {
    if (!this.state) return
    this.state.flags[key] = value
  }

  /**
   * 检查标记
   */
  hasFlag(key: string): boolean {
    if (!this.state) return false
    return key in this.state.flags
  }

  /**
   * 获取标记值
   */
  getFlag(key: string): boolean | string | number | undefined {
    if (!this.state) return undefined
    return this.state.flags[key]
  }

  /**
   * 判定结局
   */
  async determineEnding(): Promise<StoryEnding> {
    if (!this.state) {
      return {
        type: 'neutral',
        title: '故事结束',
        description: '故事画上了句号...',
        score: 50,
        unlockedAchievements: [],
      }
    }

    // 计算分数
    let score = 50

    // 根据选择数量调整
    const majorChoices = this.state.choices.filter(c =>
      c.sceneId === 'scene-1' || c.sceneId === 'scene-4'
    )
    score += majorChoices.length * 5

    // 根据角色关系调整
    const relationshipScores = Object.values(this.state.characterRelationships)
    if (relationshipScores.length > 0) {
      const avgRelationship = relationshipScores.reduce((a, b) => a + b, 0) / relationshipScores.length
      score += Math.round(avgRelationship / 10)
    }

    // 确定结局类型
    let endingType: EndingType = 'neutral'
    let title = '普通结局'
    let description = '故事就这样结束了...'

    if (score >= 80) {
      endingType = 'good'
      title = '好结局'
      description = '你做出了明智的选择，获得了圆满的结局！'
    } else if (score >= 60) {
      endingType = 'neutral'
      title = '普通结局'
      description = '故事走向了平稳的结局，但也许还有其他可能...'
    } else {
      endingType = 'bad'
      title = '坏结局'
      description = '事情的发展出乎意料，结局令人唏嘘...'
    }

    // 检查隐藏结局条件
    if (this.state.visitedScenes.length === this.scenes.length) {
      // 访问了所有场景
      endingType = 'secret'
      title = '隐藏结局'
      description = '你探索了故事的每一个角落，发现了隐藏的真相！'
      score = Math.max(score, 90)
    }

    // 检查真结局条件
    if (this.checkTrueEndingConditions()) {
      endingType = 'true'
      title = '真结局'
      description = '你揭示了故事最深处的秘密，达到了真正的结局！'
      score = 100
    }

    // 解锁成就
    const achievements = await this.unlockAchievements(endingType, score)

    // 更新参与者状态
    await prisma.storyParticipant.updateMany({
      where: { storyId: this.storyId, userId: this.userId },
      data: {
        status: 'completed',
        progress: 100,
      },
    })

    return {
      type: endingType,
      title,
      description,
      score,
      unlockedAchievements: achievements,
    }
  }

  /**
   * 检查真结局条件
   */
  private checkTrueEndingConditions(): boolean {
    if (!this.state) return false

    // 需要满足所有条件：
    // 1. 访问了所有场景
    // 2. 与所有角色建立了良好关系
    // 3. 做出了关键选择

    const allScenesVisited = this.state.visitedScenes.length >= this.scenes.length

    const goodRelationships = Object.values(this.state.characterRelationships)
      .filter(r => r >= 50).length
    const allGoodRelationships = goodRelationships >= this.characters.length - 1

    const hasKeyChoices = this.state.choices.some(c =>
      c.choiceId.includes('truth') || c.choiceId.includes('secret')
    )

    return allScenesVisited && allGoodRelationships && hasKeyChoices
  }

  /**
   * 解锁成就
   */
  private async unlockAchievements(endingType: EndingType, score: number): Promise<string[]> {
    const achievements: string[] = []

    // 结局成就
    if (endingType === 'good') achievements.push('圆满结局')
    if (endingType === 'bad') achievements.push('意想不到')
    if (endingType === 'secret') achievements.push('探索者')
    if (endingType === 'true') achievements.push('真相大白')

    // 分数成就
    if (score >= 90) achievements.push('完美通关')
    if (score === 100) achievements.push('满分大师')

    // 速度成就
    if (this.state) {
      const duration = Date.now() - this.state.startedAt.getTime()
      const minutes = duration / (1000 * 60)
      if (minutes < 5) achievements.push('速通达人')
    }

    // TODO: 保存成就到数据库

    return achievements
  }

  /**
   * 获取故事进度
   */
  getProgress(): number {
    if (!this.state || this.scenes.length === 0) return 0
    return Math.round((this.state.visitedScenes.length / this.scenes.length) * 100)
  }

  /**
   * 获取完整状态
   */
  getState(): StoryState | null {
    return this.state
  }

  /**
   * 获取角色关系统计
   */
  getRelationshipStats(): { character: Character; relationship: number }[] {
    if (!this.state) return []

    return this.characters.map(char => ({
      character: char,
      relationship: this.state!.characterRelationships[char.id] || 0,
    }))
  }
}

/**
 * 创建故事引擎实例
 */
export async function createStoryEngine(storyId: string, userId: string): Promise<StoryEngine> {
  const engine = new StoryEngine(storyId, userId)
  await engine.initialize()
  return engine
}
