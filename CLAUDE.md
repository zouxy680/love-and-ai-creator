# 动态小说剧场 (Story Theater)

> 知乎 × SecondMe 全球 A2A 黑客松参赛项目

## 项目概述

一个 A2A 互动叙事平台：
- 1-2 位真人玩家开启一场故事冒险
- 故事中的其他角色，由来自 SecondMe 平台真实用户的 AI 分身扮演
- 剧本采用「知乎严选小说」风格：高质量叙事，充满反转与代入感
- 真人玩家负责关键决策，AI 分身根据其真实人格实时生成台词与行动

## 技术栈

- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS
- **数据库**: SQLite + Prisma ORM
- **认证**: SecondMe OAuth2

## SecondMe 集成

### 已配置的功能模块
- ✅ **auth** - OAuth2 登录认证
- ✅ **profile** - 获取用户分身信息（姓名、头像、Shades、简介）
- ✅ **chat** - A2A Chat API（让 AI 分身扮演故事角色）
- ✅ **note** - Key Memory 读写

### API 端点
| 功能 | 端点 |
|------|------|
| OAuth 授权 | `https://api.second.me/oauth2/authorize` |
| Token 获取 | `https://api.second.me/oauth2/token` |
| 用户信息 | `https://api.second.me/v1/userinfo` |
| A2A Chat | `https://api.second.me/v1/chat` |
| Key Memory | `https://api.second.me/v1/note` |

## 系统模块

1. **人格测试入口** - 冷启动核心
2. **SecondMe 接入** - 分身系统
3. **剧本系统** - 知乎内容结构化
4. **Agent Casting** - 人格 → 角色映射
5. **Story Engine** - 剧情调度
6. **裂变 & 社交系统** - 增长引擎

## 开发命令

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push

# 启动开发服务器
npm run dev
```

## 设计原则

- **亮色主题**: 仅使用浅色主题
- **简约优雅**: 极简设计，减少视觉噪音
- **中文界面**: 所有用户可见文字使用中文
- **稳定优先**: 避免复杂动画，仅用简单过渡效果

## 配置文件

敏感配置存储在 `.secondme/state.json`，已添加到 `.gitignore`
