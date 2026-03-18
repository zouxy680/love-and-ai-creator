# 动态小说剧场 (Story Theater) - 项目开发报告

> 知乎 × SecondMe 全球 A2A 黑客松参赛项目

---

## 一、项目概述

### 1.1 项目定位
一个 **A2A 互动叙事平台**：
- 1-2 位真人玩家开启一场故事冒险
- 故事中的其他角色由 **SecondMe 平台真实用户的 AI 分身**扮演
- 剧本采用「知乎严选小说」风格：高质量叙事，充满反转与代入感
- 真人玩家负责关键决策，AI 分身根据其真实人格实时生成台词与行动

### 1.2 技术栈
| 技术 | 用途 |
|------|------|
| Next.js 14 | 前端框架 (App Router) |
| Tailwind CSS | 样式系统 |
| Prisma ORM | 数据库操作 |
| PostgreSQL (Vercel) | 生产数据库 |
| SecondMe API | OAuth 认证 + A2A Chat |
| 知乎 Open API | 内容素材来源 |

---

## 二、项目结构

```
src/
├── app/                      # Next.js App Router 页面
│   ├── page.tsx              # 首页
│   ├── layout.tsx            # 全局布局
│   ├── globals.css           # 全局样式
│   ├── login/                # 登录页
│   ├── dashboard/            # 用户仪表盘
│   ├── stories/              # 故事列表
│   ├── story/[id]/           # 故事详情/游戏页
│   ├── discover/             # 发现素材页
│   ├── personality-test/     # 人格测试
│   ├── memories/             # Key Memory 管理
│   ├── achievements/         # 成就系统
│   ├── share/[code]/         # 分享落地页
│   └── api/                  # API 路由
│       ├── auth/             # 认证相关
│       ├── chat/             # 聊天 API
│       ├── stories/          # 故事相关
│       ├── memories/         # 记忆相关
│       ├── social/           # 社交相关
│       └── zhihu/            # 知乎 API 代理
├── lib/                      # 核心业务逻辑
│   ├── prisma.ts             # 数据库客户端
│   ├── secondme.ts           # SecondMe OAuth + API
│   ├── story-engine.ts       # 故事引擎
│   ├── story-processor.ts    # 剧本结构化处理
│   ├── agent-casting.ts      # 人格匹配角色分配
│   ├── zhihu.ts              # 知乎 API 封装
│   ├── social.ts             # 社交裂变系统
│   └── cache.ts              # 缓存工具
└── prisma/
    └── schema.prisma         # 数据库模型定义
```

---

## 三、核心模块详解

### 3.1 认证系统 (Authentication)

#### 文件清单
| 文件 | 功能 |
|------|------|
| `src/app/login/page.tsx` | 登录页面 UI |
| `src/app/api/auth/callback/route.ts` | OAuth 回调处理 |
| `src/app/api/auth/logout/route.ts` | 登出处理 |
| `src/lib/secondme.ts` | SecondMe OAuth 工具函数 |

#### 实现效果
1. **登录流程**：
   - 用户点击「使用 SecondMe 登录」
   - 跳转到 `https://api.second.me/oauth2/authorize`
   - 用户授权后回调到 `/api/auth/callback?code=xxx`
   - 后端用 code 换取 access_token
   - 获取用户信息（姓名、头像、Shades、简介）
   - 保存到数据库，设置登录 cookie

2. **授权范围**：
   ```
   scope: 'openid profile chat note'
   ```
   - `openid` - 基础身份
   - `profile` - 用户分身信息
   - `chat` - A2A 对话能力
   - `note` - Key Memory 读写

---

### 3.2 剧本系统 (Story System)

#### 文件清单
| 文件 | 功能 |
|------|------|
| `src/lib/story-processor.ts` | AI 剧本结构化处理 |
| `src/lib/story-engine.ts` | 故事引擎（场景转换、进度保存、结局判定） |
| `src/app/stories/page.tsx` | 故事列表页 |
| `src/app/story/[id]/page.tsx` | 故事详情页（服务端） |
| `src/app/story/[id]/StoryClient.tsx` | 故事详情页（客户端交互） |
| `src/app/api/stories/generate/route.ts` | 故事生成 API |
| `src/app/api/stories/role/route.ts` | 角色分配 API |

#### 数据结构
```typescript
// 剧本结构
interface StructuredStory {
  title: string
  description: string
  genre: string
  characters: Character[]   // 角色列表
  scenes: Scene[]           // 场景列表
  decisionPoints: DecisionPoint[]  // 决策点
}

// 角色
interface Character {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting' | 'npc'
  description: string
  personality?: string
  motivation?: string
}

// 场景
interface Scene {
  id: string
  title: string
  description: string
  atmosphere?: string
  characters: string[]  // 角色 ID
  choices?: Choice[]    // 玩家选择
}

// 选择
interface Choice {
  id: string
  text: string
  consequence: string
  nextSceneId: string
  affectedCharacters?: string[]
}
```

