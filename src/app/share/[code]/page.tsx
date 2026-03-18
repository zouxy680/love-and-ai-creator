import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface SharePageProps {
  params: Promise<{ code: string }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { code } = await params

  // 查找分享记录
  const share = await prisma.storyShare.findUnique({
    where: { code },
  })

  if (!share) {
    notFound()
  }

  // 获取故事信息
  const story = await prisma.story.findUnique({
    where: { id: share.storyId },
  })

  if (!story) {
    notFound()
  }

  // 记录点击
  await prisma.storyShare.update({
    where: { id: share.id },
    data: { clicks: { increment: 1 } },
  })

  const metadata = share.metadata ? JSON.parse(share.metadata as string) : {}

  // 结局类型映射
  const endingLabels: Record<string, { emoji: string; label: string }> = {
    good: { emoji: '✨', label: '圆满结局' },
    neutral: { emoji: '🌙', label: '普通结局' },
    bad: { emoji: '💔', label: '遗憾结局' },
    secret: { emoji: '🔮', label: '隐藏结局' },
    true: { emoji: '🌟', label: '真结局' },
  }

  const ending = endingLabels[metadata.endingType] || endingLabels.neutral

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* 头部 */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-slate-900">
            动态小说剧场
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
          >
            开始冒险
          </Link>
        </div>
      </header>

      {/* 分享内容卡片 */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          {/* 故事封面 */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 px-8 py-12 text-center">
            <div className="text-6xl mb-4">{ending.emoji}</div>
            <h1 className="text-2xl font-bold text-white mb-2">{story.title}</h1>
            <p className="text-primary-100">{story.genre}</p>
          </div>

          {/* 故事内容 */}
          <div className="p-8">
            {/* 角色信息 */}
            {metadata.characterName && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-2xl">
                    🎭
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">扮演角色</div>
                    <div className="font-semibold text-slate-900">{metadata.characterName}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 结局信息 */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-full">
                <span className="text-lg">{ending.emoji}</span>
                <span className="font-medium">{ending.label}</span>
              </div>
            </div>

            {/* 故事简介 */}
            <p className="text-slate-600 leading-relaxed mb-8">
              {story.description}
            </p>

            {/* CTA */}
            <div className="text-center">
              <p className="text-slate-500 mb-4">
                我刚刚在「动态小说剧场」完成了一场精彩的故事冒险！
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium"
              >
                开始你的冒险
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* 平台介绍 */}
        <div className="mt-12 text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            什么是「动态小说剧场」？
          </h2>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            一个 A2A 互动叙事平台。你的 AI 分身将在故事中扮演角色，
            用真实的性格做出选择，创造独一无二的故事体验。
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span>📖</span>
              <span>知乎严选风格剧本</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🎭</span>
              <span>AI 分身扮演角色</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span>多结局体验</span>
            </div>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="py-8 px-6 bg-slate-900 text-slate-400 text-center text-sm">
        © 2024 动态小说剧场 | 知乎 × SecondMe 全球 A2A 黑客松参赛项目
      </footer>
    </div>
  )
}
