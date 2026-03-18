// AI 剧本结构化处理
// 将知乎文章转换为结构化的剧本格式

// 剧本结构
export interface StructuredStory {
  title: string
  description: string
  genre: string
  characters: Character[]
  scenes: Scene[]
  decisionPoints: DecisionPoint[]
}

// 角色定义
export interface Character {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'npc'
  description: string
  personality?: string
  motivation?: string
}

// 场景定义
export interface Scene {
  id: string
  title: string
  description: string
  atmosphere?: string
  characters: string[] // 角色 ID 列表
  choices?: Choice[]
}

// 选择定义
export interface Choice {
  id: string
  text: string
  consequence: string // 选择后果描述
  nextSceneId: string
  affectedCharacters?: string[]
}

// 决策点
export interface DecisionPoint {
  sceneId: string
  type: 'major' | 'minor'
  description: string
  impact: string
}

/**
 * 使用 AI 将知乎文章结构化为剧本
 * MVP 版本：只提取角色和简单剧情背景
 */
export async function structureStoryFromArticle(
  article: {
    title: string
    excerpt: string
    content?: string
  },
  genre: string = '悬疑'
): Promise<StructuredStory> {
  const fullContent = article.content || article.excerpt

  // 在 MVP 阶段，我们使用简单的规则提取
  // 生产环境应该调用 AI API（如 Claude）进行结构化

  // 提取角色（简化版：从文本中识别）
  const characters = extractCharacters(fullContent, genre)

  // 生成场景（简化版：基于类型生成模板场景）
  const scenes = generateScenes(article, characters, genre)

  // 生成决策点
  const decisionPoints = generateDecisionPoints(scenes)

  return {
    title: article.title,
    description: article.excerpt,
    genre,
    characters,
    scenes,
    decisionPoints,
  }
}

/**
 * 提取角色（简化版）
 */
function extractCharacters(content: string, genre: string): Character[] {
  // MVP：生成默认角色模板
  const baseCharacters: Character[] = [
    {
      id: 'char-1',
      name: '主角',
      role: 'protagonist',
      description: '玩家扮演的角色，一个普通却不平凡的人',
      personality: '性格由玩家的 AI 分身决定',
      motivation: '寻找真相，解开谜团',
    },
  ]

  // 根据类型添加不同角色
  switch (genre) {
    case '悬疑':
      baseCharacters.push(
        {
          id: 'char-2',
          name: '神秘人',
          role: 'supporting',
          description: '一个身份不明的人物，似乎知道一些秘密',
          personality: '神秘、深沉、难以捉摸',
          motivation: '未知',
        },
        {
          id: 'char-3',
          name: '知情者',
          role: 'supporting',
          description: '掌握关键信息的人',
          personality: '谨慎、有所保留',
          motivation: '保护某个秘密',
        }
      )
      break

    case '言情':
      baseCharacters.push(
        {
          id: 'char-2',
          name: '命中注定的人',
          role: 'supporting',
          description: '那个让你心动的人',
          personality: '温柔、神秘、有故事',
          motivation: '寻找一份真挚的感情',
        }
      )
      break

    case '科幻':
      baseCharacters.push(
        {
          id: 'char-2',
          name: 'AI 助手',
          role: 'supporting',
          description: '人工智能助手，拥有超凡的计算能力',
          personality: '理性、忠诚、偶尔展现出人性',
          motivation: '协助主角完成任务',
        },
        {
          id: 'char-3',
          name: '未知生命体',
          role: 'antagonist',
          description: '来自深空的神秘存在',
          personality: '不可理解、超越人类认知',
          motivation: '未知',
        }
      )
      break

    default:
      baseCharacters.push(
        {
          id: 'char-2',
          name: '神秘人物',
          role: 'supporting',
          description: '故事中的关键人物',
          personality: '待定',
          motivation: '待定',
        }
      )
  }

  return baseCharacters
}

/**
 * 生成场景（简化版）
 */