#### 实现效果
1. **剧本生成**：
   - 从知乎搜索小说相关内容
   - 使用 AI（Claude）或规则引擎结构化为剧本
   - 自动生成 5 个场景：序幕 → 深入/观察 → 转折 → 结局
   - 每个场景包含 2-3 个选择分支

2. **故事引擎**：
   - `getCurrentScene()` - 获取当前场景
   - `makeChoice(choiceId)` - 做出选择，推进剧情
   - `updateCharacterRelationship()` - 更新角色关系值
   - `determineEnding()` - 判定结局类型
   - `saveState()` - 保存进度到数据库

3. **结局类型**：
   | 类型 | 条件 |
   |------|------|
   | 好结局 | 分数 ≥ 80 |
   | 普通结局 | 分数 ≥ 60 |
   | 坏结局 | 分数 < 60 |
   | 隐藏结局 | 访问所有场景 |
   | 真结局 | 全场景 + 好关系 + 关键选择 |

---

### 3.3 Agent Casting 系统（人格匹配）

#### 文件清单
| 文件 | 功能 |
|------|------|
| `src/lib/agent-casting.ts` | 核心匹配算法 |

#### 实现原理
1. **获取用户人格信息**：
   ```typescript
   interface SecondMePersonality {
     name: string           // 用户名称
     shades: string[]       // 兴趣标签（人格特征）
     softMemories: string[] // 软记忆（个人知识库）
   }
   ```

2. **匹配算法**：
   - 基础分 50 分
   - Shades 关键词匹配：每个 +10~15 分
   - 软记忆匹配：每个 +5 分
   - 角色类型偏好调整

3. **Shades 关键词映射**：
   ```typescript
   const shadeKeywords = {
     '外向': ['热情', '开朗', '活泼', '主角', '英雄'],
     '内向': ['沉稳', '内敛', '神秘', '配角'],
     '理性': ['冷静', '聪明', '智慧', '侦探', '反派'],
     '感性': ['温柔', '细腻', '情感', '浪漫'],
     '推理': ['推理', '侦探', '悬疑', '解谜'],
     '爱情': ['爱情', '浪漫', '情侣', '恋人'],
     // ...
   }
   ```

4. **生成角色提示词**：
   - 包含角色身份、故事背景、玩家人格特质
   - 用于指导 AI 分身在故事中的扮演

#### 实现效果
- 用户进入故事时，系统自动根据其 SecondMe Shades 匹配最适合的角色
- 匹配度显示为百分比（0-100%）
- 生成定制化的角色扮演提示词

---

### 3.4 A2A Chat 对话系统

#### 文件清单
| 文件 | 功能 |
|------|------|
| `src/lib/secondme.ts` | `sendChatMessage()` 函数 |
| `src/app/api/chat/route.ts` | 对话 API |

#### 实现流程
1. 用户发送消息
2. 构建系统提示词（包含角色、场景、上下文）
3. 调用 SecondMe A2A Chat API
4. 保存消息到数据库
5. 返回 AI 回复

#### 备用方案
当 SecondMe API 不可用时，使用基于角色类型的预设回复：
```typescript
const roleResponses = {
  'protagonist': [...],  // 主角回复
  'antagonist': [...],   // 反派回复
  'supporting': [...],   // 配角回复
  'npc': [...],          // NPC 回复
}
```

---

### 3.5 知乎集成

#### 文件清单
| 文件 | 功能 |
|------|------|
| `src/lib/zhihu.ts` | 知乎 API 封装（带签名认证） |
| `src/app/api/zhihu/` | 知乎 API 代理路由 |
| `src/app/discover/` | 发现素材页面 |

#### API 接口
| 接口 | 功能 |
|------|------|
| `/openapi/billboard/list` | 获取热榜 |
| `/openapi/search/global` | 全网搜索 |
| `/openapi/publish/pin` | 发圈子帖文 |

#### 认证方式
HMAC-SHA256 签名：
```
签名字符串: app_key:{key}|ts:{timestamp}|logid:{logId}|extra_info:{extra}
签名: HMAC-SHA256(secret, signStr) → Base64
```

#### 缓存策略
- 永久缓存（内存）
- 相同 query 不重复请求
- API 失败时使用 Mock 数据

---

### 3.6 社交裂变系统

