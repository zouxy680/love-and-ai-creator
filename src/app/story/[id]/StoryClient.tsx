'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Send, ArrowLeft, User, Bot, Crown, Sparkles, Share2, Link2, Users, Trophy, X, Check, Copy } from 'lucide-react'

interface Story {
  id: string
  title: string
  description: string
  genre: string
}

interface StoryContent {
  scenes: Array<{
    id: string
    title: string
    content: string
    choices?: Array<{ text: string; nextScene: string }>
  }>
}

interface Participant {
  id: string
  progress: number
  status: string
}

interface User {
  id: string
  name: string | null
  avatar: string | null
  accessToken: string
}

interface Message {
  id: string
  senderId: string
  senderType: string
  content: string
  createdAt: Date
}

interface RoleAssignment {
  characterId: string
  characterName: string
  characterRole: string
  characterDescription: string
  personalityMatch: number
  matchedShades?: string[]
  customPrompt?: string
}

interface StoryClientProps {
  story: Story
  storyContent: StoryContent
  participant: Participant
  user: User
  messages: Message[]
  roleAssignment?: RoleAssignment | null
}

export default function StoryClient({
  story,
  storyContent,
  participant,
  user,
  messages: initialMessages,
  roleAssignment,
}: StoryClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEndingModal, setShowEndingModal] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [ending, setEnding] = useState<{ type: string; title: string; description: string; score: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scenes = storyContent.scenes || []
  const currentScene = scenes[currentSceneIndex]
  const isLastScene = currentSceneIndex === scenes.length - 1

  // 角色类型中文标签
  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      protagonist: '主角',
      antagonist: '反派',
      supporting: '配角',
      npc: 'NPC',
    }
    return labels[role] || role
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 检查是否到达结局
  useEffect(() => {
    if (isLastScene && currentScene && !currentScene.choices?.length) {
      // 到达结局
      handleStoryEnd()
    }
  }, [currentSceneIndex, isLastScene])

  const handleStoryEnd = async () => {
    // 这里可以调用 API 获取结局信息
    setEnding({
      type: 'good',
      title: '圆满结局',
      description: '你做出了明智的选择，故事迎来了美好的结局！',
      score: 85,
    })
    setShowEndingModal(true)
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    setIsLoading(true)
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderType: 'user',
      content,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          message: content,
          sceneContext: currentScene,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      const agentMessage: Message = {
        id: data.messageId || `agent-${Date.now()}`,
        senderId: 'agent',
        senderType: 'agent',
        content: data.response,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, agentMessage])
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleChoice = (choice: { text: string; nextScene: string }) => {
    sendMessage(choice.text)
    const nextIndex = scenes.findIndex((s) => s.id === choice.nextScene)
    if (nextIndex !== -1) {
      setCurrentSceneIndex(nextIndex)
    }
  }

  // 分享功能 - 生成分享链接
  const handleShare = async () => {
    try {
      const response = await fetch('/api/social/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          characterName: roleAssignment?.characterName,
          endingType: ending?.type || 'neutral',
        }),
      })

      const data = await response.json()

      if (data.success) {
        setShareLink(data.url || '')
      }
    } catch (error) {
      console.error('Share error:', error)
    }
  }

  // 邀请功能
  const handleInvite = async () => {
    try {
      const response = await fetch('/api/social/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          action: 'create',
        }),
      })

      const data = await response.json()

      if (data.success) {
        setInviteCode(data.invitation.link)
      }
    } catch (error) {
      console.error('Invite error:', error)
    }
  }

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* 头部 */}
      <header className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/stories"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-slate-900">{story.title}</h1>
            <p className="text-sm text-slate-500">
              进度: {participant.progress}%
            </p>
          </div>
          <span className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm">
            {story.genre}
          </span>

          {/* 社交按钮 */}
          <div className="flex gap-2">
            <button
              onClick={() => { handleInvite(); setShowInviteModal(true); }}
              className="p-2 text-slate-400 hover:text-primary-500 transition-colors"
              title="邀请好友"
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => { handleShare(); setShowShareModal(true); }}
              className="p-2 text-slate-400 hover:text-primary-500 transition-colors"
              title="分享"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 🎭 角色信息 */}
        {roleAssignment && (
          <div className="mt-3 bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              {roleAssignment.characterRole === 'protagonist' ? (
                <Crown className="w-4 h-4 text-primary-500" />
              ) : (
                <Sparkles className="w-4 h-4 text-accent-500" />
              )}
              <span className="text-sm font-medium text-slate-700">
                你的角色：<span className="text-primary-600">{roleAssignment.characterName}</span>
              </span>
              <span className="text-xs text-slate-500">
                ({getRoleLabel(roleAssignment.characterRole)})
              </span>
              <span className="ml-auto text-xs text-slate-400">
                匹配度 {roleAssignment.personalityMatch}%
              </span>
            </div>
            {roleAssignment.matchedShades && roleAssignment.matchedShades.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {roleAssignment.matchedShades.map((shade, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-white/50 text-slate-600 rounded text-xs"
                  >
                    {shade}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* 场景描述 */}
      {currentScene && (
        <div className="bg-white border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900 mb-2">
            {currentScene.title}
          </h2>
          <p className="text-slate-600">{currentScene.content}</p>
        </div>
      )}

      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.senderType === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.senderType === 'user'
                  ? 'bg-primary-100 text-primary-500'
                  : 'bg-accent-100 text-accent-500'
              }`}
            >
              {message.senderType === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                message.senderType === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-slate-100 text-slate-700'
              }`}
            >
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-500 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3">
              <p className="text-slate-400">正在思考...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 选择按钮 */}
      {currentScene?.choices && currentScene.choices.length > 0 && (
        <div className="bg-white border-t border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-500 mb-3">做出你的选择:</p>
          <div className="flex flex-wrap gap-2">
            {currentScene.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleChoice(choice)}
                className="px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border-t border-slate-100 px-6 py-4"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的行动或对话..."
            className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* 分享弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">分享故事</h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 mb-4">
              复制链接分享给好友，他们可以看到你的故事结局并开始自己的冒险！
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600"
                placeholder="正在生成链接..."
              />
              <button
                onClick={() => shareLink && copyToClipboard(shareLink)}
                disabled={!shareLink}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {copied && (
              <p className="text-sm text-green-600 mt-2">链接已复制到剪贴板！</p>
            )}
          </div>
        </div>
      )}

      {/* 邀请弹窗 */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">邀请好友</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 mb-4">
              邀请好友加入这个故事，一起冒险！好友通过链接加入后，你们可以共同推进剧情。
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={inviteCode}
                readOnly
                className="flex-1 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600"
                placeholder="点击生成邀请链接..."
              />
              <button
                onClick={() => inviteCode && copyToClipboard(inviteCode)}
                className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={handleInvite}
              className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              生成新的邀请链接
            </button>
          </div>
        </div>
      )}

      {/* 结局弹窗 */}
      {showEndingModal && ending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 text-center">
            <div className="text-6xl mb-4">
              {ending.type === 'good' ? '✨' : ending.type === 'secret' ? '🔮' : ending.type === 'true' ? '🌟' : '📖'}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{ending.title}</h3>
            <p className="text-slate-600 mb-4">{ending.description}</p>
            <div className="bg-slate-100 rounded-lg p-3 mb-4">
              <span className="text-sm text-slate-500">最终得分</span>
              <div className="text-3xl font-bold text-primary-500">{ending.score}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowEndingModal(false); handleShare(); setShowShareModal(true); }}
                className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                分享结局
              </button>
              <Link
                href="/stories"
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-center"
              >
                返回故事列表
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