function generateScenes(
  article: { title: string; excerpt: string; content?: string },
  characters: Character[],
  genre: string
): Scene[] {
  const protagonist = characters.find((c) => c.role === 'protagonist')!

  // 基于文章内容生成开场场景
  const scenes: Scene[] = [
    {
      id: 'scene-1',
      title: '序幕',
      description: `故事从一个平凡的日子开始...\n\n${article.excerpt}`,
      atmosphere: getAtmosphere(genre),
      characters: [protagonist.id],
      choices: [
        {
          id: 'choice-1-1',
          text: '深入探索',
          consequence: '你决定追查这个线索',
          nextSceneId: 'scene-2',
        },
        {
          id: 'choice-1-2',
          text: '暂时观望',
          consequence: '你决定先收集更多信息',
          nextSceneId: 'scene-3',
        },
      ],
    },
    {
      id: 'scene-2',
      title: '深入',
      description: '你选择了深入探索，逐渐发现了不寻常的迹象...',
      atmosphere: getAtmosphere(genre),
      characters: characters.slice(0, 2).map((c) => c.id),
      choices: [
        {
          id: 'choice-2-1',
          text: '继续前进',
          consequence: '你即将面对真相',
          nextSceneId: 'scene-4',
        },
      ],
    },
    {
      id: 'scene-3',
      title: '观察',
      description: '你选择暂时观望，在暗中观察着一切...',
      atmosphere: getAtmosphere(genre),
      characters: characters.slice(0, 2).map((c) => c.id),
      choices: [
        {
          id: 'choice-3-1',
          text: '采取行动',
          consequence: '是时候做出决定了',
          nextSceneId: 'scene-4',
        },
      ],
    },
    {
      id: 'scene-4',
      title: '转折',
      description: '故事迎来了关键的转折点，真相即将揭晓...',
      atmosphere: getAtmosphere(genre),
      characters: characters.map((c) => c.id),
      choices: [
        {
          id: 'choice-4-1',
          text: '面对真相',
          consequence: '你选择了直面一切',
          nextSceneId: 'scene-5',
        },
        {
          id: 'choice-4-2',
          text: '保持距离',
          consequence: '你选择保持距离',
          nextSceneId: 'scene-5',
        },
      ],
    },
    {
      id: 'scene-5',
      title: '结局',
      description: '故事走向了尾声，但这或许只是另一个故事的开始...',
      atmosphere: '平静中带着一丝余韵',
      characters: characters.map((c) => c.id),
      choices: [],
    },
  ]

  return scenes
}

/**
 * 获取场景氛围
 */
function getAtmosphere(genre: string): string {
  const atmospheres: Record<string, string> = {
    悬疑: '紧张、神秘、充满未知的气息',
    言情: '温馨、浪漫、心跳加速的氛围',
    科幻: '科技感、未知、充满想象的空间',
    奇幻: '魔幻、神秘、超越现实的境界',
  }

  return atmospheres[genre] || '神秘而引人入胜'
}

/**
 * 生成决策点
 */
function generateDecisionPoints(scenes: Scene[]): DecisionPoint[] {
  const decisionPoints: DecisionPoint[] = []

  scenes.forEach((scene) => {
    if (scene.choices && scene.choices.length > 0) {
      decisionPoints.push({
        sceneId: scene.id,
        type: scene.id === 'scene-1' || scene.id === 'scene-4' ? 'major' : 'minor',
        description: `在"${scene.title}"中需要做出选择`,
        impact: scene.choices.map((c) => c.consequence).join(' 或 '),
      })
    }
  })

  return decisionPoints
}

/**
 * 使用 AI（Claude）进行剧本结构化
 * 这是一个可选的高级版本，需要配置 ANTHROPIC_API_KEY
 */
export async function structureStoryWithAI(
  article: {
    title: string
    excerpt: string
    content?: string
  },
  genre: string = '悬疑'
): Promise<StructuredStory> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    // 如果没有 API Key，使用简化版
    console.log('[StoryProcessor] No ANTHROPIC_API_KEY, using simplified processing')
    return structureStoryFromArticle(article, genre)
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `请将以下知乎文章内容结构化为一个${genre}类型的互动小说剧本。

文章标题：${article.title}
文章摘要：${article.excerpt}
${article.content ? `文章内容：${article.content.substring(0, 2000)}` : ''}

请输出以下 JSON 格式（不要添加任何其他文字）：
{
  "characters": [
    {"id": "char-1", "name": "角色名", "role": "protagonist/antagonist/supporting", "description": "描述", "personality": "性格", "motivation": "动机"}
  ],
  "scenes": [
    {"id": "scene-1", "title": "场景标题", "description": "场景描述", "choices": [{"text": "选项文字", "nextSceneId": "scene-2"}]}
  ],
  "decisionPoints": [
    {"sceneId": "scene-1", "type": "major/minor", "description": "决策描述", "impact": "影响"}
  ]
}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.content[0]?.text || ''

    // 解析 AI 返回的 JSON
    const parsed = JSON.parse(content)

    return {
      title: article.title,
      description: article.excerpt,
      genre,
      characters: parsed.characters || [],
      scenes: parsed.scenes || [],
      decisionPoints: parsed.decisionPoints || [],
    }
  } catch (error) {
    console.error('[StoryProcessor] AI processing failed, falling back to simplified:', error)
    return structureStoryFromArticle(article, genre)
  }
}