#### 文件清单
| 文件 | 功能 |
|------|------|
| `src/lib/social.ts` | 分享、邀请、成就核心逻辑 |
| `src/app/api/social/` | 社交相关 API |
| `src/app/share/[code]/page.tsx` | 分享落地页 |

#### 功能模块

**1. 分享系统**
```typescript
// 生成分享链接
generateShareLink(storyId, userId, baseUrl)
// → { link: "https://app.com/share/abc123", code: "abc123" }
```

**2. 邀请系统**
```typescript
// 创建邀请
createInvitation(storyId, inviterId)
// → { code: "INVITE-xxxx-YYYY-1234", expiresAt: Date }

// 接受邀请
acceptInvitation(code, inviteeId)
// → { success: true, storyId: "..." }
```

**3. 成就系统**
| 成就 ID | 名称 | 条件 | 稀有度 |
|---------|------|------|--------|
| first_story | 初入江湖 | 完成第一个故事 | common |
| story_master | 故事大师 | 完成10个故事 | rare |
| good_ending | 圆满结局 | 获得好结局 | common |
| true_ending | 真相大白 | 获得真结局 | epic |
| invitation_master | 邀请大师 | 成功邀请10位好友 | epic |

---

### 3.7 人格测试 & Key Memory

#### 文件清单
| 文件 | 功能 |
|------|------|
| `src/app/personality-test/` | 人格测试页面 |
| `src/app/memories/` | Key Memory 管理 |
| `src/app/api/memories/` | 记忆 CRUD API |

#### 实现效果
- 人格测试：冷启动流程，收集用户性格偏好
- 结果保存为 Key Memory
- 可在「我的记忆」页面管理
- 用于 Agent Casting 的人格匹配

---

## 四、数据库模型

### 4.1 ER 图

```
┌─────────────┐       ┌──────────────────────┐       ┌─────────────┐
│    User     │       │   StoryParticipant   │       │    Story    │
├─────────────┤       ├──────────────────────┤       ├─────────────┤
│ id          │───┐   │ id                   │   ┌───│ id          │
│ secondMeId  │   │   │ userId               │───┘   │ title       │
│ name        │   └──►│ storyId              │◄──────│ description │
│ avatar      │       │ role                 │       │ content     │
│ shades      │       │ progress             │       │ genre       │
│ accessToken │       │ metadata             │       │ isActive    │
└─────────────┘       └──────────────────────┘       └─────────────┘
       │                                                    │
       │              ┌─────────────────┐                   │
       │              │   ChatMessage   │                   │
       │              ├─────────────────┤                   │
       └─────────────►│ id              │◄──────────────────┘
                      │ storyId         │
                      │ senderId        │
                      │ senderType      │
                      │ content         │
                      └─────────────────┘

┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Memory    │       │   StoryShare    │       │ StoryInvitation │
├─────────────┤       ├─────────────────┤       ├─────────────────┤
│ userId      │       │ storyId         │       │ storyId         │
│ key         │       │ userId          │       │ inviterId       │
│ value       │       │ platform        │       │ inviteeId       │
│ category    │       │ code            │       │ code            │
└─────────────┘       │ clicks / joins  │       │ status          │
                      └─────────────────┘       └─────────────────┘

┌─────────────────┐
│   Achievement   │
├─────────────────┤
│ userId          │
│ achievementId   │
│ name            │
│ rarity          │
└─────────────────┘
```

### 4.2 模型详情

| 模型 | 说明 | 主要字段 |
|------|------|----------|
| User | 用户表 | secondMeId, shades(JSON), accessToken |
| Story | 剧本表 | title, genre, content(JSON) |
| StoryParticipant | 参与记录 | progress, metadata(JSON), status |
| ChatMessage | 聊天消息 | senderType, content, metadata |
| Memory | Key Memory | key, value, category |
| StoryShare | 分享记录 | code, clicks, joins |
| StoryInvitation | 邀请记录 | code, status, expiresAt |
| Achievement | 成就 | achievementId, rarity |

---

## 五、页面路由

| 路由 | 页面 | 权限 | 说明 |
|------|------|------|------|
| `/` | 首页 | 公开 | 项目介绍、特性展示 |
| `/login` | 登录页 | 公开 | SecondMe OAuth 登录 |
| `/dashboard` | 仪表盘 | 登录 | 用户信息、快捷入口、故事列表 |
| `/stories` | 故事列表 | 公开 | 浏览所有可用故事 |
| `/story/[id]` | 故事详情 | 登录 | 游戏主界面 |
| `/discover` | 发现素材 | 登录 | 知乎热榜、搜索素材 |
| `/personality-test` | 人格测试 | 登录 | 冷启动人格收集 |
| `/memories` | 我的记忆 | 登录 | Key Memory 管理 |
| `/achievements` | 成就 | 登录 | 查看已解锁成就 |
| `/share/[code]` | 分享页 | 公开 | 分享落地页、点击统计 |

---

## 六、API 接口

### 6.1 认证相关
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/callback` | OAuth 回调 |
| POST | `/api/auth/logout` | 登出 |

### 6.2 故事相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/stories/generate` | 生成新故事 |
| GET/POST | `/api/stories/role` | 角色分配 |

### 6.3 对话相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat` | 发送消息、获取 AI 回复 |

### 6.4 记忆相关
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/memories` | 获取用户记忆 |
| POST | `/api/memories` | 保存记忆 |
| DELETE | `/api/memories/[id]` | 删除记忆 |

### 6.5 社交相关
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/social/share` | 创建分享 |
| POST | `/api/social/invite` | 创建邀请 |
| GET | `/api/social/achievements` | 获取成就 |

### 6.6 知乎代理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/zhihu/hot` | 获取热榜 |
| GET | `/api/zhihu/search` | 搜索内容 |
| POST | `/api/zhihu/pin` | 发圈子帖文 |

---

## 七、环境变量配置

```bash
# SecondMe OAuth
SECONDME_CLIENT_ID=your_client_id
SECONDME_CLIENT_SECRET=your_client_secret
SECONDME_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback

# SecondMe API
SECONDME_API_BASE_URL=https://api.second.me
SECONDME_OAUTH_AUTHORIZE_URL=https://api.second.me/oauth2/authorize
SECONDME_OAUTH_TOKEN_URL=https://api.second.me/oauth2/token
SECONDME_USERINFO_URL=https://api.second.me/v1/userinfo
SECONDME_CHAT_URL=https://api.second.me/v1/chat
SECONDME_NOTE_URL=https://api.second.me/v1/note

# Database
DATABASE_URL="postgres://..."
DIRECT_DATABASE_URL="postgres://..."

# App Config
NEXT_PUBLIC_APP_NAME=动态小说剧场
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Zhihu API (可选)
ZHIHU_APP_KEY=your_app_key
ZHIHU_APP_SECRET=your_app_secret
ZHIHU_API_BASE_URL=https://openapi.zhihu.com

# AI (可选，用于剧本结构化)
ANTHROPIC_API_KEY=your_api_key
```

---

## 八、部署说明

### 8.1 GitHub 仓库
已推送至：https://github.com/zouxy680/love-and-ai-creator

### 8.2 Vercel 部署步骤
1. 访问 https://vercel.com/new
2. 导入 GitHub 仓库 `zouxy680/love-and-ai-creator`
3. 配置环境变量（见第七节）
4. 创建 Vercel Postgres 数据库
5. 点击 Deploy

### 8.3 部署后配置
1. 在 Vercel Dashboard 设置所有环境变量
2. 运行数据库迁移：`npx prisma db push`
3. 在 SecondMe 开发者后台配置回调地址

---

## 九、开发完成度

| 模块 | 状态 | 说明 |
|------|------|------|
| ✅ SecondMe OAuth | 完成 | 登录/登出/Token 管理 |
| ✅ 用户仪表盘 | 完成 | 个人信息、快捷入口 |
| ✅ 故事列表 | 完成 | 浏览所有故事 |
| ✅ 故事详情页 | 完成 | 游戏界面、选择交互 |
| ✅ 故事引擎 | 完成 | 场景转换、进度保存、结局判定 |
| ✅ Agent Casting | 完成 | 人格匹配、角色分配 |
| ✅ A2A Chat | 完成 | SecondMe API + 备用方案 |
| ✅ 剧本结构化 | 完成 | AI + 规则引擎 |
| ✅ 知乎集成 | 完成 | 热榜、搜索、发帖（带缓存） |
| ✅ 社交裂变 | 完成 | 分享、邀请、成就 |
| ✅ 人格测试 | 完成 | 冷启动流程 |
| ✅ Key Memory | 完成 | CRUD 管理 |
| ✅ 数据库模型 | 完成 | 7 个核心表 |
| ⚠️ 前端交互 | 80% | 核心功能完成，细节待优化 |

---

## 十、后续优化建议

1. **前端优化**
   - 添加 Loading 状态
   - 优化移动端适配
   - 添加动画效果

2. **功能增强**
   - 多人协作故事（2+ 玩家）
   - 故事编辑器
   - 自定义剧本上传

3. **性能优化**
   - 数据库索引优化
   - API 响应缓存
   - 图片 CDN 加速

4. **安全加固**
   - Token 自动刷新
   - CSRF 保护
   - 敏感数据加密

---

*报告生成时间：2026-03-18*
